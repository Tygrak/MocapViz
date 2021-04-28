import * as THREE from './lib/three.module.js';
import * as Model from './model.js';
import {OrbitControls} from './lib/OrbitControls.js';

let mainRenderer = null;
let textCanvas = null;
const sceneWidth = 100;

function MocapDrawStyle(bonesModel, headJointIndex, leftArmIndex, thoraxIndex, boneRadius, jointRadius, headRadius, boneStyle, leftBoneStyle, rightBoneStyle, jointStyle, figureScale, noseStyle = "rgba(192, 16, 128, 1)", noseRadius = 0.85, opacity = 1) {
    this.bonesModel = bonesModel;
    this.headJointIndex = headJointIndex;
    this.leftArmIndex = leftArmIndex;
    this.thoraxIndex = thoraxIndex;
    this.boneRadius = boneRadius;
    this.jointRadius = jointRadius;
    this.headRadius = headRadius;
    this.boneStyle = boneStyle;
    this.leftBoneStyle = leftBoneStyle;
    this.rightBoneStyle = rightBoneStyle;
    this.jointStyle = jointStyle;
    this.figureScale = figureScale;
    this.noseStyle = noseStyle;
    this.noseRadius = noseRadius;
    this.opacity = opacity;
}

const KeyframeSelectionAlgorithmEnum = {Equidistant: 1, Euclidean: 2, Temporal: 3, Lowe: 4, Decimation: 5};

class Skeleton {
    constructor (head, nose, bones, model) {
        this.group = new THREE.Group();
        this.head = head;
        this.nose = nose;
        this.bones = bones;
        this.model = model;
        this.group.add(head);
        this.group.add(nose);
        for (let i = 0; i < bones.length; i++) {
            this.group.add(bones[i]);
        }
    }
}

class MocapRenderer {
    constructor (canvas, renderer, camera, skeleton, scene) {
        this.canvas = canvas;
        this.renderer = renderer;
        this.camera = camera;
        this.skeleton = skeleton;
        this.scene = scene;

        this.clearScene = new THREE.Scene();
        this.clearScene.background = new THREE.Color(0xffffff);
    }
}

function createBoxLine(pA, pB, color, radius = 1) {
    let box = new THREE.Mesh(new THREE.BoxGeometry(radius, radius, 1), new THREE.MeshBasicMaterial({color: new THREE.Color(color)}));
    box.scale.z = pA.distanceTo(pB);
    box.position.set((pA.x+pB.x)/2, (pA.y+pB.y)/2, (pA.z+pB.z)/2);
    box.lookAt(pB);
    return box;
}

function moveBoxLine(box, pA, pB) {
    box.scale.z = pA.distanceTo(pB);
    box.position.set((pA.x+pB.x)/2, (pA.y+pB.y)/2, (pA.z+pB.z)/2);
    box.lookAt(pB);
}

function createSkeleton(drawStyle) {
    let nose = createBoxLine(new THREE.Vector3(), new THREE.Vector3(), rgbaToColorString(drawStyle.noseStyle), 0.5);
    let head = new THREE.Mesh(
        new THREE.SphereGeometry(1, 32, 32), 
        new THREE.MeshBasicMaterial({color: new THREE.Color(rgbaToColorString(drawStyle.jointStyle))}));
    head.scale.set(drawStyle.headRadius, drawStyle.headRadius, drawStyle.headRadius);
    let modelBones = drawStyle.bonesModel.slice();
    let bones = [];
    for (let i = 0; i < modelBones.length; i++) {
        let color = rgbaToColorString(drawStyle.boneStyle);
        if (modelBones[i].type == Model.BoneType.rightHand || modelBones[i].type == Model.BoneType.rightLeg) {
            color = rgbaToColorString(drawStyle.rightBoneStyle);
        } else if (modelBones[i].type == Model.BoneType.leftHand || modelBones[i].type == Model.BoneType.leftLeg) {
            color = rgbaToColorString(drawStyle.leftBoneStyle);
        }
        bones.push(createBoxLine(new THREE.Vector3(), new THREE.Vector3(), color, drawStyle.boneRadius));
    }
    //todo: add pointcloud support
    /*let joints = [];
    if (drawStyle.jointRadius > 0) {
        for (let i = 0; i < array.length; i++) {
            const element = array[i];
            
        }
        let joint = new THREE.Mesh(
            new THREE.SphereGeometry(1, 32, 32), 
            new THREE.MeshBasicMaterial({color: new THREE.Color(rgbaToColorString(drawStyle.jointStyle))}));
        joint.scale.set(drawStyle.jointRadius, drawStyle.jointRadius, drawStyle.jointRadius);
    }*/
    return new Skeleton(head, nose, bones, drawStyle.bonesModel);
}

function calculateNoseVector(headJoint, thoraxJoint, leftArmJoint, multiplyScalar = 1) {
    let vecNose = new THREE.Vector3(headJoint.x-thoraxJoint.x, 
        headJoint.y-thoraxJoint.y, 
        headJoint.z-thoraxJoint.z);
    vecNose.cross(new THREE.Vector3(leftArmJoint.x-thoraxJoint.x, 
        leftArmJoint.y-thoraxJoint.y, 
        leftArmJoint.z-thoraxJoint.z));
    vecNose.normalize();
    vecNose.multiplyScalar(-1*multiplyScalar);
    return vecNose;
} 

