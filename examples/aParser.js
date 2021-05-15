import * as Mocap from '../src/mocap.js';
import * as THREE from '../src/lib/three.module.js';

const asfFileInput = document.getElementById("asfFileInput");
const asfButton = document.getElementById("asfLoadButton");
const amcFileInput = document.getElementById("amcFileInput");
const amcButton = document.getElementById("amcLoadButton");

let asfStructure = null;
asfButton.onclick = () => {loadFile(asfFileInput, 
    (textResult) => {
        asfStructure = loadAsfString(textResult);
        console.log(asfStructure);
    })
};
amcButton.onclick = () => {loadFile(amcFileInput, 
    (textResult) => {
        loadAmcString(textResult, asfStructure);
    })
};

function loadFile(fileInput, callback) {
    if (fileInput.files.length == 0 || fileInput.files[0].size > 50 * 1024 * 1024) {
        return;
    }
    let reader = new FileReader();
    reader.onload = function (textResult) {
        callback(textResult.target.result);
    }
    reader.onerror = function (e) {
        console.log("Loading the data file failed, most likely because of how big the file is.");
    }
    reader.readAsText(fileInput.files[0], "UTF-8");
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
        result.mass = match[1];
    }
    match = keyword.match(/length (\S+)/);
    if (match != null) {
        result.length = match[1];
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
            bone.dof = match[1];
        } else {
            bone.dof = null;
        }
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
    console.log(result);
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
    traverseSegment(rootPosition, "root", frame, asfStructure, result);
    return result;
}

function traverseSegment(position, segment, frame, asfStructure, result) {
    result.push({name: segment, pos: position});
    if (asfStructure.hierarchy[segment] === undefined) {
        return;
    }
    for (let i = 0; i < asfStructure.hierarchy[segment].length; i++) {
        let to = asfStructure.hierarchy[segment][i];
        let bonedata = asfStructure.bonedata[to];
        let toPosition = new THREE.Vector3().addVectors(position, bonedata.direction);
        traverseSegment(toPosition, to, frame, asfStructure, result);
    }
}
