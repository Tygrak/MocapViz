import * as THREE from './lib/three.module.js';
import * as Model from './model.js';
import * as Core from './mocapCore.js';
import {OrbitControls} from './lib/OrbitControls.js';

let mainRenderer = null;
const sceneWidth = 100;

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

//(sequence, model, numKeyframes, numBlurFrames, 
//mapWidth, mapHeight, visualizationWidth, visualizationHeight, 
//addTimeScale = false, addFillingKeyframes = true, keyframeSelectionAlgorithm = 4, labelFrames = true, useTrueTime = true

class VisualizationFactory {
    constructor () {
        this.addFillingKeyframes = true;
        this.addTimeScale = false;
        this.keyframeSelectionAlgorithm = Core.KeyframeSelectionAlgorithmEnum.Decimation;
        this.labelFrames = true;
        this.useTrueTime = true;
        this.createZoomable = true;
        this.model = Model.modelVicon;
        this.jointStyle = Model.jointStyleDefault;
        this.boneStyle = Model.boneStyleDefault;
        this.leftBoneStyle = Model.leftBoneStyleDefault;
        this.rightBoneStyle = Model.rightBoneStyleDefault;
        this.noseStyle = Model.noseStyleDefault;
        this.jointRadius = 0;
        this.boneRadius = 0.725;
        this.headRadius = 1.5;
        this.noseRadius = 0.9;
        this.opacity = 1;
        this.blurFrameOpacity = 0.125;
        this.numKeyframes = 10;
        this.numBlurFrames = 10;
        this.numZoomedKeyframes = 12;
    }