function modifySkeletonToFrame(skeleton, frame, drawStyle, xShift, yShift, figureScale) {
    let vecNose = calculateNoseVector(frame[drawStyle.headJointIndex], frame[drawStyle.thoraxIndex], frame[drawStyle.leftArmIndex], 6*figureScale);
    let nosePos = new THREE.Vector3(frame[drawStyle.headJointIndex].x+vecNose.x+xShift, frame[drawStyle.headJointIndex].y+vecNose.y+yShift, frame[drawStyle.headJointIndex].z+vecNose.z);
    moveBoxLine(skeleton.nose, nosePos, new THREE.Vector3(frame[drawStyle.headJointIndex].x+xShift, frame[drawStyle.headJointIndex].y+yShift, frame[drawStyle.headJointIndex].z));
    skeleton.nose.scale.x = drawStyle.noseRadius*figureScale;
    skeleton.nose.scale.y = drawStyle.noseRadius*figureScale;
    skeleton.nose.material.color.setRGB(drawStyle.noseStyle.r/255, drawStyle.noseStyle.g/255, drawStyle.noseStyle.b/255);
    skeleton.head.position.set(frame[drawStyle.headJointIndex].x+xShift, frame[drawStyle.headJointIndex].y+yShift, frame[drawStyle.headJointIndex].z);
    skeleton.head.scale.set(figureScale*drawStyle.headRadius, figureScale*drawStyle.headRadius, figureScale*drawStyle.headRadius);
    skeleton.head.material.color.setRGB(drawStyle.jointStyle.r/255, drawStyle.jointStyle.g/255, drawStyle.jointStyle.b/255);
    if (drawStyle.opacity < 1) {
        skeleton.nose.material.opacity = drawStyle.opacity;
        skeleton.nose.material.transparent = true;
        skeleton.head.material.opacity = drawStyle.opacity;
        skeleton.head.material.transparent = true;
    } else {
        skeleton.nose.material.opacity = 1;
        skeleton.nose.material.transparent = false;
        skeleton.head.material.opacity = 1;
        skeleton.head.material.transparent = false;
    }
    let bones = drawStyle.bonesModel;
    for (let i = 0; i < bones.length; i++) {
        if (bones[i].a >= frame.length || bones[i].b >= frame.length) {
            continue;
        }
        let a = frame[bones[i].a];
        let b = frame[bones[i].b];
        let pA = new THREE.Vector3(a.x+xShift, a.y+yShift, a.z);
        let pB = new THREE.Vector3(b.x+xShift, b.y+yShift, b.z);
        moveBoxLine(skeleton.bones[i], pA, pB);
        skeleton.bones[i].scale.x = drawStyle.boneRadius*figureScale;
        skeleton.bones[i].scale.y = drawStyle.boneRadius*figureScale;
        if (bones[i].type == Model.BoneType.rightHand || bones[i].type == Model.BoneType.rightLeg) {
            skeleton.bones[i].material.color.setRGB(drawStyle.rightBoneStyle.r/255, drawStyle.rightBoneStyle.g/255, drawStyle.rightBoneStyle.b/255);
        } else if (bones[i].type == Model.BoneType.leftHand || bones[i].type == Model.BoneType.leftLeg) {
            skeleton.bones[i].material.color.setRGB(drawStyle.leftBoneStyle.r/255, drawStyle.leftBoneStyle.g/255, drawStyle.leftBoneStyle.b/255);
        } else {
            skeleton.bones[i].material.color.setRGB(drawStyle.boneStyle.r/255, drawStyle.boneStyle.g/255, drawStyle.boneStyle.b/255);
        }
        if (drawStyle.opacity < 1) {
            skeleton.bones[i].material.opacity = drawStyle.opacity;
            skeleton.bones[i].material.transparent = true;
        } else {
            skeleton.bones[i].material.opacity = 1;
            skeleton.bones[i].material.transparent = false;
        }
    }
}

function drawSequence(mocapRenderer, frames, indexes, numBlurPositions, drawStyle, drawStyleBlur, figureScale, yShift = 0, clear = true, labelFrames = true) {
    if (clear) {
        clearRenderer(mocapRenderer);
    }
    let firstFrame = moveOriginXBy(frames[0], frames[0][0].x);
    let minimumsFirst = findMinimumsFromFrame(firstFrame);
    let maximumsFirst = findMaximumsFromFrame(firstFrame);
    let lastFrame = moveOriginXBy(frames[frames.length-1], frames[frames.length-1][0].x);
    let minimumsLast = findMinimumsFromFrame(lastFrame);
    let maximumsLast = findMaximumsFromFrame(lastFrame);
    let sequenceMaximums = findSequenceMaximums(frames, indexes.length);
    sequenceMaximums.y = sequenceMaximums.y-3;
    let xPositions = [];
    for (let i = 0; i < indexes.length; i++) {
        let coreX = frames[indexes[i]][0].x;
        let xShift = (indexes[i]/frames.length)*(96-(maximumsLast.x-minimumsLast.x))+(maximumsFirst.x-minimumsFirst.x)/2+2;
        for (let j = 1; j < numBlurPositions+1; j++) {
            if (indexes[i]-j < 0) {
                continue;
            }
            drawFrame(mocapRenderer, moveOriginXBy(frames[indexes[i]-j], coreX), figureScale, xShift, yShift, drawStyleBlur, false);
        }
        drawFrame(mocapRenderer, moveOriginXBy(frames[indexes[i]], coreX), figureScale, xShift, yShift, drawStyle, false);
        xPositions.push(xShift);
        //todo: add labels
        /*
        if (labelFrames) {
            ctx.font = '12px serif';
            ctx.fillStyle = 'black';
            ctx.fillText(indexes[i], xShift, sequenceMaximums.y+yShift+14);
        }
        */
    }
    return xPositions;
}

function drawFrame(mocapRenderer, frame, figureScale, xShift, yShift, drawStyle, clear = false) {
    mocapRenderer.renderer.autoClearColor = clear;
    modifySkeletonToFrame(mocapRenderer.skeleton, frame, drawStyle, xShift, yShift, figureScale);
    mocapRenderer.renderer.render(mocapRenderer.scene, mocapRenderer.camera);
}

function clearRenderer(mocapRenderer) {
    mocapRenderer.renderer.autoClearColor = true;
    mocapRenderer.renderer.render(mocapRenderer.clearScene, mocapRenderer.camera);
}

function initializeMocapRenderer(canvas, width, height, drawStyle) {
    let renderer = new THREE.WebGLRenderer({canvas, preserveDrawingBuffer: true, alpha: true, antialiasing: true});
    renderer.setPixelRatio(window.devicePixelRatio*1.5);
    renderer.autoClearColor = false;
    renderer.setSize(width, height);
    let ratio = width/height;

    let scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    
    let camera = new THREE.OrthographicCamera(-sceneWidth/2, sceneWidth/2, (sceneWidth/2)/ratio, -(sceneWidth/2)/ratio, 0.1, 10000);
    camera.position.set(sceneWidth/2, (sceneWidth/2)/ratio, sceneWidth);
    camera.lookAt(sceneWidth/2, (sceneWidth/2)/ratio, 0);
    let skeleton = createSkeleton(drawStyle);
    scene.add(skeleton.group);
    return new MocapRenderer(canvas, renderer, camera, skeleton, scene);
}

function resizeMocapRenderer(mocapRenderer, width, height) {
    mocapRenderer.renderer.setSize(width, height);
    let ratio = width/height;
    let camera = new THREE.OrthographicCamera(-sceneWidth/2, sceneWidth/2, (sceneWidth/2)/ratio, -(sceneWidth/2)/ratio, 0.1, 10000);
    camera.position.set(sceneWidth/2, (sceneWidth/2)/ratio, sceneWidth);
    camera.lookAt(sceneWidth/2, (sceneWidth/2)/ratio, 0);
    mocapRenderer.camera = camera;
}

