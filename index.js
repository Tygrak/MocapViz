let bonesVicon = [
    {a: 0, b: 1}, {a: 1, b: 2}, {a: 2, b: 3}, {a: 3, b: 4}, {a: 4, b: 5}, // leg
    {a: 0, b: 6}, {a: 6, b: 7}, {a: 7, b: 8}, {a: 8, b: 9}, {a: 9, b: 10}, // leg
    {a: 0, b: 11}, {a: 11, b: 12}, {a: 12, b: 13}, {a: 13, b: 14}, {a: 14, b: 15}, {a: 15, b: 16}, // torso + head
    {a: 13, b: 17}, {a: 17, b: 18}, {a: 18, b: 19}, {a: 19, b: 20}, {a: 20, b: 21}, {a: 21, b: 22}, {a: 20, b: 23}, // hand
    {a: 13, b: 24}, {a: 24, b: 25}, {a: 25, b: 26}, {a: 26, b: 27}, {a: 27, b: 28}, {a: 28, b: 29}, {a: 27, b: 30}]; // hand
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
let numPositions = 7;
let numBlurPositions = 12;
let jointStyle = 'rgba(0,0,0,0.75)';
let boneStyle = 'rgba(0,0,0,0.75)';
let sequences = [];
let currentPlayingFrames = [];
let playingSequence = false;
let drawStyle = new MocapDrawStyle(bonesVicon, boneRadius, jointRadius, headRadius, boneStyle, jointStyle);
let drawStyleBlur = new MocapDrawStyle(bonesVicon, boneRadius, jointRadius, headRadius, 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.1)');

const availableSequencesText = document.getElementById("availableSequencesText");
const sequenceNumberInput = document.getElementById("sequenceNumberInput");
const sequenceInputLoadButton = document.getElementById("sequenceInputLoadButton");
const sequenceInputPlayButton = document.getElementById("sequenceInputPlayButton");
const dataFileInput = document.getElementById("dataFileInput");
const loadButton = document.getElementById("dataInputLoadButton");
loadButton.onclick = loadDataFile;
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

function loadSequence() {
    playingSequence = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let selectedSequence = parseInt(sequenceNumberInput.value);
    let frames = processSequenceToFrames(sequences[selectedSequence]);
    drawSequenceBlur(canvas, frames, numPositions, numBlurPositions, drawStyle, drawStyleBlur);
}

function playSequence() {
    currentFrame = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let selectedSequence = parseInt(sequenceNumberInput.value);
    if (selectedSequence >= sequences.length) {
        return;
    }
    currentPlayingFrames = processSequenceToFrames(sequences[selectedSequence]);
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
    drawFrame(canvas, currentPlayingFrames[currentFrame], width/2, 0, drawStyle);
    currentFrame++;
    if (currentFrame >= currentPlayingFrames.length) {
        currentFrame = currentFrame%currentPlayingFrames.length;
    }
}
