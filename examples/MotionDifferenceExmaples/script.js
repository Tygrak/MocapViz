import * as Mocap from '../../src/mocap.js';
import {modelVicon} from "../../src/model.js";
import * as VS from '../../src/ComparisonVizualization/VisualizationService.js';
import {VisualizationParts} from "../../src/MotionsDifferenceVisualiser/Entities/VisualizationParts.js";
import {modelKinect2d} from "../../src/mocap.js";

const dataFileInput = document.getElementById("dataFileInput");
const sampleFileInput = document.getElementById('sampleFileInput');
const sampleDataFileInput = document.getElementById("sampleDataFileInput");

const contextSelect = document.getElementById("context");
const loadButton = document.getElementById("dataLoadButton");
const sampleButton = document.getElementById("sampleDataButton");
const downloadContextButton = document.getElementById("downloadContext");
const clearContextButton = document.getElementById("clearContext");

let contextOption = VS.ContextOption.NO_CONTEXT;

let context = document.getElementById('context');
contextSelect.onchange = setContext;
loadButton.onclick = load;
sampleButton.onclick = sample;
downloadContextButton.onclick = downloadContext;
clearContextButton.onclick = clearContext;

let jsonContent = "";

let visualizations = document.createElement('div');
document.body.appendChild(visualizations);

let factory = new Mocap.VisualizationFactory();
factory.numKeyframes = 8;
factory.numZoomedKeyframes = 10;
factory.keyframeSelectionAlgorithm = Mocap.KeyframeSelectionAlgorithmEnum.Equidistant;
factory.leftBoneStyle = {r: 0, g: 180, b: 0, a: 1};
factory.opacity = 0.6;
factory.blurFrameOpacity = 0.17;
factory.model = modelVicon;

let loaderId = "loader";

function load() {
    document.getElementById(loaderId).style.display = "block";
    if (dataFileInput.files.length === 0) {
        console.log("No file selected!");
        document.getElementById(loaderId).style.display = "none";
        return;
    }

    if (sampleFileInput.files.length !== 0) {
        const reader = new FileReader()
        reader.onload = handleFileLoad;
        reader.readAsText(sampleFileInput.files[0]);
    }

    Mocap.loadDataFromFile(dataFileInput.files[0], (sequences) => {
        let vp = new VisualizationParts(true, true, true, true, true, true, true);

        let visualizationElement = factory.visualizeSequenceDifferences(sequences[0], sequences[1], 1400, contextOption, jsonContent, vp);
        document.body.insertAdjacentHTML("afterbegin", visualizationElement);

        document.getElementById(loaderId).style.display = "none";
    });
}

function sample() {
    document.getElementById(loaderId).style.display = "block";
    if (sampleDataFileInput.files.length === 0) {
        console.log("No file selected!");
        document.getElementById(loaderId).style.display = "none";
        return;
    }

    Mocap.loadDataFromFile(sampleDataFileInput.files[0], (sequences) => {
        factory.sampleData(sequences, 100);
        document.getElementById(loaderId).style.display = "none";
    });
}

function downloadContext() {
    factory.downloadBuiltContext();
}

function clearContext() {
    factory.clearContext();
}

function setContext() {
    contextOption = contextSelect.value;
}

function handleFileLoad(event) {
    jsonContent = event.target.result;
}