function loadDataFromString(dataString) {
    return dataString.split("#objectKey").filter((s) => {return s != "";}).map((s) => s.split("\n"));
}

function createAnimationElement(sequence, model, visualizationWidth, visualizationHeight) {
    let drawStyle = new MocapDrawStyle(model.bonesModel, model.headJointIndex, model.leftArmIndex, model.thoraxIndex, 0.9, 0,
        2.25, Model.boneStyleDefault, Model.leftBoneStyleDefault, Model.rightBoneStyleDefault, Model.jointStyleDefault, 1, "rgba(192, 16, 128, 1)", 0.9, 1);
    let div = document.createElement("div");
    div.className = "drawItem-"+Model.motionCategories[getSequenceCategory(sequence)];
    let canvas = document.createElement("canvas");
    canvas.className = "drawItemVisualization";
    div.appendChild(canvas);
    let mocapRenderer = initializeMocapRenderer(canvas, visualizationWidth, visualizationHeight, drawStyle);
    let processed = processSequence(sequence, 12, visualizationWidth, visualizationHeight);
    let figureScale = processed.figureScale;
    let frames = processed.frames;
    let controls = new OrbitControls(mocapRenderer.camera, mocapRenderer.renderer.domElement);
    controls.listenToKeyEvents(window);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;
    controls.maxZoom = 1.5;
    controls.minZoom = 0.8;
    let frame = 0;
    let animate = () => {
        if (div.classList.contains("hidden") || !document.body.contains(canvas)) {
            return;
        }
        drawFrame(mocapRenderer, frames[frame], figureScale, 0, 0, drawStyle, true);
        frame = (frame+1)%frames.length;
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
    return div;
}

function createZoomableVisualizationElement(sequence, model, numKeyframes, zoomedNumKeyframes, numBlurFrames, mapWidth, mapHeight, visualizationWidth, visualizationHeight, addTimeScale = false, addFillingKeyframes = true, keyframeSelectionAlgorithm = 4) {
    let main = createVisualizationElement(sequence, model, numKeyframes, numBlurFrames, mapWidth, mapHeight, visualizationWidth, visualizationHeight, addTimeScale, addFillingKeyframes, keyframeSelectionAlgorithm);
    let zoomWidth = Math.floor(document.body.clientWidth-document.body.clientWidth/24);
    let zoomHeight = Math.floor(document.body.clientHeight*0.6-document.body.clientWidth/16);
    let bg = document.createElement("div");
    let zoomed = createVisualizationElement(sequence, model, zoomedNumKeyframes, numBlurFrames, 0, 0, zoomWidth, zoomHeight, addTimeScale, addFillingKeyframes, keyframeSelectionAlgorithm);
    zoomed.style = "z-index: 9999; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; border: 2px solid black; display: block;";
    bg.style = "display: none;";
    let fun = () => {
        let hide = main.classList.toggle("hidden");
        if (!hide) {
            bg.style = "display: none;";
        } else {
            bg.style = "z-index: 9998; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.9); display: block;";
        }
    };
    bg.onclick = fun;
    main.children[0].onclick = fun;
    main.children[1].onclick = fun;
    bg.appendChild(zoomed);
    main.appendChild(bg);
    return main;
}

function visualizeToCanvas(canvas, sequence, model, numKeyframes, numBlurFrames, width, height, addTimeScale = false, addFillingKeyframes = true, keyframeSelectionAlgorithm = 4) {
    let drawStyle = new MocapDrawStyle(model.bonesModel, model.headJointIndex, model.leftArmIndex, model.thoraxIndex, 0.725, 0,
        1.5, Model.boneStyleDefault, Model.leftBoneStyleDefault, Model.rightBoneStyleDefault, Model.jointStyleDefault, 1, Model.noseStyleDefault, 0.9, 1);
    let drawStyleBlur = new MocapDrawStyle(model.bonesModel, model.headJointIndex, model.leftArmIndex, model.thoraxIndex, 0.725, 0,
        1.5, Model.blurStyleDefault, Model.blurStyleDefault, Model.blurStyleDefault, Model.blurStyleDefault, 1, Model.blurStyleDefault, 0.9, 0.125);
    let mocapRenderer = initializeMocapRenderer(canvas, width, height, drawStyle);
    let processed = processSequence(sequence, numKeyframes, width, height, drawStyle);
    let figureScale = processed.figureScale;
    let frames = processed.frames;
    let keyframes;
    if (keyframeSelectionAlgorithm == KeyframeSelectionAlgorithmEnum.Decimation) {
        keyframes = findKeyframesDecimation(frames, numKeyframes);
    } else if (keyframeSelectionAlgorithm == KeyframeSelectionAlgorithmEnum.Lowe) {
        keyframes = findKeyframesLowe(frames, numKeyframes);
    } else if (keyframeSelectionAlgorithm == KeyframeSelectionAlgorithmEnum.Euclidean) {
        keyframes = findKeyframesEuclidean(frames, numKeyframes);
    } else if (keyframeSelectionAlgorithm == KeyframeSelectionAlgorithmEnum.Equidistant) {
        keyframes = findKeyframesEquidistant(frames, numKeyframes);
    } else {
        keyframes = findKeyframesTemporal(frames, numKeyframes);
    }
    if (addFillingKeyframes) {
        let fillKeyframes = getFillKeyframes(frames, keyframes);
        let fillStyle = Object.assign({}, drawStyle);
        fillStyle.opacity = 0.4;
        drawSequence(mocapRenderer, frames, fillKeyframes, 0, fillStyle, drawStyleBlur, figureScale, 0, true);
    }
    drawSequence(mocapRenderer, frames, keyframes, numBlurFrames, drawStyle, drawStyleBlur, figureScale, 0, false);
    if (addTimeScale) {
        drawTimeScale(mocapRenderer, mocapRenderer.camera.right-mocapRenderer.camera.left, mocapRenderer.camera.top-mocapRenderer.camera.bottom, model.fps, frames.length, keyframes);
    }
}

function createVisualizationElement(sequence, model, numKeyframes, numBlurFrames, mapWidth, mapHeight, visualizationWidth, visualizationHeight, addTimeScale = false, addFillingKeyframes = true, keyframeSelectionAlgorithm = 4, labelFrames = true) {
    let drawStyle = new MocapDrawStyle(model.bonesModel, model.headJointIndex, model.leftArmIndex, model.thoraxIndex, 0.725, 0,
        1.5, Model.boneStyleDefault, Model.leftBoneStyleDefault, Model.rightBoneStyleDefault, Model.jointStyleDefault, 1, Model.noseStyleDefault, 0.9, 1);
    let drawStyleBlur = new MocapDrawStyle(model.bonesModel, model.headJointIndex, model.leftArmIndex, model.thoraxIndex, 0.725, 0,
        1.5, Model.blurStyleDefault, Model.blurStyleDefault, Model.blurStyleDefault, Model.blurStyleDefault, 1, Model.blurStyleDefault, 0.9, 0.125);
    if (mainRenderer == null || mainRenderer.skeleton.model != model.bonesModel) {
        let canvas = document.createElement("canvas");
        mainRenderer = initializeMocapRenderer(canvas, visualizationWidth, visualizationHeight, drawStyle);
    } else {
        resizeMocapRenderer(mainRenderer, visualizationWidth, visualizationHeight);
    }
    let div = document.createElement("div");
    div.className = "drawItem-"+Model.motionCategories[getSequenceCategory(sequence)];
    let map = document.createElement("canvas");
    map.className = "drawItemMap";
    map.width = mapWidth;
    map.height = mapHeight;
    map.style = "width: "+mapWidth+"px; height: "+mapHeight+"px;";
    div.appendChild(map);
    let image = document.createElement("img");
    image.className = "drawItemVisualization";
    div.appendChild(image);
    let processed = processSequence(sequence, numKeyframes, visualizationWidth, visualizationHeight, drawStyle);
    let figureScale = processed.figureScale;
    let frames = processed.frames;
    let keyframes;
    if (keyframeSelectionAlgorithm == KeyframeSelectionAlgorithmEnum.Decimation) {
        keyframes = findKeyframesDecimation(frames, numKeyframes);
    } else if (keyframeSelectionAlgorithm == KeyframeSelectionAlgorithmEnum.Lowe) {
        keyframes = findKeyframesLowe(frames, numKeyframes);
    } else if (keyframeSelectionAlgorithm == KeyframeSelectionAlgorithmEnum.Euclidean) {
        keyframes = findKeyframesEuclidean(frames, numKeyframes);
    } else if (keyframeSelectionAlgorithm == KeyframeSelectionAlgorithmEnum.Equidistant) {
        keyframes = findKeyframesEquidistant(frames, numKeyframes);
    } else {
        keyframes = findKeyframesTemporal(frames, numKeyframes);
    }
    let ctx = map.getContext("2d");
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.rect(0, 0, map.width, map.height);
    ctx.fill();
    clearRenderer(mainRenderer);
    if (addFillingKeyframes) {
        let fillKeyframes = getFillKeyframes(frames, keyframes);
        let fillStyle = Object.assign({}, drawStyle);
        fillStyle.opacity = 0.4;
        drawSequence(mainRenderer, frames, fillKeyframes, 0, fillStyle, drawStyleBlur, figureScale, 0, false);
    }
    let positions = drawSequence(mainRenderer, frames, keyframes, numBlurFrames, drawStyle, drawStyleBlur, figureScale, 0, false);
    let mapScale = findMapScale(frames, numKeyframes, figureScale, map.width);
    let mSize = sceneWidth/(model.unitSize/figureScale);
    if (mapScale < mSize*2.5) {
        mapScale = mSize*2.5;
    }
    if (addTimeScale) {
        drawTimeScale(mainRenderer, mainRenderer.camera.right-mainRenderer.camera.left, mainRenderer.camera.top-mainRenderer.camera.bottom, model.fps, frames.length, keyframes);
    }
    drawTopDownMap(map, frames, keyframes, 
        {x:-1, y:-1, z:0}, 
        {x:-1, y:map.height+1, z:0}, 
        {x:map.width+1, y:map.height+1, z:0}, frames.length, mapScale, sceneWidth/(model.unitSize/figureScale), false, true, model.fps);
    image.src = mainRenderer.canvas.toDataURL("image/png");
    image.height = visualizationHeight;
    image.width = visualizationWidth;
    div.style.position = "relative";
    if (labelFrames) {
        createTextElements(positions, keyframes, image, mapWidth, div);
    }
    return div;
}

function createTextElements(positions, keyframes, image, mapWidth, mainDiv) {
    for (let i = 0; i < positions.length; i++) {
        let element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.zIndex = 1;
        element.style.width = 40;
        element.style.height = 25;
        element.innerHTML = keyframes[i];
        element.style.top = (2) + 'px';;//(image.height-18) + 'px';
        element.style.left = ((positions[i]/100)*image.width+mapWidth-3) + 'px';
        element.style.fontSize = "0.75em";
        element.style.color = "rgb(5, 10, 5)";
        element.style.textAlign = "left";
        mainDiv.appendChild(element);
    }
}

function processSequence(sequence, numKeyframes, width, height, drawStyle) {
    let ratio = width/height;
    let processed = processSequenceToFramesAuto(sequence, numKeyframes, sceneWidth, sceneWidth/ratio, true);
    let frames = processed.frames;
    let figureScale = processed.figureScale;
    let bestRotation = findOptimalRotation(frames, 12);
    for (let i = 0; i < frames.length; i++) {
        frames[i] = frameRotateY(frames[i], bestRotation);
    }
    if (checkSequenceNeedsFlip(frames, drawStyle)) {
        for (let i = 0; i < frames.length; i++) {
            frames[i] = frameRotateY(frames[i], Math.PI);
        }
    }
    return {frames: frames, figureScale: figureScale};
}

function processSequenceToFramesAuto(sequence, numKeyframes, width, height, switchY = false) {
    let figureScale = 1;
    let frames = processSequenceToFrames(sequence, 0, figureScale, switchY);
    if (figureScale < 0) {
        figureScale = 1;
    }
    if (frames.length == 0) {
        frames = processSequenceToFrames2d(sequence, 0, figureScale, switchY);
        figureScale = figureScale*findOptimalScale(frames, width*0.99, height*0.9, numKeyframes);
        frames = processSequenceToFrames2d(sequence, 0, figureScale, switchY);
    } else {
        figureScale = figureScale*findOptimalScale(frames, width*0.99, height*0.9, numKeyframes);
        frames = processSequenceToFrames(sequence, 0, figureScale, switchY);
    }
    return {frames: frames, figureScale: figureScale};
}

function processSequenceToFrames(rawData, canvasHeight, figureScale, switchY = false) {
    let lines = rawData;
    let frames = lines.map((frame) => {
        return frame.replace(" ", "").split(';').map((joint) => {
            let xyz = joint.split(',');
            return {x:parseFloat(xyz[0])*figureScale, y:parseFloat(xyz[1])*-1*figureScale + canvasHeight, z:parseFloat(xyz[2])*figureScale};
        });
    });
    frames = frames.filter((f) => {return f.length > 0 && !isNaN(f[0].x) && !isNaN(f[0].y) && !isNaN(f[0].z)});
    if (frames.length == 0) {
        return frames;
    } 
    let yShift = canvasHeight-Math.max(findMaximumsFromFrame(frames[0]).y, findMaximumsFromFrame(frames[frames.length-1]).y);
    for (let i = 0; i < frames.length; i++) {
        for (let j = 0; j < frames[i].length; j++) {
            if (switchY) {
                frames[i][j].y = -frames[i][j].y-yShift;
            } else {
                frames[i][j].y = frames[i][j].y+yShift;
            }
        }
    }
    return frames;
}

function processSequenceToFrames2d(rawData, canvasHeight, figureScale, switchY = false) {
    let lines = rawData;
    let frames = lines.map((frame) => {
        return frame.replace(" ", "").split(';').map((joint) => {
            let xy = joint.split(',');
            return {x:parseFloat(xy[0])*figureScale, y:parseFloat(xy[1])*figureScale + canvasHeight, z:0};
        });
    });
    frames = frames.filter((f) => {return f.length > 0 && !isNaN(f[0].x) && !isNaN(f[0].y)});
    if (frames.length == 0) {
        return frames;
    } 
    let yShift = canvasHeight-Math.max(findMaximumsFromFrame(frames[0]).y, findMaximumsFromFrame(frames[frames.length-1]).y);
    for (let i = 0; i < frames.length; i++) {
        for (let j = 0; j < frames[i].length; j++) {
            if (switchY) {
                frames[i][j].y = -frames[i][j].y-yShift;
            } else {
                frames[i][j].y = frames[i][j].y+yShift;
            }
        }
    }
    return frames;
}

function getSequenceCategory(rawData) {
    let lines = rawData;
    let description = lines[0].match(/messif.objects.keys.AbstractObjectKey (.+)/);
    if (description == null) {
        return "null";
    }
    let category = description[1].match(/\d+_(\d+).+/)[1];
    return category;
}

function getSequenceLength(rawData) {
    let lines = rawData;
    let description = lines[1].match(/\d+(?=;)/);
    if (description == null) {
        return -1;
    }
    return parseInt(description);
}

function drawTimeScale(mocapRenderer, width, height, fps, length, keyframes) {
    let scene = new THREE.Scene();
    let line = createBoxLine(new THREE.Vector3(0, height-0.1, 1), new THREE.Vector3(width*length/(fps*10), height-0.1, 1), "rgba(64, 64, 64, 1)", 0.25);
    scene.add(line);
    for (let i = 0; i < keyframes.length; i++) {
        line = createBoxLine(new THREE.Vector3(width*keyframes[i]/(fps*10), height-0.1, 0), new THREE.Vector3(width*keyframes[i]/(fps*10), height-1.05, 0), "rgba(64, 0, 192, 1)", 0.25);
        scene.add(line);
    }
    for (let i = 1; i < 10 && i*fps < length; i++) {
        line = createBoxLine(new THREE.Vector3(width*i/10, height-0.1, 0.5), new THREE.Vector3(width*i/10, height-1, 0.5), "rgba(0, 0, 0, 1)", 0.375);
        scene.add(line);
    }
    mocapRenderer.renderer.render(scene, mocapRenderer.camera);
}

function drawTopDownMap(canvas, frames, indexes, topLeft, bottomLeft, bottomRight, drawUntilFrame, mapScale, dmsize, clear = true, drawLength = false, fps = 120) {
    let ctx = canvas.getContext("2d");
    if (clear) {
        clearCanvas(canvas);
    }
    let shift = topLeft.x-bottomLeft.x;
    let topRight = {x: bottomRight.x+shift, y: topLeft.y, z:0};
    let width = topRight.x-topLeft.x;
    let height = bottomRight.y-topLeft.y;
    let coreX = frames[0][0].x;
    let coreZ = frames[0][0].z;
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    let dmSizeWidth = lerp(0, canvas.width, dmsize/mapScale);
    let dmSizeHeight = lerp(0, canvas.height, dmsize/mapScale);
    let dmTextLabelPos = {x: 0, y: 0};
    let i = 0;
    while (canvas.width/2 + i*dmSizeWidth < canvas.width) {
        drawRectangle(ctx, {x:topLeft.x+canvas.width/2+i*dmSizeWidth, y:topLeft.y}, {x:bottomLeft.x+canvas.width/2+i*dmSizeWidth, y:bottomLeft.y}, 0.75, 0, 0);
        i++;
    }
    i = 0;
    while (canvas.height/2 + i*dmSizeHeight < canvas.height) {
        let startShiftX = shift-inverseLerp(0, height, i*dmSizeHeight)*shift;
        drawRectangle(ctx, {x:bottomLeft.x+startShiftX, y:topLeft.y+canvas.height/2+i*dmSizeHeight}, {x:bottomRight.x+startShiftX, y:topLeft.y+canvas.height/2+i*dmSizeHeight}, 0.75, 0, 0);
        if (canvas.height/2 + (i+1)*dmSizeHeight > canvas.height) {
            dmTextLabelPos.y = topLeft.y+canvas.height/2+i*dmSizeHeight;
        }
        i++;
    }
    i = 1;
    while (canvas.width/2 - i*dmSizeWidth > 0) {
        drawRectangle(ctx, {x:topLeft.x+canvas.width/2-i*dmSizeWidth, y:topLeft.y}, {x:bottomLeft.x+canvas.width/2-i*dmSizeWidth, y:bottomLeft.y}, 0.75, 0, 0);
        if (canvas.height/2 + (i+1)*dmSizeHeight > canvas.height) {
            dmTextLabelPos.x = topLeft.x+canvas.width/2-i*dmSizeWidth;
        }
        i++;
    }
    i = 1;
    while (canvas.height/2 - i*dmSizeHeight > 0) {
        let startShiftX = shift-inverseLerp(0, height, i*dmSizeHeight)*shift;
        drawRectangle(ctx, {x:bottomLeft.x+startShiftX, y:topLeft.y+canvas.height/2-i*dmSizeHeight}, {x:bottomRight.x+startShiftX, y:topLeft.y+canvas.height/2-i*dmSizeHeight}, 0.75, 0, 0);
        i++;
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.95)";
    ctx.fillText("1 m", dmTextLabelPos.x+2, dmTextLabelPos.y-2);
    drawRectangle(ctx, {x: dmTextLabelPos.x, y: dmTextLabelPos.y}, {x: dmTextLabelPos.x+dmSizeWidth, y: dmTextLabelPos.y}, 0.75, 0, 0);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    for (let i = 0; i < drawUntilFrame; i++) {
        let x = frames[i][0].x-coreX;
        let z = frames[i][0].z-coreZ;
        let transformedX = inverseLerp(-mapScale/2, mapScale/2, x)*width;
        let transformedZ = inverseLerp(-mapScale/2, mapScale/2, z)*height;
        if (transformedX < 2 || transformedZ < 2 || transformedX >= width-2 || transformedZ >= height-2) {
            continue;
        }
        let startShiftX = shift-inverseLerp(0, height, transformedZ)*shift;
        if (indexes.includes(i)) {
            ctx.beginPath();
            ctx.fillStyle = rgbaToColorString({r: 0, g: 0, b: 0, a:1});
            ctx.rect(bottomLeft.x+transformedX+startShiftX, topLeft.y+transformedZ, 5, 5);
            ctx.closePath();
            ctx.fill();
        } else {
            let color = hslToRgb((i/frames.length)*0.95, 0.9, 0.5);
            color.a = 0.35;
            ctx.fillStyle = rgbaToColorString(color);
            ctx.beginPath();
            ctx.rect(bottomLeft.x+transformedX+startShiftX, topLeft.y+transformedZ, 3, 3);
            ctx.closePath();
            ctx.fill();
        }
    }
    if (drawLength) {
        ctx.font = '12px serif';
        ctx.textAlign = "right";
        ctx.fillStyle = 'black';
        ctx.fillText((frames.length/fps).toFixed(2) + "s", canvas.width-5, canvas.height-5);
    }
    ctx.fillStyle = 'black';
    drawRectangle(ctx, topLeft, topRight, 1, 0, 0);
    drawRectangle(ctx, topRight, bottomRight, 1, 0, 0);
    drawRectangle(ctx, bottomRight, bottomLeft, 1, 0, 0);
    drawRectangle(ctx, bottomLeft, topLeft, 1, 0, 0);
}

function findMinimumsFromFrame(frame) {
    let xyz = {x:frame[0].x, y:frame[0].y, z:frame[0].z};
    for (let i = 1; i < frame.length; i++) {
        if (frame[i].x < xyz.x) {
            xyz.x = frame[i].x;
        }
        if (frame[i].y < xyz.y) {
            xyz.y = frame[i].y;
        }
        if (frame[i].z < xyz.z) {
            xyz.z = frame[i].z;
        }
    }
    return xyz;
}

function findMaximumsFromFrame(frame) {
    let xyz = {x:frame[0].x, y:frame[0].y, z:frame[0].z};
    for (let i = 1; i < frame.length; i++) {
        if (frame[i].x > xyz.x) {
            xyz.x = frame[i].x;
        }
        if (frame[i].y > xyz.y) {
            xyz.y = frame[i].y;
        }
        if (frame[i].z > xyz.z) {
            xyz.z = frame[i].z;
        }
    }
    return xyz;
}

function findKeyframesEquidistant(frames, numKeyframes) {
    let result = [];
    if (numKeyframes == 1) {
        result.push(frames.length-1);
        return result;
    }
    for (let i = 0; i < numKeyframes; i++) {
        result.push(i*Math.floor((frames.length-1)/(numKeyframes-1)));
    }
    return result;
}

function findKeyframesEuclidean(frames, numKeyframes) {
    let result = [0, frames.length-1];
    for (let k = 0; k < numKeyframes-2; k++) {
        let dmax = 0;
        let index = 0;
        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            let dmin = Infinity;
            for (let j = 0; j < result.length; j++) {
                const keyframe = frames[result[j]];
                let d = frameDistance(frame, keyframe);
                if (d < dmin) {
                    dmin = d;
                }
            }
            if (dmin > dmax) {
                dmax = dmin;
                index = i;
            }
        }
        result.push(index);
    }
    return result.sort((a, b) => a-b);
}

