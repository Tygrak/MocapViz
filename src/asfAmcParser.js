import * as Core from './mocapCore.js';
import * as Model from './model.js';
import * as THREE from './lib/three.module.js';

/**
 * Loads a sequence from a pair of files in the format .asf and .amc. 
 * Invokes callback with an object containing the information parsed from the two files. 
 * @param {Blob} asfFile - The .asf file
 * @param {Blob} amcFile - The .amc file
 * @param {function(result)} callback - One parametric callback. The object contains the sequence and skeleton model generated from the files.
 */
function loadAsfAmcFile(asfFile, amcFile, callback) {
    let asfStructure, skeletonModel, frames, data, seq;
    loadFile(asfFile, 
        (textResult) => {
            asfStructure = loadAsfString(textResult);
            skeletonModel = createSkeletonModel(asfStructure);
            loadFile(amcFile, 
                (textResult) => {
                    frames = loadAmcString(textResult, asfStructure);
                    data = toInternalFormat(frames);
                    seq = Core.loadDataFromString(data)[0];
                    callback({asfStructure: asfStructure, skeletonModel: skeletonModel, amcFrames: frames, data: data, sequence: seq});
                }
            );
        }
    );
}

function loadFile(file, callback) {
    if (file == null) {
        throw "No data file provided.";
    }
    let reader = new FileReader();
    reader.onload = function (textResult) {
        callback(textResult.target.result);
    }
    reader.onerror = function (e) {
        throw "Loading the data file failed, most likely because of how big the file is.";
    }
    reader.readAsText(file, "UTF-8");
}

/**
 * Loads data from an ASF/AMC string pair. Returns an object containing the loaded sequence and a skeletonModel.
 * @param {string} asfString - String containing the .asf file
 * @param {string} amcString - String containing the .amc file
 */
function loadAsfAmcString(asfString, amcString) {
    let asfStructure = loadAsfString(asfString);
    let skeletonModel = createSkeletonModel(asfStructure);
    let frames = loadAmcString(amcString, asfStructure);
    let data = toInternalFormat(frames);
    let seq = Core.loadDataFromString(data)[0];
    return {asfStructure: asfStructure, skeletonModel: skeletonModel, amcFrames: frames, data: data, sequence: seq};
}

function loadAsfString(asfString) {
    let result = {};
    let split = asfString.split(":");
    for (let i = 0; i < split.length; i++) {
        if (split[i][0] == "#") {
            continue;
        }
        loadAsfKeyword(split[i], result);
    }
    return result;
}

function loadAsfKeyword(keyword, result) {
    let type = keyword.match(/\w+/)[0];
    if (type == "version" || type == "name" || type == "documentation") {
        let value = keyword.match(/\w+([^]+)/)[1];
        result[type] = value;
    } else if (type == "units") {
        loadAsfUnits(keyword, result);
    } else if (type == "root") {
        loadAsfRoot(keyword, result);
    } else if (type == "bonedata") {
        loadAsfBoneData(keyword, result);
    } else if (type == "hierarchy") {
        loadAsfHierarchy(keyword, result);
    }
}

function loadAsfUnits(keyword, result) {
    let match = keyword.match(/mass (\S+)/);
    if (match != null) {
        result.mass = parseFloat(match[1]);
    }
    match = keyword.match(/length (\S+)/);
    if (match != null) {
        result.length = parseFloat(match[1]);
    }
    match = keyword.match(/angle (deg|rad)/);
    if (match != null) {
        result.angle = match[1];
    } else {
        result.angle = "deg"
    }
}

