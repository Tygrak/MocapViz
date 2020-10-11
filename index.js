let bonesVicon = [
    {a: 0, b: 1, type: BoneType.rightLeg}, {a: 1, b: 2, type: BoneType.rightLeg}, {a: 2, b: 3, type: BoneType.rightLeg}, 
    {a: 3, b: 4, type: BoneType.rightLeg}, {a: 4, b: 5, type: BoneType.rightLeg}, // leg
    {a: 0, b: 6, type: BoneType.leftLeg}, {a: 6, b: 7, type: BoneType.leftLeg}, {a: 7, b: 8, type: BoneType.leftLeg}, 
    {a: 8, b: 9, type: BoneType.leftLeg}, {a: 9, b: 10, type: BoneType.leftLeg}, // leg
    {a: 0, b: 11, type: BoneType.torso}, {a: 11, b: 12, type: BoneType.torso}, {a: 12, b: 13, type: BoneType.torso}, 
    {a: 13, b: 14, type: BoneType.torso}, {a: 14, b: 15, type: BoneType.torso}, {a: 15, b: 16, type: BoneType.torso}, // torso + head
    {a: 13, b: 17, type: BoneType.rightHand}, {a: 17, b: 18, type: BoneType.rightHand}, {a: 18, b: 19, type: BoneType.rightHand}, 
    {a: 19, b: 20, type: BoneType.rightHand}, {a: 20, b: 21, type: BoneType.rightHand}, {a: 21, b: 22, type: BoneType.rightHand}, 
    {a: 20, b: 23, type: BoneType.rightHand}, // hand
    {a: 13, b: 24, type: BoneType.leftHand}, {a: 24, b: 25, type: BoneType.leftHand}, {a: 25, b: 26, type: BoneType.leftHand}, 
    {a: 26, b: 27, type: BoneType.leftHand}, {a: 27, b: 28, type: BoneType.leftHand}, {a: 28, b: 29, type: BoneType.leftHand}, 
    {a: 27, b: 30, type: BoneType.leftHand} // hand
]; 
let bonesKinect = [
    {a: 0, b: 1}, {a: 1, b: 2}, {a: 2, b: 3}, {a: 3, b: 4}, // leg
    {a: 0, b: 6}, {a: 6, b: 7}, {a: 7, b: 8}, {a: 8, b: 9}, // leg
    {a: 0, b: 11}, {a: 11, b: 13}, {a: 13, b: 14}, {a: 14, b: 16}, // torso + head
    {a: 13, b: 17}, {a: 17, b: 18}, {a: 18, b: 19}, {a: 19, b: 21}, {a: 21, b: 22}, {a: 21, b: 23}, // hand
    {a: 13, b: 24}, {a: 24, b: 25}, {a: 25, b: 26}, {a: 26, b: 28}, {a: 28, b: 29}, {a: 28, b: 30}]; // hand

let figureScale = 8;
let height = 600;
let width = 1000;
let currentFrame = 0;
let headRadius = 18;
let jointRadius = 0;
let boneRadius = 2;
let numPositions = 8;
let numBlurPositions = 10;
let jointStyle = 'rgba(0,0,0,0.75)';
let boneStyle = 'rgba(0,0,0,0.75)';
let leftBoneStyle = 'rgba(128,0,0,0.75)';
let rightBoneStyle = 'rgba(0,0,128,0.75)';
let blurStyle = 'rgba(0,0,0,0.1)';
let sequences = [];
let currentPlayingFrames = [];
let playingSequence = false;
let drawStyle = new MocapDrawStyle(bonesVicon, boneRadius, jointRadius, headRadius, boneStyle, leftBoneStyle, rightBoneStyle, jointStyle);
let drawStyleBlur = new MocapDrawStyle(bonesVicon, boneRadius, jointRadius, headRadius, blurStyle, blurStyle, blurStyle, blurStyle);

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
loadButton.onclick = loadDataFile;
loadTextButton.onclick = loadDataText;
sequenceInputLoadButton.onclick = loadSequence;
sequenceInputPlayButton.onclick = playSequence;
const canvas = document.getElementById("drawBox");
canvas.width = width;
canvas.height = height;
let ctx = canvas.getContext("2d");

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

function loadSequence() {
    numPositions = parseInt(numFramesInput.value);
    drawStyle.bonesModel = bonesModelInput.value == "Vicon" ? bonesVicon : bonesKinect;
    drawStyleBlur.bonesModel = bonesModelInput.value == "Vicon" ? bonesVicon : bonesKinect;
    playingSequence = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let selectedSequence = parseInt(sequenceNumberInput.value);
    let frames = processSequenceToFrames(sequences[selectedSequence], canvas.height, figureScale);
    if (frames.length == 0) {
        frames = processSequenceToFrames2d(sequences[selectedSequence], canvas.height, figureScale);
    }
    let yRotation = parseFloat(yRotationInput.value)*0.01745329;
    for (let i = 0; i < frames.length; i++) {
        frames[i] = frameRotateY(frames[i], yRotation);
    }
    let keyframes = findKeyframes(frames, numPositions);
    console.log(keyframes);
    let notKeyframes = [];
    for (let i = 0; i < keyframes.length; i++) {
        notKeyframes.push(Math.floor((i/keyframes.length)*frames.length));
    }
    console.log(frames);
    drawSequenceKeyframesBlur(canvas, frames, keyframes, numBlurPositions, drawStyle, drawStyleBlur, 0, true);
    drawSequenceKeyframesBlur(canvas, frames, notKeyframes, numBlurPositions, drawStyle, drawStyleBlur, -height/2, false);
    //drawSequenceBlur(canvas, frames, numPositions, numBlurPositions, drawStyle, drawStyleBlur);
}

function playSequence() {
    drawStyle.bonesModel = bonesModelInput.value == "Vicon" ? bonesVicon : bonesKinect;
    drawStyleBlur.bonesModel = bonesModelInput.value == "Vicon" ? bonesVicon : bonesKinect;
    numPositions = parseInt(numFramesInput.value);
    currentFrame = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let selectedSequence = parseInt(sequenceNumberInput.value);
    if (selectedSequence >= sequences.length) {
        return;
    }
    currentPlayingFrames = processSequenceToFrames(sequences[selectedSequence], canvas.height, figureScale);
    if (currentPlayingFrames.length == 0) {
        currentPlayingFrames = processSequenceToFrames2d(sequences[selectedSequence], canvas.height, figureScale);
    }
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
    drawFrame(canvas, frameRotateY(currentPlayingFrames[currentFrame], yRotation), width/2, 0, drawStyle);
    currentFrame++;
    if (currentFrame >= currentPlayingFrames.length) {
        currentFrame = currentFrame%currentPlayingFrames.length;
    }
}