function findKeyframesDot(frames, numKeyframes) {
    let result = [0, frames.length-1];
    for (let i = 0; i < numKeyframes-2; i++) {
        let maxD = -Infinity;
        let minDIndex = -1;
        let k = 1;
        for (let j = 1; j < frames.length-1; j++) {
            while (j > result[k]) {
                k++;
            }
            if (j == result[k]) {
                continue;
            }
            let d = frameDistance(frames[result[k-1]], frames[j])+frameDistance(frames[result[k]], frames[j]);
            //let dot = frameCosineSimilarity(frames[result[k-1]], frames[result[k]], frames[j]);
            if (d > maxD) {
                maxD = d;
                minDIndex = j;
            }
        }
        if (minDIndex != -1) {
            result.splice(sortedIndex(result, minDIndex), 0, minDIndex);
        }
    }
    return result;
}

function findKeyframesTemporal(frames, numKeyframes) {
    let result = [0, frames.length-1];
    for (let k = 0; k < numKeyframes-2; k++) {
        let dmax = 0;
        let index = 0;
        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            let dmin = Infinity;
            for (let j = 0; j < result.length; j++) {
                const keyframe = frames[result[j]];
                let d = frameDistanceTemporal(frame, keyframe, i, result[j]);
                if (d < dmin) {
                    dmin = d;
                }
            }
            if (dmin > dmax) {
                dmax = dmin;
                index = i;
            }
        }
        result.push(index);
    }
    return result.sort((a, b) => a-b);
}

