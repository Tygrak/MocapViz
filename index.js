let figureScale = 8;
let defaultHeight = 600;
let defaultWidth = 1000;
let currentFrame = 0;
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
let currentPlayingFrames = [];
let playingSequence = false;
let headJointIndex = 16;
let modelFps = 120;
let drawStyle = new MocapDrawStyle(bonesVicon, headJointIndex, boneRadius, jointRadius, headRadius, boneStyle, leftBoneStyle, rightBoneStyle, jointStyle);
let drawStyleBlur = new MocapDrawStyle(bonesVicon, headJointIndex, boneRadius, jointRadius, headRadius, blurStyle, blurStyle, blurStyle, blurStyle);

const availableSequencesText = document.getElementById("availableSequencesText");
const sequenceNumberInput = document.getElementById("sequenceNumberInput");
const sequenceInputLoadButton = document.getElementById("sequenceInputLoadButton");
const sequenceInputPlayButton = document.getElementById("sequenceInputPlayButton");
const dataFileInput = document.getElementById("dataFileInput");
const dataTextInput = document.getElementById("dataTextInput");
const numFramesInput = document.getElementById("numFramesInput");
const yRotationInput = document.getElementById("yRotationInput");
const loadButton = document.getElementById("dataInputLoadButton");
const loadTextButton = document.getElementById("dataTextLoadButton");
const bonesModelInput = document.getElementById("bonesModelInput");
const scaleInput = document.getElementById("scaleInput");
const autorotateInput = document.getElementById("autorotateInput");
const autoscaleInput = document.getElementById("autoscaleInput");
const mapPerKeyframeInput = document.getElementById("mapsPerKeyframeInput");
loadButton.onclick = loadDataFile;
loadTextButton.onclick = loadDataText;
sequenceInputLoadButton.onclick = drawSequenceMain;
sequenceInputPlayButton.onclick = playSequence;
const canvas = document.getElementsByClassName("drawBox")[0];
//canvas.width = defaultWidth;
canvas.width = Math.floor(canvas.parentElement.getBoundingClientRect().width)-20;
canvas.height = defaultHeight;
let ctx = canvas.getContext("2d");
let defaultScale = 1;

//const queryString = window.location.search;
//console.log(queryString);
//const urlParams = new URLSearchParams(queryString);

loadDataFile();
setInterval(update, 10);

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

function processSelectedSequence() {
    figureScale = parseFloat(scaleInput.value);
    numPositions = parseInt(numFramesInput.value);
    if (bonesModelInput.value == "Vicon") {
        loadModel(modelVicon);
    } else if (bonesModelInput.value == "Kinect") {
        loadModel(modelKinect);
    } else if (bonesModelInput.value == "Kinect2d") {
        loadModel(modelKinect2d);
    }
    console.log(bonesModelInput.value);
    playingSequence = false;
    clearCanvas(canvas);
    let selectedSequence = parseInt(sequenceNumberInput.value);
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
        console.log(bestRotation);
    }
    let yRotation = parseFloat(yRotationInput.value)*0.01745329;
    for (let i = 0; i < frames.length; i++) {
        frames[i] = frameRotateY(frames[i], yRotation);
    }
    return frames;
}

function drawSequenceMain() {
    if (mapPerKeyframeInput.checked) {
        loadSequenceMaps();
    } else {
        loadSequence();
    }
}

function loadSequence() {
    let frames = processSelectedSequence();
    let keyframes = findKeyframes(frames, numPositions);
    console.log(keyframes);
    let notKeyframes = [];
    for (let i = 0; i < keyframes.length; i++) {
        notKeyframes.push(Math.floor((i/keyframes.length)*frames.length));
    }
    let framesMin = findSequenceMinimums(frames, numPositions);
    let framesMax = findSequenceMaximums(frames, numPositions);
    let maxWidth = Math.max(framesMax.x-framesMin.x, framesMax.z-framesMin.z);
    let mapScale = canvas.width;
    if (maxWidth > canvas.width) {
        mapScale = canvas.width*1.5;
    } else if (maxWidth < canvas.width/10) {
        mapScale = canvas.width/4.95;
    } else if (maxWidth < canvas.width/8) {
        mapScale = canvas.width/3.95;
    } else if (maxWidth < canvas.width/6) {
        mapScale = canvas.width/2.95;
    } else if (maxWidth < canvas.width/4) {
        mapScale = canvas.width/1.95;
    }
    console.log(frames);
    drawSequenceKeyframesBlur(canvas, frames, keyframes, numBlurPositions, drawStyle, drawStyleBlur, 0, true);
    drawMapScale(canvas, mapScale/10);
    drawTopDownMapParallelogram(canvas, frames, keyframes, 
        {x:defaultWidth/2-4*defaultHeight/24, y:3*defaultHeight/24, z:0}, 
        {x:defaultWidth/2-6*defaultHeight/24, y:9*defaultHeight/24, z:0}, 
        {x:defaultWidth/2+4*defaultHeight/24, y:9*defaultHeight/24, z:0}, frames.length, mapScale, false);
    //drawSequenceKeyframesBlur(canvas, frames, notKeyframes, numBlurPositions, drawStyle, drawStyleBlur, -height/2, false);
    //drawSequenceBlur(canvas, frames, numPositions, numBlurPositions, drawStyle, drawStyleBlur);
}

function loadSequenceMaps() {
    let frames = processSelectedSequence();
    let keyframes = findKeyframes(frames, numPositions);
    console.log(keyframes);
    let notKeyframes = [];
    for (let i = 0; i < keyframes.length; i++) {
        notKeyframes.push(Math.floor((i/keyframes.length)*frames.length));
    }
    let framesMin = findSequenceMinimums(frames, numPositions);
    let framesMax = findSequenceMaximums(frames, numPositions);
    let maxWidth = Math.max(framesMax.x-framesMin.x, framesMax.z-framesMin.z);
    let mapScale = canvas.width;
    if (maxWidth > canvas.width) {
        mapScale = canvas.width*1.5;
    } else if (maxWidth < canvas.width/10) {
        mapScale = canvas.width/4.95;
    } else if (maxWidth < canvas.width/8) {
        mapScale = canvas.width/3.95;
    } else if (maxWidth < canvas.width/6) {
        mapScale = canvas.width/2.95;
    } else if (maxWidth < canvas.width/4) {
        mapScale = canvas.width/1.95;
    }
    console.log(frames);
    drawSequenceKeyframesBlurWithMaps(canvas, frames, keyframes, numBlurPositions, drawStyle, drawStyleBlur, mapScale, 0, true);
}

function playSequence() {
    currentFrame = 0;
    clearCanvas(canvas);
    currentPlayingFrames = processSelectedSequence();
    if (currentPlayingFrames.length == 0) {
        return;
    }
    playingSequence = true;
    console.debug(currentPlayingFrames);
    jointStyle = 'rgba(0,0,0,0.75)';
    boneStyle = 'rgba(0,0,0,0.75)';
}

function update() {
    if (!playingSequence) {
        return;
    }
    clearCanvas(canvas);
    let yRotation = parseFloat(yRotationInput.value)*0.01745329;
    drawFrame(canvas, frameRotateY(currentPlayingFrames[currentFrame], yRotation), defaultWidth/2, 0, drawStyle);
    currentFrame++;
    if (currentFrame >= currentPlayingFrames.length) {
        currentFrame = currentFrame%currentPlayingFrames.length;
    }
}
