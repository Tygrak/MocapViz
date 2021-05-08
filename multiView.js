import * as Mocap from "./mocap.js";
import * as Mocap2d from "./mocapCanvas2d.js";
import * as Model from "./model.js";

let sequences = [];
let maxCategoriesLoad = 600;
let loaded = true;


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
const zoomableVisualizationsInput = document.getElementById("zoomableVisualizationsInput");
const labelFramesInput = document.getElementById("labelFramesInput");
const oldRenderingInput = document.getElementById("oldRenderingInput");
loadButton.onclick = loadDataFile;
sequenceInputLoadButton.onclick = createVisualizations;
//calculateConversionButton.onclick = calculateConversion;
const drawContainer = document.getElementById("drawContainer");


function loadDataFile() {
    if (dataFileInput.files.length == 0 || !loaded) {
        return;
    }
    loaded = false;
    let time = performance.now();
    sequences = [];
    let fileLocation = 0;
    let reader = new FileReader();
    let last = "";
    let loadChunkMbSize = 20;
    reader.onload = function (textResult) {
        let text = textResult.target.result;
        let split = text.split("#objectKey");
        split[0] = last+split[0];
        last = split[split.length-1];
        split.pop();
        let seqs = split.filter((s) => {return s != "";}).map((s) => s.split("\n"));
        sequences.push(...seqs);
        fileLocation += loadChunkMbSize*1024*1024;
        if (dataFileInput.files[0].size > fileLocation) {
            if (sequences.length > maxCategoriesLoad) {
                console.log("Too many categories loaded. Increase variable 'maxCategoriesLoad' to bypass this check.");
                return;
            }
            reader.readAsText(dataFileInput.files[0].slice(fileLocation, fileLocation+loadChunkMbSize*1024*1024), "UTF-8");
        } else if (last.trim() != "") {
            loaded = true;
            console.log("Loaded " + sequences.length + " sequences in " + (performance.now()-time) + "ms.");
            createVisualizations();
            availableSequencesText.innerText = sequences.length;
        }
    }
    reader.onerror = function (e) {
        console.log("Loading the data file failed, most likely because of how big the file is.");
    }
    reader.readAsText(dataFileInput.files[0].slice(0, loadChunkMbSize*1024*1024), "UTF-8");
}

function createVisualizations() {
    let time = performance.now();
    let targetElement = document.getElementById("drawContainer");
    let keyframesNum = parseInt(numFramesInput.value);
    let addFilling = addFillKeyframesInput.checked;
    let width = targetElement.clientWidth*0.95;
    let height = window.innerHeight*0.98*(1/parseInt(numSequencesPageInput.value));
    let useTrueTime = xAxisTimeInput.checked;
    let labelFrames = labelFramesInput.checked;
    let timeScale = timeScaleInput.checked;
    let mapWidth = mapPerSequenceInput.checked ? 150 : 0;
    let keyframeAlgorithm = Mocap.KeyframeSelectionAlgorithmEnum[keyframeSelectionInput.value];
    targetElement.innerHTML = "";
    let toDrawSequences = [];
    for (let i = parseInt(sequenceNumberInput.value); i < parseInt(sequenceNumberInput.value)+parseInt(numSequencesInput.value); i++) {
        toDrawSequences.push(i);
    }
    let longestSequenceLength = 0;
    for (let i = 0; i < toDrawSequences.length; i++) {
        const sequence = sequences[toDrawSequences[i]];
        longestSequenceLength = Math.max(Mocap.getSequenceLength(sequence), longestSequenceLength);
    }
    let factory = new Mocap.VisualizationFactory();
    factory.addFillingKeyframes = addFilling;
    factory.useTrueTime = useTrueTime;
    factory.labelFrames = labelFrames;
    factory.addTimeScale = timeScale;
    factory.createZoomable = zoomableVisualizationsInput.checked;
    if (bonesModelInput.value == "Kinect") {
        factory.model = Model.modelKinect;
    } else if (bonesModelInput.value == "Kinect2d") {
        factory.model = Model.modelKinect2d;
    }
    function* elementGen() {
        for (let i = 0; i < toDrawSequences.length; i++) {
            const sequence = sequences[toDrawSequences[i]];
            let numKeyframes = Math.max(2, Math.round(keyframesNum*(sequence.length/longestSequenceLength)));
            console.log("i:"+i);
            let visWidth = (width-170)*(sequence.length/longestSequenceLength);
            if (!timeImageScaleInput.checked) {
                visWidth=width-170;
                numKeyframes=keyframesNum;
            }
            let visualization;
            if (!oldRenderingInput.checked) {
                visualization = factory.createVisualization(sequence, visWidth, height, mapWidth, height);
            } else {
                visualization = Mocap2d.createZoomableVisualizationElement(sequence, Mocap.modelVicon, numKeyframes, keyframesNum+2, 10, 
                    mapWidth, height, visWidth, height, timeScale, addFilling, keyframeAlgorithm, labelFrames, useTrueTime);
            }
            visualization.children[0].classList.add("drawBox");
            if (mapPerSequenceInput.checked) {
                visualization.children[1].classList.add("drawBox");
            }
            targetElement.appendChild(visualization);
            yield i;
        }
        return -1;
    }
    let gen = elementGen();
    function rAFLoop(calculate){
        return new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                calculate();
                resolve();
            })
          })
        })
    }
    async function loop(){
        let done = false;
        while (!done) {
            await rAFLoop(() => {
                if (gen.next().done) {
                    done = true;
                }
            });
        }
        console.log("Visualization done in " + (performance.now()-time) + "ms.");
    }
    loop();
} 
