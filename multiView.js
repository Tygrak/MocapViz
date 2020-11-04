let bonesVicon = [
    {a: 0, b: 1, type: BoneType.leftLeg}, {a: 1, b: 2, type: BoneType.leftLeg}, {a: 2, b: 3, type: BoneType.leftLeg}, 
    {a: 3, b: 4, type: BoneType.leftLeg}, {a: 4, b: 5, type: BoneType.leftLeg}, // leg
    {a: 0, b: 6, type: BoneType.rightLeg}, {a: 6, b: 7, type: BoneType.rightLeg}, {a: 7, b: 8, type: BoneType.rightLeg}, 
    {a: 8, b: 9, type: BoneType.rightLeg}, {a: 9, b: 10, type: BoneType.rightLeg}, // leg
    {a: 0, b: 11, type: BoneType.torso}, {a: 11, b: 12, type: BoneType.torso}, {a: 12, b: 13, type: BoneType.torso}, 
    {a: 13, b: 14, type: BoneType.torso}, {a: 14, b: 15, type: BoneType.torso}, {a: 15, b: 16, type: BoneType.torso}, // torso + head
    {a: 13, b: 17, type: BoneType.leftHand}, {a: 17, b: 18, type: BoneType.leftHand}, {a: 18, b: 19, type: BoneType.leftHand}, 
    {a: 19, b: 20, type: BoneType.leftHand}, {a: 20, b: 21, type: BoneType.leftHand}, {a: 21, b: 22, type: BoneType.leftHand}, 
    {a: 20, b: 23, type: BoneType.leftHand}, // hand
    {a: 13, b: 24, type: BoneType.rightHand}, {a: 24, b: 25, type: BoneType.rightHand}, {a: 25, b: 26, type: BoneType.rightHand}, 
    {a: 26, b: 27, type: BoneType.rightHand}, {a: 27, b: 28, type: BoneType.rightHand}, {a: 28, b: 29, type: BoneType.rightHand}, 
    {a: 27, b: 30, type: BoneType.rightHand} // hand
]; //head = 16, origin = 0
let bonesKinect = [
    {a: 0, b: 1, type: BoneType.torso}, {a: 1, b: 20, type: BoneType.torso}, {a: 20, b: 2, type: BoneType.torso}, {a: 2, b: 3, type: BoneType.torso},
    {a: 20, b: 4, type: BoneType.leftHand}, {a: 4, b: 5, type: BoneType.leftHand}, {a: 5, b: 6, type: BoneType.leftHand}, {a: 6, b: 7, type: BoneType.leftHand},
    {a: 20, b: 8, type: BoneType.rightHand}, {a: 8, b: 9, type: BoneType.rightHand}, {a: 9, b: 10, type: BoneType.rightHand}, {a: 10, b: 11, type: BoneType.rightHand},
    {a: 0, b: 12, type: BoneType.leftLeg}, {a: 12, b: 13, type: BoneType.leftLeg}, {a: 13, b: 14, type: BoneType.leftLeg}, {a: 14, b: 15, type: BoneType.leftLeg},
    {a: 0, b: 16, type: BoneType.rightLeg}, {a: 16, b: 17, type: BoneType.rightLeg}, {a: 17, b: 18, type: BoneType.rightLeg}, {a: 18, b: 19, type: BoneType.rightLeg},
    {a: 7, b: 21, type: BoneType.leftHand}, {a: 7, b: 22, type: BoneType.leftHand}, 
    {a: 11, b: 23, type: BoneType.rightHand}, {a: 11, b: 24, type: BoneType.rightHand},
]; //head = 3, origin = 0
let bonesKinect2d = [
    {a: 0, b: 1, type: BoneType.leftLeg}, {a: 1, b: 2, type: BoneType.leftLeg}, {a: 2, b: 6, type: BoneType.leftLeg},  // leg
    {a: 3, b: 4, type: BoneType.rightLeg}, {a: 4, b: 5, type: BoneType.rightLeg}, {a: 3, b: 6, type: BoneType.rightLeg}, // leg
    {a: 6, b: 7, type: BoneType.torso}, {a: 7, b: 8, type: BoneType.torso}, {a: 8, b: 9, type: BoneType.torso}, // torso + head
    {a: 7, b: 12, type: BoneType.leftHand}, {a: 12, b: 11, type: BoneType.leftHand}, {a: 11, b: 10, type: BoneType.leftHand}, // hand
    {a: 7, b: 13, type: BoneType.rightHand}, {a: 13, b: 14, type: BoneType.rightHand}, {a: 14, b: 15, type: BoneType.rightHand} // hand
]; //head = 9, origin = 6