function findKeyframesDecimation(frames, numKeyframes) {
    let result = [];
    let costs = [];
    result.push(0);
    costs.push(Infinity);
    for (let i = 1; i < frames.length-1; i++) {
        result.push(i);
        costs.push(frameDistanceTemporal(frames[i-1], frames[i+1], i-1, i+1));
    }
    result.push(frames.length-1);
    costs.push(Infinity);
    for (let i = 0; i < frames.length-numKeyframes; i++) {
        let minId = 0;
        let min = Infinity;
        for (let j = 0; j < result.length; j++) {
            let cost = costs[result[j]];
            if (cost < min) {
                min = cost;
                minId = j;
            }
        }
        result.splice(minId, 1);
        if (result[minId-1] > 0) {
            costs[result[minId-1]] = frameDistanceTemporal(frames[result[minId-2]], frames[result[minId]], result[minId-2], result[minId]);
        }
        if (result[minId] < frames.length-1) {
            costs[result[minId]] = frameDistanceTemporal(frames[result[minId-1]], frames[result[minId+1]], result[minId-1], result[minId+1]);
        }
    }
    return result;
}

function findKeyframesLowe(frames, numKeyframes) {
    let result = [0, frames.length-1];
    for (let k = 0; k < numKeyframes-2; k++) {
        let dmax = 0;
        let index = 0;
        let pos = 1;
        for (let i = 1; i < frames.length-1; i++) {
            if (result[pos] <= i) {
                pos++;
            }
            const frame = frames[i];
            let pa = frameSubtract(frame, frames[result[pos-1]]);
            let ba = frameSubtract(frames[result[pos-1]], frames[result[pos]]);
            let t = frameDot(pa, ba)/frameDot(ba, ba);
            let d = frameLength(frameSubtract(pa, frameScale(ba, t)));
            if (dmax < d) {
                dmax = d;
                index = i;
            }
        }
        result.push(index);
        result = result.sort((a, b) => a-b);
    }
    return result.sort((a, b) => a-b);
}

