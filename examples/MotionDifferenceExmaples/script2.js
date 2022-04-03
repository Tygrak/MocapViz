import * as Mocap from '../../src/mocap.js';
import {modelVicon} from "../../src/model.js";
import * as VS from '../../src/ComparisonVizualization/VisualizationService.js';
import {VisualizationParts} from "../../src/MotionsDifferenceVisualiser/Entities/VisualizationParts.js";

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
    let model = modelVicon;

    let reader = new FileReader();

    reader.readAsText(sequence1FileInput.files[0], "utf-8");
    reader.onload = function(event) {
        let sequence1 = JSON.parse(reader.result);
        reader.readAsText(sequence2FileInput.files[0], "utf-8");
        reader.onload = function (event) {
            let sequence2 = JSON.parse(reader.result);

            let visualizationElement = factory.visualizeSequenceDifferences(sequence1, sequence2, 1400, contextOption, jsonContent, vp, model);
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
        factory.sampleData(sequences, 10, modelVicon);
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