    createVisualization(sequence, visualizationWidth = 850, visualizationHeight = 150, mapWidth = 150, mapHeight = 150) {
        let drawStyle = new Core.MocapDrawStyle(this.model, this.boneRadius, this.jointRadius, this.headRadius, this.boneStyle,
            this.leftBoneStyle, this.rightBoneStyle, this.jointStyle, 1, this.noseStyle, this.noseRadius, this.opacity);
        let drawStyleBlur = new Core.MocapDrawStyle(this.model, this.boneRadius, this.jointRadius, this.headRadius, this.boneStyle,
            this.boneStyle, this.boneStyle, this.jointStyle, 1, this.boneStyle, this.noseRadius, this.blurFrameOpacity);
        let visualization;
        if (this.createZoomable && this.numZoomedKeyframes > 1) {
            visualization = createZoomableVisualizationElementCustom(sequence, this.model, this.numKeyframes, 
                this.numZoomedKeyframes, this.numBlurFrames, mapWidth, mapHeight, visualizationWidth, visualizationHeight,
                drawStyle, drawStyleBlur, this.addTimeScale, this.addFillingKeyframes, this.keyframeSelectionAlgorithm, 
                this.labelFrames, this.useTrueTime);
        } else {
            visualization = createVisualizationElementCustom(sequence, this.model, this.numKeyframes, 
                this.numBlurFrames, mapWidth, mapHeight, visualizationWidth, visualizationHeight,
                drawStyle, drawStyleBlur, this.addTimeScale, this.addFillingKeyframes, this.keyframeSelectionAlgorithm, 
                this.labelFrames, this.useTrueTime);
        }
        return visualization;
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
    let nose = createBoxLine(new THREE.Vector3(), new THREE.Vector3(), Core.rgbaToColorString(drawStyle.noseStyle), 0.5);
    let head = new THREE.Mesh(
        new THREE.SphereGeometry(1, 32, 32), 
        new THREE.MeshBasicMaterial({color: new THREE.Color(Core.rgbaToColorString(drawStyle.jointStyle))}));
    head.scale.set(drawStyle.headRadius, drawStyle.headRadius, drawStyle.headRadius);
    let modelBones = drawStyle.bonesModel.slice();
    let bones = [];
    for (let i = 0; i < modelBones.length; i++) {
        let color = Core.rgbaToColorString(drawStyle.boneStyle);
        if (modelBones[i].type == Model.BoneType.rightHand || modelBones[i].type == Model.BoneType.rightLeg) {
            color = Core.rgbaToColorString(drawStyle.rightBoneStyle);
        } else if (modelBones[i].type == Model.BoneType.leftHand || modelBones[i].type == Model.BoneType.leftLeg) {
            color = Core.rgbaToColorString(drawStyle.leftBoneStyle);
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
            new THREE.SphereBufferGeometry(1, 32, 32), 
            new THREE.MeshBasicMaterial({color: new THREE.Color(Core.rgbaToColorString(drawStyle.jointStyle))}));
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

function resizeSkeleton(skeleton, drawStyle, figureScale) {
    skeleton.nose.scale.x = drawStyle.noseRadius*figureScale;
    skeleton.nose.scale.y = drawStyle.noseRadius*figureScale;
    skeleton.head.scale.set(figureScale*drawStyle.headRadius, figureScale*drawStyle.headRadius, figureScale*drawStyle.headRadius);
    let bones = drawStyle.bonesModel;
    for (let i = 0; i < bones.length; i++) {
        skeleton.bones[i].scale.x = drawStyle.boneRadius*figureScale;
        skeleton.bones[i].scale.y = drawStyle.boneRadius*figureScale;
    }
}

function modifySkeletonToFrame(skeleton, frame, drawStyle, xShift, yShift, figureScale) {
    let vecNose = calculateNoseVector(frame[drawStyle.headIndex], frame[drawStyle.thoraxIndex], frame[drawStyle.leftArmIndex], 6*figureScale);
    let nosePos = new THREE.Vector3(frame[drawStyle.headIndex].x+vecNose.x+xShift, frame[drawStyle.headIndex].y+vecNose.y+yShift, frame[drawStyle.headIndex].z+vecNose.z);
    moveBoxLine(skeleton.nose, nosePos, new THREE.Vector3(frame[drawStyle.headIndex].x+xShift, frame[drawStyle.headIndex].y+yShift, frame[drawStyle.headIndex].z));
    skeleton.nose.material.color.setRGB(drawStyle.noseStyle.r/255, drawStyle.noseStyle.g/255, drawStyle.noseStyle.b/255);
    skeleton.head.position.set(frame[drawStyle.headIndex].x+xShift, frame[drawStyle.headIndex].y+yShift, frame[drawStyle.headIndex].z);
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

function drawSequence(mocapRenderer, frames, indexes, numBlurPositions, drawStyle, drawStyleBlur, figureScale, yShift = 0, clear = true, useTrueTime = true) {
    if (clear) {
        clearRenderer(mocapRenderer);
    }
    let firstFrame = Core.moveOriginXBy(frames[0], frames[0][0].x);
    let minimumsFirst = Core.findMinimumsFromFrame(firstFrame);
    let maximumsFirst = Core.findMaximumsFromFrame(firstFrame);
    let lastFrame = Core.moveOriginXBy(frames[frames.length-1], frames[frames.length-1][0].x);
    let minimumsLast = Core.findMinimumsFromFrame(lastFrame);
    let maximumsLast = Core.findMaximumsFromFrame(lastFrame);
    let sequenceMaximums = Core.findSequenceMaximums(frames, indexes.length);
    let widthFirst = maximumsFirst.x-minimumsFirst.x;
    let widthLast = maximumsLast.x-minimumsLast.x;
    sequenceMaximums.y = sequenceMaximums.y-3;
    let xPositions = [];
    for (let i = 0; i < indexes.length; i++) {
        let coreX = frames[indexes[i]][0].x;
        let xShift = (indexes[i]/frames.length)*(98-widthFirst/2-widthLast/2)+widthFirst/2+0.5;
        if (!useTrueTime) {
            xShift = (i/(indexes.length-1))*(98-widthFirst/2-widthLast/2)+widthFirst/2+0.5;
        }
        for (let j = 1; j < numBlurPositions+1; j++) {
            if (indexes[i]-j < 0) {
                continue;
            }
            drawFrame(mocapRenderer, Core.moveOriginXBy(frames[indexes[i]-j], coreX), figureScale, xShift, yShift, drawStyleBlur, false);
        }
        drawFrame(mocapRenderer, Core.moveOriginXBy(frames[indexes[i]], coreX), figureScale, xShift, yShift, drawStyle, false);
        xPositions.push(xShift);
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
    
    let camera = new THREE.OrthographicCamera(-sceneWidth/2, sceneWidth/2, (sceneWidth/2)/ratio, -(sceneWidth/2)/ratio, 0.1, 1000);
    camera.position.set(sceneWidth/2, (sceneWidth/2)/ratio, sceneWidth);
    camera.lookAt(sceneWidth/2, (sceneWidth/2)/ratio, 0);
    let skeleton = createSkeleton(drawStyle);
    scene.add(skeleton.group);
    return new MocapRenderer(canvas, renderer, camera, skeleton, scene);
}

function resizeMocapRenderer(mocapRenderer, width, height) {
    mocapRenderer.renderer.setSize(width, height);
    let ratio = width/height;
    let camera = new THREE.OrthographicCamera(-sceneWidth/2, sceneWidth/2, (sceneWidth/2)/ratio, -(sceneWidth/2)/ratio, 0.1, 1000);
    camera.position.set(sceneWidth/2, (sceneWidth/2)/ratio, sceneWidth);
    camera.lookAt(sceneWidth/2, (sceneWidth/2)/ratio, 0);
    mocapRenderer.camera = camera;
}

function createZoomableVisualizationElement(sequence, model, numKeyframes, zoomedNumKeyframes, numBlurFrames, mapWidth, mapHeight, visualizationWidth, visualizationHeight, addTimeScale = false, addFillingKeyframes = true, keyframeSelectionAlgorithm = 4, labelFrames = true, useTrueTime = true) {
    let drawStyle = new Core.MocapDrawStyle(model, 0.725, 0,
        1.5, Model.boneStyleDefault, Model.leftBoneStyleDefault, Model.rightBoneStyleDefault, Model.jointStyleDefault, 1, Model.noseStyleDefault, 0.9, 1);
    let drawStyleBlur = new Core.MocapDrawStyle(model, 0.725, 0,
        1.5, Model.blurStyleDefault, Model.blurStyleDefault, Model.blurStyleDefault, Model.blurStyleDefault, 1, Model.blurStyleDefault, 0.9, 0.125);
    return createZoomableVisualizationElementCustom(sequence, model, numKeyframes, zoomedNumKeyframes, numBlurFrames, mapWidth, mapHeight, visualizationWidth, 
        visualizationHeight, drawStyle, drawStyleBlur, addTimeScale, addFillingKeyframes, keyframeSelectionAlgorithm, labelFrames, useTrueTime);
}

function createZoomableVisualizationElementCustom(sequence, model, numKeyframes, zoomedNumKeyframes, numBlurFrames, mapWidth, mapHeight, visualizationWidth, visualizationHeight, drawStyle, drawStyleBlur, addTimeScale = false, addFillingKeyframes = true, keyframeSelectionAlgorithm = 4, labelFrames = true, useTrueTime = true) {
    let main = createVisualizationElementCustom(sequence, model, numKeyframes, numBlurFrames, mapWidth, mapHeight, visualizationWidth, visualizationHeight, drawStyle, drawStyleBlur, addTimeScale, addFillingKeyframes, keyframeSelectionAlgorithm, labelFrames, useTrueTime);
    let zoomWidth = Math.floor(document.body.clientWidth-document.body.clientWidth/24);
    let zoomHeight = Math.floor(document.body.clientHeight*0.6-document.body.clientWidth/16);
    let bg = document.createElement("div");
    let zoomed = createVisualizationElementCustom(sequence, model, zoomedNumKeyframes, numBlurFrames, 0, 0, zoomWidth, zoomHeight, drawStyle, drawStyleBlur, addTimeScale, addFillingKeyframes, keyframeSelectionAlgorithm, labelFrames, useTrueTime);
    zoomed.style = "z-index: 9999; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; border: 2px solid black; display: block;";
    zoomed.style.backgroundColor = "white";
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
    if (mapWidth > 0 && mapHeight > 0) {
        main.children[1].onclick = fun;
    }
    bg.appendChild(zoomed);
    main.appendChild(bg);
    return main;
}

function visualizeToCanvas(canvas, sequence, model, numKeyframes, numBlurFrames, width, height, addTimeScale = false, addFillingKeyframes = true, keyframeSelectionAlgorithm = 4) {
    let drawStyle = new Core.MocapDrawStyle(model, 0.725, 0,
        1.5, Model.boneStyleDefault, Model.leftBoneStyleDefault, Model.rightBoneStyleDefault, Model.jointStyleDefault, 1, Model.noseStyleDefault, 0.9, 1);
    let drawStyleBlur = new Core.MocapDrawStyle(model, 0.725, 0,
        1.5, Model.blurStyleDefault, Model.blurStyleDefault, Model.blurStyleDefault, Model.blurStyleDefault, 1, Model.blurStyleDefault, 0.9, 0.125);
    let mocapRenderer = initializeMocapRenderer(canvas, width, height, drawStyle);
    let processed = Core.processSequence(sequence, numKeyframes, sceneWidth, width, height, drawStyle);
    let figureScale = processed.figureScale;
    let frames = processed.frames;
    let keyframes = findKeyframes(frames, numKeyframes, keyframeSelectionAlgorithm);
    if (addFillingKeyframes) {
        let fillKeyframes = Core.getFillKeyframes(frames, keyframes, sceneWidth);
        let fillStyle = new Core.MocapDrawStyle(model, 0.725, 0,
            1.5, Model.boneStyleDefault, Model.leftBoneStyleDefault, Model.rightBoneStyleDefault, Model.jointStyleDefault, 1, Model.noseStyleDefault, 0.9, 0.4);
        drawSequence(mocapRenderer, frames, fillKeyframes, 0, fillStyle, drawStyleBlur, figureScale, 0, true);
    }
    drawSequence(mocapRenderer, frames, keyframes, numBlurFrames, drawStyle, drawStyleBlur, figureScale, 0, false);
    if (addTimeScale) {
        drawTimeScale(mocapRenderer, mocapRenderer.camera.right-mocapRenderer.camera.left, mocapRenderer.camera.top-mocapRenderer.camera.bottom, model.fps, frames.length, keyframes);
    }
}

function createVisualizationElement(sequence, model, numKeyframes, numBlurFrames, mapWidth, mapHeight, visualizationWidth, visualizationHeight, addTimeScale = false, addFillingKeyframes = true, keyframeSelectionAlgorithm = 4, labelFrames = true, useTrueTime = true) {
    let drawStyle = new Core.MocapDrawStyle(model, 0.725, 0,
        1.5, Model.boneStyleDefault, Model.leftBoneStyleDefault, Model.rightBoneStyleDefault, Model.jointStyleDefault, 1, Model.noseStyleDefault, 0.9, 1);
    let drawStyleBlur = new Core.MocapDrawStyle(model, 0.725, 0,
        1.5, Model.blurStyleDefault, Model.blurStyleDefault, Model.blurStyleDefault, Model.blurStyleDefault, 1, Model.blurStyleDefault, 0.9, 0.125);
    return createVisualizationElementCustom(sequence, model, numKeyframes, numBlurFrames, mapWidth, mapHeight, visualizationWidth, 
        visualizationHeight, drawStyle, drawStyleBlur, addTimeScale, addFillingKeyframes, keyframeSelectionAlgorithm, labelFrames, useTrueTime);
}

function createVisualizationElementCustom(sequence, model, numKeyframes, numBlurFrames, mapWidth, mapHeight, visualizationWidth, visualizationHeight, drawStyle, drawStyleBlur, addTimeScale = false, addFillingKeyframes = true, keyframeSelectionAlgorithm = 4, labelFrames = true, useTrueTime = true) {
    if (mainRenderer == null || mainRenderer.skeleton.model != model.bonesModel) {
        let canvas = document.createElement("canvas");
        mainRenderer = initializeMocapRenderer(canvas, visualizationWidth, visualizationHeight, drawStyle);
    } else {
        resizeMocapRenderer(mainRenderer, visualizationWidth, visualizationHeight);
    }
    let div = document.createElement("div");
    div.className = "drawItem-"+Model.motionCategories[Core.getSequenceCategory(sequence)];
    let image = document.createElement("img");
    image.className = "drawItemVisualization";
    let processed = Core.processSequence(sequence, numKeyframes, sceneWidth, visualizationWidth, visualizationHeight, drawStyle);
    let figureScale = processed.figureScale;
    let frames = processed.frames;
    resizeSkeleton(mainRenderer.skeleton, drawStyle, figureScale);
    let keyframes = findKeyframes(frames, numKeyframes, keyframeSelectionAlgorithm);
    clearRenderer(mainRenderer);
    if (addTimeScale) {
        drawTimeScale(mainRenderer, mainRenderer.camera.right-mainRenderer.camera.left, mainRenderer.camera.top-mainRenderer.camera.bottom, model.fps, frames.length, keyframes);
    }
    if (addFillingKeyframes) {
        let fillKeyframes = Core.getFillKeyframes(frames, keyframes, sceneWidth);
        let fillStyle = new Core.MocapDrawStyle(drawStyle.skeletonModel,  drawStyle.boneRadius, drawStyle.jointRadius,
            drawStyle.headRadius, drawStyle.boneStyle, drawStyle.leftBoneStyle, drawStyle.rightBoneStyle, 
            drawStyle.jointStyle, drawStyle.figureScale, drawStyle.noseStyle, drawStyle.noseRadius, 0.4);
        drawSequence(mainRenderer, frames, fillKeyframes, 0, fillStyle, drawStyleBlur, figureScale, 0, false, useTrueTime);
    }
    let positions = drawSequence(mainRenderer, frames, keyframes, numBlurFrames, drawStyle, drawStyleBlur, figureScale, 0, false, useTrueTime);
    if (mapWidth > 0 && mapHeight > 0) {
        let map = addMapToVisualization(frames, keyframes, figureScale, model, mapWidth, mapHeight);
        div.appendChild(map);
    }
    div.appendChild(image);
    image.src = mainRenderer.canvas.toDataURL("image/png");
    image.height = visualizationHeight;
    image.width = visualizationWidth;
    div.style.position = "relative";
    if (labelFrames) {
        createTextElements(positions, keyframes, image, mapWidth, div);
    }
    return div;
}

function addMapToVisualization(frames, keyframes, figureScale, model, mapWidth, mapHeight) {
    let map = document.createElement("canvas");
    map.className = "drawItemMap";
    map.width = mapWidth;
    map.height = mapHeight;
    map.style = "width: "+mapWidth+"px; height: "+mapHeight+"px;";
    let ctx = map.getContext("2d");
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.rect(0, 0, map.width, map.height);
    ctx.fill();
    let mapScale = Core.findMapScale(frames, keyframes.length, figureScale, map.width);
    let mSize = sceneWidth/(model.unitSize/figureScale);
    if (mapScale < mSize*2.5) {
        mapScale = mSize*2.5;
    }
    Core.drawTopDownMap(map, frames, keyframes, 
        {x:-1, y:-1, z:0}, 
        {x:-1, y:map.height+1, z:0}, 
        {x:map.width+1, y:map.height+1, z:0}, frames.length, mapScale, sceneWidth/(model.unitSize/figureScale), false, true, model.fps);
    return map;
}

function createTextElements(positions, keyframes, image, mapWidth, mainDiv) {
    for (let i = 0; i < positions.length; i++) {
        if ((positions[i]/100)*image.width+mapWidth+20 > mapWidth+image.width) {
            continue;
        }
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

function findKeyframes(frames, numKeyframes, keyframeSelectionAlgorithm) {
    let keyframes;
    if (keyframeSelectionAlgorithm == Core.KeyframeSelectionAlgorithmEnum.Decimation) {
        keyframes = Core.findKeyframesDecimation(frames, numKeyframes);
    } else if (keyframeSelectionAlgorithm == Core.KeyframeSelectionAlgorithmEnum.Lowe) {
        keyframes = Core.findKeyframesLowe(frames, numKeyframes);
    } else if (keyframeSelectionAlgorithm == Core.KeyframeSelectionAlgorithmEnum.Euclidean) {
        keyframes = Core.findKeyframesEuclidean(frames, numKeyframes);
    } else if (keyframeSelectionAlgorithm == Core.KeyframeSelectionAlgorithmEnum.Equidistant) {
        keyframes = Core.findKeyframesEquidistant(frames, numKeyframes);
    } else {
        keyframes = Core.findKeyframesTemporal(frames, numKeyframes);
    }
    return keyframes;
}

function createAnimationElement(sequence, model, visualizationWidth, visualizationHeight) {
    let drawStyle = new Core.MocapDrawStyle(model, 0.9, 0,
        2.25, Model.boneStyleDefault, Model.leftBoneStyleDefault, Model.rightBoneStyleDefault, Model.jointStyleDefault, 1, "rgba(192, 16, 128, 1)", 0.9, 1);
    let div = document.createElement("div");
    div.className = "drawItem-"+Model.motionCategories[Core.getSequenceCategory(sequence)];
    let canvas = document.createElement("canvas");
    canvas.className = "drawItemVisualization";
    div.appendChild(canvas);
    let mocapRenderer = initializeMocapRenderer(canvas, visualizationWidth, visualizationHeight, drawStyle);
    let processed = Core.processSequence(sequence, 12, sceneWidth, visualizationWidth, visualizationHeight, drawStyle);
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

export {VisualizationFactory, visualizeToCanvas, createVisualizationElement, createZoomableVisualizationElement, createAnimationElement};
export {loadDataFromString, loadDataFromFile, getSequenceLength, getSequenceCategory, KeyframeSelectionAlgorithmEnum} from './mocapCore.js';
export * from './model.js';
//export * from './mocapCanvas2d.js';