function getFillKeyframes(frames, keyframes) {
    let numKeyframes = keyframes.length;
    let result = [];
    let helpKeyframes = keyframes.slice();
    for (let i = 1; i < helpKeyframes.length; i++) {
        let aWidth = findMaximumsFromFrame(frames[helpKeyframes[i]]).x-findMinimumsFromFrame(frames[helpKeyframes[i]]).x;
        let bWidth = findMaximumsFromFrame(frames[helpKeyframes[i-1]]).x-findMinimumsFromFrame(frames[helpKeyframes[i-1]]).x;
        let width = Math.max(aWidth, bWidth);
        let space = ((helpKeyframes[i]-helpKeyframes[i-1])/frames.length)*sceneWidth-width-2;
        if (space > width) {
            let element = Math.round((helpKeyframes[i]+helpKeyframes[i-1])/2);
            helpKeyframes.splice(i, 0, element);
            result.push(element);
            i--;
        }
    }
    return result.sort((a, b) => a-b);
}

function sortedIndex(array, value) {
    let low = 0;
    let high = array.length;
    while (low < high) {
        var mid = Math.floor((low + high)/2);
        if (array[mid] < value) {
            low = mid + 1;
        }
        else {
            high = mid;
        }
    }
    return low;
}

function findMapScale(frames, numKeyframes, figureScale, mapWidth) {
    let framesMin = findSequenceMinimums(frames, numKeyframes);
    let framesMax = findSequenceMaximums(frames, numKeyframes);
    let maxWidth = Math.max(framesMax.x-framesMin.x, framesMax.z-framesMin.z);
    let mapScale = 100*figureScale;
    mapScale = Math.floor(maxWidth/5)*10+10;
    return mapScale;
}

