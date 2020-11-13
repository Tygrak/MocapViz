
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
let leftBoneStyle = {r:144, g:0, b:0, a:1};
let rightBoneStyle = {r:0, g:0, b:144, a:1};
let blurStyle = {r:0, g:0, b:0, a:0.1};
let sequences = [];
let longestSequence = 0;
let headJointIndex = 16;
let modelFps = 120;
let drawStyle = new MocapDrawStyle(bonesVicon, headJointIndex, boneRadius, jointRadius, headRadius, boneStyle, leftBoneStyle, rightBoneStyle, jointStyle);
let drawStyleBlur = new MocapDrawStyle(bonesVicon, headJointIndex, boneRadius, jointRadius, headRadius, blurStyle, blurStyle, blurStyle, blurStyle);

const availableSequencesText = document.getElementById("availableSequencesText");
const sequenceNumberInput = document.getElementById("sequenceNumberInput");
const sequenceInputLoadButton = document.getElementById("sequenceInputLoadButton");
const dataFileInput = document.getElementById("dataFileInput");
const dataTextInput = document.getElementById("dataTextInput");
const numSequencesInput = document.getElementById("numSequencesInput");
const numSequencesPageInput = document.getElementById("numSequencesPageInput");
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
const timeScaleInput = document.getElementById("timeScaleInput");
const contentDiv = document.getElementById("content");
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

function loadModel(model) {
    defaultScale = model.defaultScale;
    modelFps = model.fps;
    drawStyle.bonesModel = model.bonesModel;
    drawStyle.headJointIndex = model.headJointIndex;
    drawStyleBlur.bonesModel = model.bonesModel;
    drawStyleBlur.headJointIndex = model.headJointIndex;
}

function processSelectedSequence(selectedSequence, canvas) {
    figureScale = parseFloat(scaleInput.value);
    numPositions = parseInt(numFramesInput.value);
    if (bonesModelInput.value == "Vicon") {
        loadModel(modelVicon);
    } else if (bonesModelInput.value == "Kinect") {
        loadModel(modelKinect);
    } else if (bonesModelInput.value == "Kinect2d") {
        loadModel(modelKinect2d);
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
    let numSequencesPerPage = parseInt(numSequencesPageInput.value);
    let startSequence = parseInt(sequenceNumberInput.value);
    numSequences = Math.min(numSequences, sequences.length-startSequence);
    for (let sequence = 0; sequence < numSequences; sequence++) {
        let div = document.createElement("div");
        div.className = "drawItem";
        div.id = "drawItem-"+(startSequence+sequence)+"-"+motionCategories[getSequenceCategory(sequences[sequence])];
        if (mapPerSequenceInput.checked) {
            let divMap = document.createElement("canvas");
            divMap.className = "mapDrawBox";
            divMap.width = 150;
            divMap.height = Math.floor((window.innerHeight-60)/numSequencesPerPage);
            div.appendChild(divMap);
        }
        let divCanvas = document.createElement("canvas");
        divCanvas.className = "drawBox";
        div.appendChild(divCanvas);
        drawContainer.appendChild(div);
    }
    let canvases = document.getElementsByClassName("drawBox");
    let maps = document.getElementsByClassName("mapDrawBox");
    let canvasWidth = mapPerSequenceInput.checked 
        ? Math.floor(canvases[0].parentElement.getBoundingClientRect().width-180)
        : Math.floor(canvases[0].parentElement.getBoundingClientRect().width-30);
    for (let sequence = 0; sequence < canvases.length; sequence++) {
        let selectedSequence = startSequence+sequence;
        let canvas = canvases[sequence];
        canvas.width = canvasWidth;
        canvas.height = Math.floor((window.innerHeight-60)/numSequencesPerPage);
        //canvas.height = defaultHeight;
        let frames = processSelectedSequence(selectedSequence, canvas);
        drawSequence(canvas, maps.length > 0 ? maps[sequence] : null, frames);
    }
    let b = performance.now();
    console.log("Result time ("+numSequences+" sequences):");
    console.log((b-a)+" ms");
}

//todo: scaling changes map scale too, which in multi view is broken
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
                {x:-1, y:-1, z:0}, 
                {x:-1, y:map.height+1, z:0}, 
                {x:map.width+1, y:map.height+1, z:0}, frames.length, mapScale, false);
        }
    }
    if (timeScaleInput.checked) {
        drawTimeScale(canvas, modelFps, frames.length, keyframes);
    }
}
