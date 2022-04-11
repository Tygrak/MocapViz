import * as Mocap from '../../src/mocap.js';
import {modelVicon} from "../../src/model.js";
import * as VS from '../../src/ComparisonVizualization/VisualizationService.js';
import {VisualizationParts} from "../../src/MotionsDifferenceVisualiser/Entities/VisualizationParts.js";
import {modelKinect2d} from "../../src/mocap.js";

const sequence1FileInput = document.getElementById("sequence1FileInput");
const sequence2FileInput = document.getElementById("sequence2FileInput");
const sampleFileInput = document.getElementById('sampleFileInput');
const sampleDataFileInput = document.getElementById("sampleDataFileInput");

const contextSelect = document.getElementById("context");
const loadButton = document.getElementById("dataLoadButton");
const sampleButton = document.getElementById("sampleDataButton");
const downloadContextButton = document.getElementById("downloadContext");
const clearContextButton = document.getElementById("clearContext");

let contextOption = VS.ContextOption.NO_CONTEXT;

contextSelect.onchange = setContext;
loadButton.onclick = load;
sampleButton.onclick = sample;
downloadContextButton.onclick = downloadContext;
clearContextButton.onclick = clearContext;

let jsonContent = "";

let factory = new Mocap.VisualizationFactory();
factory.numKeyframes = 8;
factory.numZoomedKeyframes = 10;
factory.keyframeSelectionAlgorithm = Mocap.KeyframeSelectionAlgorithmEnum.Equidistant;
factory.leftBoneStyle = {r: 0, g: 180, b: 0, a: 1};
factory.opacity = 0.6;
factory.blurFrameOpacity = 0.17;
factory.model = modelKinect2d;

let loaderId = "loader";

function load() {
    document.getElementById(loaderId).style.display = "block";
    if (sequence1FileInput.files.length === 0 || sequence2FileInput.files.length === 0) {
        console.log("At least one sequence was not set!");
        document.getElementById(loaderId).style.display = "none";
        return;
    }

    if (sampleFileInput.files.length !== 0) {
        const reader = new FileReader()
        reader.onload = handleFileLoad;
        reader.readAsText(sampleFileInput.files[0]);
    }

    let vp = new VisualizationParts(true, true, true, true, true, true, true);

    let reader = new FileReader();

    reader.readAsText(sequence1FileInput.files[0], "utf-8");
    reader.onload = function(textResult) {
        let text = textResult.target.result;
        let split = text.split("#objectKey");
        let sequences = split.filter((s) => {return s !== "";}).map((s) => s.split("\r\n"));
        let sequence1 = sequences[0];
        reader.readAsText(sequence2FileInput.files[0], "utf-8");
        reader.onload = function (textResult) {
            text = textResult.target.result;
            split = text.split("#objectKey");
            sequences = split.filter((s) => {return s !== "";}).map((s) => s.split("\r\n"));
            let sequence2 = sequences[0];
            let visualizationElement = factory.visualizeSequenceDifferences(sequence1, sequence2, 1400, contextOption, jsonContent, vp);
            document.body.appendChild(visualizationElement);
            document.getElementById(loaderId).style.display = "none";
        }
    }
}

function sample() {
    document.getElementById(loaderId).style.display = "block";
    if (sampleDataFileInput.files.length === 0) {
        console.log("No file selected!");
        document.getElementById(loaderId).style.display = "none";
        return;
    }

    Mocap.loadDataFromFile(sampleDataFileInput.files[0], (sequences) => {
        factory.sampleData(sequences, 10);
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