function findOptimalRotation(frames, numSamples) {
    numSamples = numSamples-1;
    let framesMin = findMinimumsFromFrame(frames[0]);
    let framesMax = findMaximumsFromFrame(frames[0]);
    let distMax = 0;
    let distIndex = 0;
    for (let i = 1; i < numSamples+1; i++) {
        let index = Math.floor((i/numSamples)*frames.length);
        if (index == frames.length) {
            index = index-1;
        }
        let min = findMinimumsFromFrame(frames[index]);
        if (framesMin.x > min.x) {
            framesMin.x = min.x;
        }
        if (framesMin.y > min.y) {
            framesMin.y = min.y;
        }
        if (framesMin.z > min.z) {
            framesMin.z = min.z;
        }
        let max = findMaximumsFromFrame(frames[index]);
        if (framesMax.x < max.x) {
            framesMax.x = max.x;
        }
        if (framesMax.y < max.y) {
            framesMax.y = max.y;
        }
        if (framesMax.z < max.z) {
            framesMax.z = max.z;
        }
        let distance = vecXZDistance(frames[0][0], frames[index][0]);
        if (distance > distMax) {
            distIndex = index;
            distMax = distance;
        }
    }
    let vec = {x:frames[distIndex][0].x-frames[0][0].x, y: frames[distIndex][0].y-frames[0][0].y, z: frames[distIndex][0].z-frames[0][0].z};
    let a = framesMax.x-framesMin.x;
    let b = framesMax.z-framesMin.z;
    let c = Math.sqrt(a**2+b**2);
    if (distMax > (framesMax.y-framesMin.y)/2 && ((vec.x > 0 && vec.z < 0) || (vec.x < 0 && vec.z > 0))) {
        return -Math.asin(b/c);
    } else {
        return Math.asin(b/c);
    }
}

function checkSequenceNeedsFlip(frames, drawStyle) {
    let nose = calculateNoseVector(frames[0][drawStyle.headJointIndex], frames[0][drawStyle.thoraxIndex], frames[0][drawStyle.leftArmIndex]);
    nose.y = 0;
    nose.normalize();
    return nose.dot(new THREE.Vector3(Math.sqrt(2)/2, 0, Math.sqrt(2)/2)) < 0;
}

function findSequenceMinimums(frames, numSamples) {
    let framesMin = findMinimumsFromFrame(frames[0]);
    for (let i = 1; i < numSamples+1; i++) {
        let index = Math.floor((i/numSamples)*frames.length);
        if (index == frames.length) {
            index = index-1;
        }
        let min = findMinimumsFromFrame(frames[index]);
        if (framesMin.x > min.x) {
            framesMin.x = min.x;
        }
        if (framesMin.y > min.y) {
            framesMin.y = min.y;
        }
        if (framesMin.z > min.z) {
            framesMin.z = min.z;
        }
    }
    return framesMin;
}

function findSequenceMaximums(frames, numSamples) {
    let framesMax = findMaximumsFromFrame(frames[0]);
    for (let i = 1; i < numSamples+1; i++) {
        let index = Math.floor((i/numSamples)*frames.length);
        if (index == frames.length) {
            index = index-1;
        }
        let max = findMaximumsFromFrame(frames[index]);
        if (framesMax.x < max.x) {
            framesMax.x = max.x;
        }
        if (framesMax.y < max.y) {
            framesMax.y = max.y;
        }
        if (framesMax.z < max.z) {
            framesMax.z = max.z;
        }
    }
    return framesMax;
}

function findOptimalScale(frames, width, height, numFrames) {
    let maximums = findMaximumsFromFrame(frames[0]);
    let minimums = findMinimumsFromFrame(frames[0]);
    let maxWidth = maximums.x-minimums.x;
    for (let i = 0; i < numFrames; i++) {
        let index = Math.floor((i/numFrames)*frames.length);
        let max = findMaximumsFromFrame(frames[index]);
        let min = findMinimumsFromFrame(frames[index]);
        maximums.y = Math.max(maximums.y, max.y);
        minimums.y = Math.min(minimums.y, min.y);
        maxWidth = Math.max(maximums.x-minimums.x, maxWidth);
    }
    let maxHeight = maximums.y-minimums.y;
    let scaleHeight = (height)/(maxHeight);
    let scaleWidth = (width/(numFrames))/(maxWidth);
    if (scaleHeight < 0 && scaleWidth < 0) {
        return 1;
    } else if (scaleHeight < 0) {
        return scaleWidth;
    } else if (scaleWidth < 0) {
        return scaleHeight;
    }
    return Math.min(scaleHeight, scaleWidth);
}