let figureScale = 8;
let defaultHeight = 150;
let defaultWidth = 1000;
let headRadius = 18;
let jointRadius = 0;
let boneRadius = 2;
let numPositions = 8;
let numBlurPositions = 10;
let jointStyle = {r:0, g:0, b:0, a:1};
let boneStyle = {r:0, g:0, b:0, a:1};
let leftBoneStyle = {r:128, g:0, b:0, a:1};
let rightBoneStyle = {r:0, g:0, b:128, a:1};
let blurStyle = {r:0, g:0, b:0, a:0.1};
let sequences = [];
let headJointIndex = 16;
let drawStyle = new MocapDrawStyle(bonesVicon, headJointIndex, boneRadius, jointRadius, headRadius, boneStyle, leftBoneStyle, rightBoneStyle, jointStyle);
let drawStyleBlur = new MocapDrawStyle(bonesVicon, headJointIndex, boneRadius, jointRadius, headRadius, blurStyle, blurStyle, blurStyle, blurStyle);

const availableSequencesText = document.getElementById("availableSequencesText");
const sequenceNumberInput = document.getElementById("sequenceNumberInput");
const sequenceInputLoadButton = document.getElementById("sequenceInputLoadButton");
const dataFileInput = document.getElementById("dataFileInput");
const dataTextInput = document.getElementById("dataTextInput");
const numSequencesInput = document.getElementById("numSequencesInput");
const numFramesInput = document.getElementById("numFramesInput");
const yRotationInput = document.getElementById("yRotationInput");
const loadButton = document.getElementById("dataInputLoadButton");
const loadTextButton = document.getElementById("dataTextLoadButton");
const bonesModelInput = document.getElementById("bonesModelInput");
const scaleInput = document.getElementById("scaleInput");
const autorotateInput = document.getElementById("autorotateInput");
const autoscaleInput = document.getElementById("autoscaleInput");
const mapPerSequenceInput = document.getElementById("mapsPerSequenceInput");
const mapsParallelogramInput = document.getElementById("mapsParallelogramInput");
loadButton.onclick = loadDataFile;
loadTextButton.onclick = loadDataText;
sequenceInputLoadButton.onclick = drawSequenceMain;
const drawContainer = document.getElementById("drawContainer");
let defaultScale = 1;

//const queryString = window.location.search;
//console.log(queryString);
//const urlParams = new URLSearchParams(queryString);

loadDataFile();

function loadDataFile() {
    if (dataFileInput.files.length == 0) {
        return;
    } 
    let reader = new FileReader();
    reader.onload = function (textResult) {
        let text = textResult.target.result;
        sequences = text.split("#objectKey").filter((s) => {return s != "";});
        availableSequencesText.innerText = sequences.length;
    }
    reader.readAsText(dataFileInput.files[0], "UTF-8");
}

function loadDataText() {
    if (dataTextInput.value.length == 0) {
        return;
    } 
    sequences = dataTextInput.value.split("#objectKey").filter((s) => {return s != "";});
    availableSequencesText.innerText = sequences.length;
}

function processSelectedSequence(selectedSequence, canvas) {
    figureScale = parseFloat(scaleInput.value);
    numPositions = parseInt(numFramesInput.value);
    if (bonesModelInput.value == "Vicon") {
        defaultScale = 8;
        drawStyle.bonesModel = bonesVicon;
        drawStyle.headJointIndex = 16;
        drawStyleBlur.bonesModel = bonesVicon;
        drawStyleBlur.headJointIndex = 16;
    } else if (bonesModelInput.value == "Kinect") {
        defaultScale = 180;
        drawStyle.bonesModel = bonesKinect;
        drawStyle.headJointIndex = 3;
        drawStyleBlur.bonesModel = bonesKinect;
        drawStyleBlur.headJointIndex = 3;
    } else if (bonesModelInput.value == "Kinect2d") {
        defaultScale = 0.6;
        drawStyle.bonesModel = bonesKinect2d;
        drawStyle.headJointIndex = 9;
        drawStyleBlur.bonesModel = bonesKinect2d;
        drawStyleBlur.headJointIndex = 9;
    }
    let frames = processSequenceToFrames(sequences[selectedSequence], canvas.height, figureScale*defaultScale);
    if (autoscaleInput.checked) {
        if (frames.length == 0) {
            frames = processSequenceToFrames2d(sequences[selectedSequence], canvas.height, figureScale*defaultScale);
            figureScale = figureScale*findOptimalScale(frames, canvas, numPositions);
            frames = processSequenceToFrames2d(sequences[selectedSequence], canvas.height, figureScale*defaultScale);
        } else {
            figureScale = figureScale*findOptimalScale(frames, canvas, numPositions);
            frames = processSequenceToFrames(sequences[selectedSequence], canvas.height, figureScale*defaultScale);
        }
        scaleInput.value = figureScale;
    } else {
        if (frames.length == 0) {
            frames = processSequenceToFrames2d(sequences[selectedSequence], canvas.height, figureScale*defaultScale);
        }
    }
    drawStyle.boneRadius = boneRadius*figureScale;
    drawStyleBlur.boneRadius = boneRadius*figureScale;
    if (figureScale < 0.5) {
        drawStyle.headRadius = headRadius*figureScale*0.75;
        drawStyleBlur.headRadius = headRadius*figureScale*0.75;
    } else {
        drawStyle.headRadius = headRadius*figureScale;
        drawStyleBlur.headRadius = headRadius*figureScale;
    }
    if (autorotateInput.checked) {
        let bestRotation = findBestRotation(frames, numPositions);
        yRotationInput.value = bestRotation*57.29578778556937;
    }
    let yRotation = parseFloat(yRotationInput.value)*0.01745329;
    for (let i = 0; i < frames.length; i++) {
        frames[i] = frameRotateY(frames[i], yRotation);
    }
    return frames;
}