function loadAsfRoot(keyword, result) {
    result.root = {};
    let match = keyword.match(/order (.+)/);
    result.root.order = match[1];
    match = keyword.match(/axis (.+)/);
    result.root.axis = match[1];
    match = keyword.match(/position (\S+) (\S+) (\S+)/);
    result.root.position = new THREE.Vector3(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
    match = keyword.match(/orientation (\S+) (\S+) (\S+)/);
    result.root.orientation = new THREE.Vector3(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
}

function loadAsfBoneData(keyword, result) {
    result.bonedata = {};
    let bones = keyword.split(/\send\s/);
    for (let i = 0; i < bones.length; i++) {
        let bone = {};
        let match = bones[i].match(/id (\d+)/);
        if (match == null) {
            continue;
        }
        bone.id = parseInt(match[1]);
        match = bones[i].match(/name (.+)/);
        bone.name = match[1];
        match = bones[i].match(/direction (\S+) (\S+) (\S+)/);
        bone.direction = new THREE.Vector3(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
        match = bones[i].match(/length (\S+)/);
        bone.length = parseFloat(match[1]);
        match = bones[i].match(/axis (\S+) (\S+) (\S+)/); //todo: add support for non XYZ
        bone.axis = new THREE.Vector3(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])); 
        match = bones[i].match(/dof (.+)/);
        if (match != null) {
            bone.dof = match[1].split(" ");
        } else {
            bone.dof = [];
        }
        bone.axisQuat = quaternionFromEuler(bone.axis.x, bone.axis.y, bone.axis.z, result);
        bone.axisInv = bone.axisQuat.clone().invert();
        result.bonedata[bone.name] = bone;
    }
}

function loadAsfHierarchy(keyword, result) {
    result.hierarchy = [];
    let lines = keyword.split("\n");
    for (let i = 1; i < lines.length-1; i++) {
        if (lines[i].match(/\s*(begin|end)/) != null) {
            continue;
        }
        let match = lines[i].match(/(\S+) (.+)/);
        let from = match[1];
        let tos = match[2].split(/\s+/);
        result.hierarchy[from] = [];
        for (let j = 0; j < tos.length; j++) {
            result.hierarchy[from].push(tos[j]);
        }
    }
}

function loadAmcString(amcString, asfStructure) {
    let result = [];
    let split = amcString.split("\n");
    let frame = null;
    for (let i = 0; i < split.length; i++) {
        if (split[i][0] == "#" || split[i][0] == ":") {
            continue;
        }
        let parts = split[i].split(" ");
        if (parts.length == 1) {
            if (frame != null) {
                result.push(finishAmcFrame(frame, asfStructure));
            }
            frame = {};
        } else {
            loadAsfPart(parts, frame); 
        }
    }
    if (frame != null && frame.root !== undefined) {
        result.push(finishAmcFrame(frame, asfStructure));
    }
    return result;
}

function loadAsfPart(parts, frame) {
    let name = parts[0];
    let values = [];
    for (let i = 1; i < parts.length; i++) {
        values.push(parseFloat(parts[i]));
    }
    frame[name] = values;
}

function finishAmcFrame(frame, asfStructure) {
    let result = [];
    let root = frame.root;
    //todo: use order to parse root
    let rootPosition = new THREE.Vector3(root[0], root[1], root[2]);
    let rootRotation = new THREE.Vector3(root[3], root[4], root[5]);
    let quat = quaternionFromEuler(rootRotation.x, rootRotation.y, rootRotation.z, asfStructure);
    traverseSegment(rootPosition, quat, "root", frame, asfStructure, result);
    return result;
}

function quaternionFromEuler(x, y, z, asfStructure) {
    let scaling = 1;
    if (asfStructure.angle == "deg") {
        scaling = Math.PI/180;
    }
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(x*scaling, y*scaling, z*scaling, "ZYX"));
}

