import * as Mocap from '../../src/mocap.js';
import {modelVicon} from "../../src/model.js";
import * as VS from '../../src/ComparisonVizualization/VisualizationService.js';
import {VisualizationParts} from "../../src/MotionsDifferenceVisualiser/Entities/VisualizationParts.js";

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
        let model = modelVicon;
        // let vp = new VisualizationParts(false, false, false, false, false, false, false);
        // let visualizationElement1 = factory.visualizeSequenceDifferences(sequences[1918], sequences[1236], 1400, contextOption, jsonContent, vp, model);
        // document.body.appendChild(visualizationElement1);

        // let visualizationElement = factory.visualizeSequenceDifferences(sequences[1], sequences[2], 1400, contextOption, jsonContent, vp, model);
        // document.body.appendChild(visualizationElement);

        let visualizationElement = factory.visualizeSequenceDifferences(sequences[155], sequences[244], 1400, contextOption, jsonContent, vp, model);
        document.body.appendChild(visualizationElement);

        // visualizationElement = factory.visualizeSequenceDifferences(sequences[435], sequences[257], 1400, contextOption, jsonContent, vp, model);
        // document.body.appendChild(visualizationElement);
        //
        // visualizationElement = factory.visualizeSequenceDifferences(sequences[57], sequences[867], 1400, contextOption, jsonContent, vp, model);
        // document.body.appendChild(visualizationElement);
        //
        // visualizationElement = factory.visualizeSequenceDifferences(sequences[1918], sequences[1236], 1400, contextOption, jsonContent, vp, model);
        // document.body.appendChild(visualizationElement);

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