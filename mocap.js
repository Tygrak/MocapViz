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
let figureScale = 10;
let height = 600;
let width = 1000;
let frame = 0;
let headRadius = 18;
let jointRadius = 0;
let boneRadius = 2;
let numPositions = 7;
let numPrePositionMovement = 15;
let jointStyle = 'rgba(0,0,0,0.75)';
let boneStyle = 'rgba(0,0,0,0.75)';
let sequences = [];
let frames = [];
let playingSequence = false;

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
    //console.debug(dataFileInput.files);
    //console.debug(":click");
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
    console.debug(selectedSequence);
    console.debug(sequences.length);
    if (selectedSequence >= sequences.length) {
        return;
    }
    frames = processSequenceToFrames(sequences[selectedSequence]);
    if (frames.length == 0) {
        return;
    }
    let firstFrame = moveOriginXBy(frames[0], frames[0][0].x);
    let minX = firstFrame[0].x;
    for (let i = 1; i < firstFrame.length; i++) {
        if (firstFrame[i].x < minX) {
            minX = firstFrame[i].x;
        }
    }
    let lastFrame = moveOriginXBy(frames[frames.length-1], frames[frames.length-1][0].x);
    let maxX = lastFrame[0].x;
    for (let i = 1; i < lastFrame.length; i++) {
        if (lastFrame[i].x > maxX) {
            maxX = lastFrame[i].x;
        }
    }
    for (let i = 0; i < frames.length; i++) {
        if (Math.floor(i%(frames.length/(numPositions-1))) == 0 || i == frames.length-1) {
            let coreX = frames[i][0].x;
            if (i > 0) {
                jointStyle = 'rgba(0,0,0,0.10)';
                boneStyle = 'rgba(0,0,0,0.10)';
                for (let j = 1; j < numPrePositionMovement+1; j++) {
                    if (i-j < 0) {
                        continue;
                    }
                    drawFrame(moveOriginXBy(frames[i-j], coreX), (i/frames.length)*(width+minX-maxX-20)-minX+20);
                }
            }
            jointStyle = 'rgba(0,0,0,0.75)';
            boneStyle = 'rgba(0,0,0,0.75)';
            drawFrame(moveOriginXBy(frames[i], coreX), (i/frames.length)*(width+minX-maxX-20)-minX+20);
        }
    }
}

function playSequence() {
    frame = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let selectedSequence = parseInt(sequenceNumberInput.value);
    if (selectedSequence >= sequences.length) {
        return;
    }
    frames = processSequenceToFrames(sequences[selectedSequence]);
    if (frames.length == 0) {
        return;
    }
    playingSequence = true;
    console.debug(frames);
    jointStyle = 'rgba(0,0,0,0.75)';
    boneStyle = 'rgba(0,0,0,0.75)';
}

function processSequenceToFrames(rawData) {
    let frames = rawData.split("\n").map((frame) => {
        return frame.replace(" ", "").split(';').map((joint) => {
            let xyz = joint.split(',');
            return {x:parseFloat(xyz[0])*figureScale, y:parseFloat(xyz[1])*-1*figureScale + height-10, z:parseFloat(xyz[2])*figureScale};
        });
    });
    frames = frames.filter((f) => {return f.length > 0 && !isNaN(f[0].x) && !isNaN(f[0].y) && !isNaN(f[0].z)});
    console.debug(frames);
    return frames;
}

function moveOriginXBy(frame, moveBy) {
    let newFrame = [];
    for (let i = 0; i < frame.length; i++) {
        newFrame[i] = {x:frame[i].x-moveBy, y:frame[i].y, z:frame[i].z};
    }
    return newFrame;
}

function drawFrame(frame, xShift) {
    console.debug(frame);
    if (playingSequence) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    for (let i = 0; i < frame.length; i++) {
        ctx.beginPath();
        ctx.fillStyle = jointStyle;
        let radius = jointRadius;
        if (i == 16) {
            radius = headRadius;
        }
        ctx.arc(frame[i].x+xShift, frame[i].y, radius, 0, 2 * Math.PI);
        ctx.fill();
    }
    for (let i = 0; i < bonesVicon.length; i++) {
        let a = frame[bonesVicon[i].a];
        let b = frame[bonesVicon[i].b];
        let normal = {x:a.y-b.y, y:-(a.x-b.x)};
        let magnitude = Math.sqrt(normal.x**2+normal.y**2);
        normal.x = normal.x/magnitude;
        normal.y = normal.y/magnitude;
        ctx.fillStyle = boneStyle;
        ctx.beginPath();
        ctx.moveTo(a.x+boneRadius*normal.x+xShift, a.y+boneRadius*normal.y);
        ctx.lineTo(b.x+boneRadius*normal.x+xShift, b.y+boneRadius*normal.y);
        ctx.lineTo(b.x-boneRadius*normal.x+xShift, b.y-boneRadius*normal.y);
        ctx.lineTo(a.x-boneRadius*normal.x+xShift, a.y-boneRadius*normal.y);
        ctx.lineTo(a.x+boneRadius*normal.x+xShift, a.y+boneRadius*normal.y);
        ctx.closePath();
        ctx.fill();
    }
}

function update() {
    if (!playingSequence) {
        return;
    }
    drawFrame(frames[frame], width/2);
    frame++;
    if (frame >= frames.length) {
        frame = frame%frames.length;
    }
}
