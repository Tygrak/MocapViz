
let figureScale = 8;
let defaultHeight = 150;
let defaultWidth = 1000;
let headRadius = 10;
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
let model = modelVicon;
let drawStyle = new MocapDrawStyle(bonesVicon, headJointIndex, 17, 13, boneRadius, jointRadius, headRadius, boneStyle, leftBoneStyle, rightBoneStyle, jointStyle, 8);
let drawStyleBlur = new MocapDrawStyle(bonesVicon, headJointIndex, 17, 13, boneRadius, jointRadius, headRadius, blurStyle, blurStyle, blurStyle, blurStyle, 8);

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
const timeImageScaleInput = document.getElementById("timeImageScaleInput");
const mapScalingEnabledInput = document.getElementById("mapScaleInput");
const mapUnitGridInput = document.getElementById("mapUnitGridInput");
const addFillKeyframesInput = document.getElementById("addFillKeyframesInput");
const xAxisTimeInput = document.getElementById("xAxisTimeInput");
const keyframeSelectionInput = document.getElementById("keyframeSelectionInput");
const actorHeightInput = document.getElementById("actorHeightInput");
const calculateConversionButton = document.getElementById("calculateConversionButton");
const contentDiv = document.getElementById("content");
loadButton.onclick = loadDataFile;
loadTextButton.onclick = loadDataText;
sequenceInputLoadButton.onclick = drawSequenceMain;
calculateConversionButton.onclick = calculateConversion;
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
        sequences = text.split("#objectKey").filter((s) => {return s != "";}).map((s) => s.split("\n"));
        availableSequencesText.innerText = sequences.length;
    }
    reader.readAsText(dataFileInput.files[0], "UTF-8");
}

function loadDataText() {
    if (dataTextInput.value.length == 0) {
        return;
    } 
    sequences = dataTextInput.value.split("#objectKey").filter((s) => {return s != "";}).map((s) => s.split("\n"));
    availableSequencesText.innerText = sequences.length;
}

function calculateConversion() {
    model.unitSize = findMeterConversion(sequences, parseFloat(actorHeightInput.value));
}

function loadModel(model) {
    this.model = model;
    defaultScale = model.defaultScale;
    modelFps = model.fps;
    drawStyle.bonesModel = model.bonesModel;
    drawStyle.headJointIndex = model.headJointIndex;
    drawStyle.leftArmIndex = model.leftArmIndex;
    drawStyle.thoraxIndex = model.thoraxIndex;
    drawStyleBlur.bonesModel = model.bonesModel;
    drawStyleBlur.headJointIndex = model.headJointIndex;
    drawStyleBlur.leftArmIndex = model.leftArmIndex;
}

function processSelectedSequence(selectedSequence, canvas, numKeyframes) {
    figureScale = parseFloat(scaleInput.value);
    if (bonesModelInput.value == "Vicon") {
        loadModel(modelVicon);
    } else if (bonesModelInput.value == "Kinect") {
        loadModel(modelKinect);
    } else if (bonesModelInput.value == "Kinect2d") {
        loadModel(modelKinect2d);
    }
    let frames = processSequenceToFrames(sequences[selectedSequence], canvas.height, figureScale*defaultScale);
    if (autoscaleInput.checked) {
        if (figureScale < 0) {
            figureScale = 1;
        }
        if (frames.length == 0) {
            frames = processSequenceToFrames2d(sequences[selectedSequence], canvas.height, figureScale*defaultScale);
            figureScale = figureScale*findOptimalScale(frames, canvas, numKeyframes);
            frames = processSequenceToFrames2d(sequences[selectedSequence], canvas.height, figureScale*defaultScale);
        } else {
            figureScale = figureScale*findOptimalScale(frames, canvas, numKeyframes);
            frames = processSequenceToFrames(sequences[selectedSequence], canvas.height, figureScale*defaultScale);
        }
        scaleInput.value = figureScale;
    } else {
        if (frames.length == 0) {
            frames = processSequenceToFrames2d(sequences[selectedSequence], canvas.height, figureScale*defaultScale);
        }
    }
    drawStyle.figureScale = figureScale;
    drawStyleBlur.figureScale = figureScale;
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
        let bestRotation = findBestRotation(frames, numKeyframes);
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
    numPositions = parseInt(numFramesInput.value);
    let maxSequenceLength = sequences[startSequence].length-1;
    if (timeImageScaleInput.checked) {
        for (let sequence = 1; sequence < numSequences; sequence++) {
            let lines = sequences[startSequence+sequence];
            if (lines.length-3 > maxSequenceLength) {
                maxSequenceLength = lines.length-3;
            }
        }
    }
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
        let numKeyframes = timeImageScaleInput.checked ? Math.ceil(numPositions*((sequences[selectedSequence].length-3)/maxSequenceLength)) : numPositions;
        //canvas.height = defaultHeight;
        canvas.width = timeImageScaleInput.checked ? canvasWidth*((sequences[selectedSequence].length-3)/maxSequenceLength) : canvasWidth;
        canvas.height = Math.floor((window.innerHeight-60)/numSequencesPerPage);
        let frames = processSelectedSequence(selectedSequence, canvas, numKeyframes);
        drawSequence(canvas, maps.length > 0 ? maps[sequence] : null, frames, numKeyframes);
    }
    let b = performance.now();
    console.log("Result time ("+numSequences+" sequences):");
    console.log((b-a)+" ms");
}

