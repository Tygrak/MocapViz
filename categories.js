import * as Mocap from './mocap.js';
import * as Mocap2d from './mocapCanvas2d.js';

let maxCategoriesLoad = 500;
let loaded = true;
let sequences = [];
const dataFileInput = document.getElementById("dataFileInput");
const loadButton = document.getElementById("dataInputLoadButton");
const categorySelection = document.getElementById("categorySelection");
const keyframesNumInput = document.getElementById("keyframesNumInput");
const addFillingKeyframesInput = document.getElementById("addFillingKeyframesInput");
const keyframeAlgorithmSelection = document.getElementById("keyframeAlgorithmSelection");
loadButton.onclick = loadCategoryDataFile;

addCategorySelectionOptions();

function addCategorySelectionOptions() {
    let allCategories = Mocap.motionSuperCategories.allCategories;
    allCategories.splice(allCategories.indexOf("140"), 1);
    for (let i = 0; i < allCategories.length; i++) {
        const category = allCategories[i];
        let option = document.createElement("option");
        option.value = category;
        option.innerHTML = category+": "+Mocap.motionCategoriesHuman[category];
        categorySelection.appendChild(option);
    }
}

function loadCategoryDataFile() {
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
    let category = categorySelection.value;
    reader.onload = function (textResult) {
        let text = textResult.target.result;
        let split = text.split("#objectKey");
        split[0] = last+split[0];
        last = split[split.length-1];
        split.pop();
        let seqs = split.filter((s) => {return s != "";}).map((s) => s.split("\n"));
        seqs = seqs.filter((s) => {return category == Mocap.getSequenceCategory(s);});
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
        }
    }
    reader.onerror = function (e) {
        console.log("Loading the data file failed, most likely because of how big the file is.");
    }
    reader.readAsText(dataFileInput.files[0].slice(0, loadChunkMbSize*1024*1024), "UTF-8");
}

function createVisualizations() {
    let time = performance.now();
    let targetElement = document.getElementById("drawRegion");
    let keyframesNum = parseInt(keyframesNumInput.value);
    let addFilling = addFillingKeyframesInput.checked;
    let width = window.innerWidth*0.95;
    let keyframeAlgorithm = Mocap.KeyframeSelectionAlgorithmEnum[keyframeAlgorithmSelection.value];
    targetElement.innerHTML = "";
    let longestSequenceLength = 0;
    for (let i = 0; i < sequences.length; i++) {
        const sequence = sequences[i];
        longestSequenceLength = Math.max(Mocap.getSequenceLength(sequence), longestSequenceLength);
    }
    /*for (let i = 0; i < sequences.length; i++) {
        const sequence = sequences[i];
        let numKeyframes = Math.max(2, Math.round(keyframesNum*(sequence.length/longestSequenceLength)));
        console.log("i:"+i);
        let visualization = Mocap.createZoomableVisualizationElement(sequence, Mocap.modelVicon, numKeyframes, keyframesNum+2, 10, 
        150, 150, (width-160)*(sequence.length/longestSequenceLength), 150, false, addFilling, keyframeAlgorithm);
        visualization.children[0].classList.add("drawBox");
        visualization.children[1].classList.add("drawBox");
        targetElement.appendChild(visualization);
    }
    console.log("Visualization done in " + (performance.now()-time) + "ms.");*/
    function* elementGen() {
        for (let i = 0; i < sequences.length; i++) {
            const sequence = sequences[i];
            let numKeyframes = Math.max(2, Math.round(keyframesNum*(sequence.length/longestSequenceLength)));
            console.log("i:"+i);
            let visualization = Mocap.createZoomableVisualizationElement(sequence, Mocap.modelVicon, numKeyframes, keyframesNum+2, 10, 
            150, 150, (width-160)*(sequence.length/longestSequenceLength), 150, false, addFilling, keyframeAlgorithm);
            visualization.children[0].classList.add("drawBox");
            visualization.children[1].classList.add("drawBox");
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