function traverseSegment(parentPosition, parentQuat, segment, frame, asfStructure, result) {
    let position;
    let nextQuat;
    if (segment == "root") {
        position = parentPosition;
        nextQuat = parentQuat;
    } else {
        let bonedata = asfStructure.bonedata[segment];
        let frameRotation = readEulerUsingOrder(frame[segment], bonedata.dof);
        let frameQuat = quaternionFromEuler(frameRotation.x, frameRotation.y, frameRotation.z, asfStructure);
        let rotationQuat = new THREE.Quaternion().multiplyQuaternions(bonedata.axisQuat, frameQuat);
        rotationQuat.multiplyQuaternions(rotationQuat, bonedata.axisInv);
        let childQuat = new THREE.Quaternion().multiplyQuaternions(parentQuat, rotationQuat);
        nextQuat = childQuat;
        let directionQuat = new THREE.Quaternion(bonedata.direction.x, bonedata.direction.y, bonedata.direction.z, 0);
        let localQuat = new THREE.Quaternion().multiplyQuaternions(childQuat, directionQuat);
        localQuat.multiplyQuaternions(localQuat, childQuat.clone().invert());
        let rotated = new THREE.Vector3(localQuat.x, localQuat.y, localQuat.z);
        rotated.multiplyScalar(bonedata.length);
        position = new THREE.Vector3().addVectors(parentPosition, rotated);
    }
    result.push({name: segment, pos: position});
    if (asfStructure.hierarchy[segment] === undefined) {
        return;
    }
    for (let i = 0; i < asfStructure.hierarchy[segment].length; i++) {
        let to = asfStructure.hierarchy[segment][i];
        traverseSegment(position, nextQuat, to, frame, asfStructure, result);
    }
}

function readEulerUsingOrder(vector, order) {
    let result = new THREE.Vector3();
    for (let i = 0; i < order.length; i++) {
        let value = vector[i];
        if (order[i] == "rx") {
            result.x = value;
        } else if (order[i] == "ry") {
            result.y = value;
        } else if (order[i] == "rz") {
            result.z = value;
        }
    }
    return result;
}

function traverseSkeletonModel(segment, asfStructure, result, bonesModel, index, skeletonModel) {
    let fromIndex = index;
    result[segment] = index;
    if (asfStructure.hierarchy[segment] === undefined) {
        return index;
    }
    for (let i = 0; i < asfStructure.hierarchy[segment].length; i++) {
        let to = asfStructure.hierarchy[segment][i];
        let boneType = Model.BoneType.torso;
        if (segment != "root") {
            let bonedata = asfStructure.bonedata[segment];
            if (segment.includes("head")) {
                skeletonModel.headJointIndex = index+1;
            } else if (segment[0] == "l" && (segment.includes("clavicle") || segment.includes("shoulder"))) {
                skeletonModel.leftArmIndex = index+1;
            } else if (segment.includes("thorax")) {
                skeletonModel.thoraxIndex = index+1;
            }
            if (segment[0] == "l" && !segment.startsWith("lower")) {
                boneType = Model.BoneType.leftHand;
            }
            if (segment[0] == "r") {
                boneType = Model.BoneType.rightHand;
            }
        }
        bonesModel.push({a: fromIndex, b: index+1, type: boneType});
        index = traverseSkeletonModel(to, asfStructure, result, bonesModel, index+1, skeletonModel);
    }
    return index;
}

function createSkeletonModel(asfStructure) {
    let positions = {};
    let bonesModel = [];
    let defaultScale = 8*(asfStructure.length/0.45);
    let unitSize = 6.207*(asfStructure.length/0.45);
    let skeletonModel = new Model.SkeletonModel(bonesModel, 120, 16, 17, 13, defaultScale, unitSize);
    traverseSkeletonModel("root", asfStructure, positions, bonesModel, 0, skeletonModel);
    return skeletonModel;
}

function toInternalFormat(frames) {
    let result = "#objectKey messif.objects.keys.AbstractObjectKey 1_1_1_1\n";
    result += frames.length+";mcdr.objects.ObjectMocapPose\n";
    for (let i = 0; i < frames.length; i++) {
        for (let j = 0; j < frames[i].length; j++) {
            let pos = frames[i][j].pos;
            result += pos.x+","+pos.y+","+pos.z;
            if (j != frames[i].length-1) {
                result += ";";
            }
        }
        result += "\n";
    }
    return result;
}

export {loadAsfAmcString, loadAsfAmcFile};