function drawSequence(canvas, map, frames, numKeyframes) {
    let keyframes;
    if (keyframeSelectionInput.value == "Equidistant") {
        keyframes = findKeyframesEquidistant(frames, numKeyframes);
    } else if (keyframeSelectionInput.value == "CurveEuclidean") {
        keyframes = findKeyframesEuclidean(frames, numKeyframes);
    } else if (keyframeSelectionInput.value == "CurveDot") {
        keyframes = findKeyframesDot(frames, numKeyframes);
    } else if (keyframeSelectionInput.value == "CurveTemporal") {
        keyframes = findKeyframesTemporal(frames, numKeyframes);
    } else if (keyframeSelectionInput.value == "CurveDecimation") {
        keyframes = findKeyframesDecimation(frames, numKeyframes);
    }
    if (addFillKeyframesInput.checked) {
        let fillKeyframes = getFillKeyframes(frames, keyframes);
        let fillStyle = Object.assign({}, drawStyle);
        fillStyle.boneStyle = {r: boneStyle.r, g: boneStyle.g, b: boneStyle.b, a: boneStyle.a*0.55};
        fillStyle.leftBoneStyle = {r: leftBoneStyle.r, g: leftBoneStyle.g, b: leftBoneStyle.b, a: leftBoneStyle.a*0.55};
        fillStyle.rightBoneStyle = {r: rightBoneStyle.r, g: rightBoneStyle.g, b: rightBoneStyle.b, a: rightBoneStyle.a*0.55};
        drawSequenceKeyframesBlur(canvas, frames, fillKeyframes, 0, fillStyle, drawStyleBlur, 0, true, xAxisTimeInput.checked);
        drawSequenceKeyframesBlur(canvas, frames, keyframes, numBlurPositions, drawStyle, drawStyleBlur, 0, false, xAxisTimeInput.checked);
    } else {
        drawSequenceKeyframesBlur(canvas, frames, keyframes, numBlurPositions, drawStyle, drawStyleBlur, 0, true, xAxisTimeInput.checked);
    }
    if (map != null) {
        let framesMin = findSequenceMinimums(frames, numKeyframes);
        let framesMax = findSequenceMaximums(frames, numKeyframes);
        let maxWidth = Math.max(framesMax.x-framesMin.x, framesMax.z-framesMin.z);
        let mapScale = 100*figureScale*defaultScale;
        if (mapScalingEnabledInput.checked) {
            if (maxWidth > canvas.width) {
                mapScale = canvas.width*1.5;
            } else {
                mapScale = Math.floor(maxWidth/12.5)*25+25;
            }
        }
        if (!mapUnitGridInput.checked) {
            drawMapMeterScale(map, (model.unitSize*figureScale)*100, mapScale);
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
        } else {
            if (mapsParallelogramInput.checked) {
                drawTopDownMapParallelogramUnitGrid(map, frames, keyframes, 
                    {x:map.width/5, y:0, z:0}, 
                    {x:0, y:map.height-0, z:0}, 
                    {x:map.width-map.width/5, y:map.height-0, z:0}, frames.length, mapScale, (model.unitSize*figureScale)*10, false);
            } else {
                drawTopDownMapParallelogramUnitGrid(map, frames, keyframes, 
                    {x:-1, y:-1, z:0}, 
                    {x:-1, y:map.height+1, z:0}, 
                    {x:map.width+1, y:map.height+1, z:0}, frames.length, mapScale, (model.unitSize*figureScale)*10, false);
            }
        }
    }
    if (timeScaleInput.checked) {
        drawTimeScale(canvas, modelFps, frames.length, keyframes);
    }
}