function drawSequenceMain() {
    let a = performance.now();
    drawContainer.innerHTML = "";
    let numSequences = parseInt(numSequencesInput.value);
    let startSequence = parseInt(sequenceNumberInput.value);
    numSequences = Math.min(numSequences, sequences.length-startSequence);
    for (let sequence = 0; sequence < numSequences; sequence++) {
        let div = document.createElement("div");
        div.className = "drawItem";
        div.id = "drawItem-"+(startSequence+sequence);
        if (mapPerSequenceInput.checked) {
            let divMap = document.createElement("canvas");
            divMap.className = "mapDrawBox";
            divMap.width = 200;
            div.appendChild(divMap);
        }
        let divCanvas = document.createElement("canvas");
        divCanvas.className = "drawBox";
        div.appendChild(divCanvas);
        drawContainer.appendChild(div);
    }
    let canvases = document.getElementsByClassName("drawBox");
    let maps = document.getElementsByClassName("mapDrawBox");
    for (let sequence = 0; sequence < canvases.length; sequence++) {
        let selectedSequence = startSequence+sequence;
        let canvas = canvases[sequence];
        if (mapPerSequenceInput.checked) {
            canvas.width = Math.floor(canvas.parentElement.getBoundingClientRect().width)-230;
        } else {
            canvas.width = Math.floor(canvas.parentElement.getBoundingClientRect().width)-30;
        }
        canvas.height = defaultHeight;
        let frames = processSelectedSequence(selectedSequence, canvas);
        drawSequence(canvas, maps.length > 0 ? maps[sequence] : null, frames);
    }
    let b = performance.now();
    console.log("Result time ("+numSequences+" sequences):");
    console.log((b-a)+" ms");
}

function drawSequence(canvas, map, frames) {
    let keyframes = findKeyframes(frames, numPositions);
    let notKeyframes = [];
    for (let i = 0; i < keyframes.length; i++) {
        notKeyframes.push(Math.floor((i/keyframes.length)*frames.length));
    }
    drawSequenceKeyframesBlur(canvas, frames, keyframes, numBlurPositions, drawStyle, drawStyleBlur, 0, true);
    if (map != null) {
        let framesMin = findSequenceMinimums(frames, numPositions);
        let framesMax = findSequenceMaximums(frames, numPositions);
        let maxWidth = Math.max(framesMax.x-framesMin.x, framesMax.z-framesMin.z);
        let mapScale = canvas.width;
        if (maxWidth > canvas.width) {
            mapScale = canvas.width*1.5;
        } else {
            mapScale = Math.floor(maxWidth/50)*100+100;
        }
        drawMapScale(canvas, mapScale/10);
        if (mapsParallelogramInput.checked) {
            drawTopDownMapParallelogram(map, frames, keyframes, 
                {x:map.width/5, y:0, z:0}, 
                {x:0, y:map.height-0, z:0}, 
                {x:map.width-map.width/5, y:map.height-0, z:0}, frames.length, mapScale, false);
        } else {
            drawTopDownMapParallelogram(map, frames, keyframes, 
                {x:0, y:0, z:0}, 
                {x:0, y:map.height-0, z:0}, 
                {x:map.width-0, y:map.height-0, z:0}, frames.length, mapScale, false);
        }
    }
}