function findMeterConversion(sequences, actorHeight) {
    let heights = [];
    let maxHeight = 0;
    for (let i = 0; i < sequences.length; i++) {
        let frames = processSequenceToFrames(sequences[i], 0, 1);
        if (frames.length == 0) {
            frames = processSequenceToFrames2d(sequences[i], 0, 1);
        }
        let maximums = findMaximumsFromFrame(frames[0]);
        let minimums = findMinimumsFromFrame(frames[0]);
        let height = maximums.y-minimums.y;
        heights.push(height);
        if (maxHeight < height) {
            maxHeight = height;
        }
    }
    heights.sort((a, b) => a - b);
    console.log(heights);
    return actorHeight/heights[Math.round(heights.length/2)-1];
}

function frameSubtract(a, b) {
    let result = [];
    for (let i = 0; i < a.length; i++) {
        result[i] = {x: a[i].x-b[i].x, y: a[i].y-b[i].y, z: a[i].z-b[i].z};
    }
    return result;
}

function frameLength(a) {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result += (a[i].x*a[i].x)+(a[i].y*a[i].y)+(a[i].z*a[i].z);
    }
    return Math.sqrt(result);
}

function frameDot(a, b) {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result += (a[i].x*b[i].x)+(a[i].y*b[i].y)+(a[i].z*b[i].z);
    }
    return result;
}

function frameScale(a, scale) {
    let result = [];
    for (let i = 0; i < a.length; i++) {
        result[i] = {x: a[i].x*scale, y: a[i].y*scale, z: a[i].z*scale};
    }
    return result;
}

function frameDistance(a, b) {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result += (a[i].x-b[i].x)*(a[i].x-b[i].x)+(a[i].y-b[i].y)*(a[i].y-b[i].y)+(a[i].z-b[i].z)*(a[i].z-b[i].z);
    }
    return Math.sqrt(result);
}

function frameDistanceTemporal(a, b, aFrame, bFrame) {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result += (a[i].x-b[i].x)*(a[i].x-b[i].x)+(a[i].y-b[i].y)*(a[i].y-b[i].y)+(a[i].z-b[i].z)*(a[i].z-b[i].z);
    }
    return result + 2*Math.pow(Math.abs(aFrame-bFrame), 3);
}

function frameCosineSimilarity(a, b, c) {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result += (b[i].x-a[i].x)*(c[i].x-a[i].x)+(b[i].y-a[i].y)*(c[i].y-a[i].y)+(b[i].z-a[i].z)*(c[i].z-a[i].z);
    }
    return result/(frameDistance(a, b)*frameDistance(a, c));
}

function vecXZDistance(a, b) {
    return Math.sqrt((a.x-b.x)*(a.x-b.x)+(a.z-b.z)*(a.z-b.z));
}

function frameRotateY(frame, rad) {
    let newFrame = [];
    for (let i = 0; i < frame.length; i++) {
        newFrame[i] = {
            x: frame[i].z*Math.sin(rad) + frame[i].x*Math.cos(rad),
            y: frame[i].y,
            z: frame[i].z*Math.cos(rad) - frame[i].x*Math.sin(rad)
        };
    }
    return newFrame;
}

function moveOriginXBy(frame, xMove) {
    let newFrame = [];
    for (let i = 0; i < frame.length; i++) {
        newFrame[i] = {x:frame[i].x-xMove, y:frame[i].y, z:frame[i].z};
    }
    return newFrame;
}

function clearCanvas(canvas) {
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function clamp(a, b, value) {
    if (value < a) {
        return a;
    } else if (value > b) {
        return b;
    } else {
        return value;
    }
}

function lerpFrame(a, b, value) {
    let result = [];
    for (let i = 0; i < a.length; i++) {
        result[i] = {x: lerp(a[i].x, b[i].x, value), y: lerp(a[i].y, b[i].y, value), z: lerp(a[i].z, b[i].z, value)};
    }
    return result;
}

function lerp(a, b, value) {
    return (b-a)*value+a;
}

function inverseLerp(a, b, value) {
    return (value-a)/(b-a);
}

function hue2rgb(p, q, t){
    if(t < 0) t += 1;
    if(t > 1) t -= 1;
    if(t < 1/6) return p + (q - p) * 6 * t;
    if(t < 1/2) return q;
    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
}

//h, s, and l are in <0, 1>
function hslToRgb(h, s, l){
    let r;
    let g;
    let b;
    if(s == 0){
        r = g = b = l;
    } else {
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return {r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a: 1};
}

function scaleRgbaColor(rgba, scalar) {
    let result = {r:clamp(0, 255, rgba.r*scalar), g:clamp(0, 255, rgba.g*scalar), b:clamp(0, 255, rgba.b*scalar), a:rgba.a};
    return result;
}

function rgbaToColorString(rgba) {
    return "rgba("+Math.floor(rgba.r)+","+Math.floor(rgba.g)+","+Math.floor(rgba.b)+","+rgba.a+")";
}

function drawRectangle(ctx, a, b, radius, xShift, yShift) {
    let normal = {x:a.y-b.y, y:-(a.x-b.x)};
    let magnitude = Math.sqrt(normal.x**2+normal.y**2);
    normal.x = normal.x/magnitude;
    normal.y = normal.y/magnitude;
    ctx.beginPath();
    ctx.moveTo(a.x+radius*normal.x+xShift, a.y+radius*normal.y+yShift);
    ctx.lineTo(b.x+radius*normal.x+xShift, b.y+radius*normal.y+yShift);
    ctx.lineTo(b.x-radius*normal.x+xShift, b.y-radius*normal.y+yShift);
    ctx.lineTo(a.x-radius*normal.x+xShift, a.y-radius*normal.y+yShift);
    ctx.lineTo(a.x+radius*normal.x+xShift, a.y+radius*normal.y+yShift);
    ctx.closePath();
    ctx.fill();
}

export {loadDataFromString, getSequenceLength, getSequenceCategory, visualizeToCanvas, createVisualizationElement, createZoomableVisualizationElement, KeyframeSelectionAlgorithmEnum, createAnimationElement};
export * from './model.js';
