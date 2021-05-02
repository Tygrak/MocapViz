import * as Mocap from './mocap.js';

let loaded = true;
let sequences = [];
let currentSequences = [];
let selectedSequences = [];
let currentVisualizationDivs = [];
let currentCategory = 0;
let submittedAnswers = false;
let supercategory = Mocap.motionSuperCategories.cartwheel;
let keyframeAlgorithm = Mocap.KeyframeSelectionAlgorithmEnum.Decimation;
let sequenceLength = 169;
const dataFileInput = document.getElementById("dataFileInput");
const loadButton = document.getElementById("dataInputLoadButton");
const submitButton = document.getElementById("submitAnswersButton");
const newQuestionButton = document.getElementById("newQuestionButton");
const saveQuestionFileButton = document.getElementById("saveQuestionFileButton");
const loadQuestionFileButton = document.getElementById("loadQuestionFileButton");
const resultText = document.getElementById("resultText");
const superCategorySelection = document.getElementById("superCategorySelection");
const keyframeAlgorithmSelection = document.getElementById("keyframeAlgorithmSelection");
const randomLengthInput = document.getElementById("randomLengthInput");
const sameSupercategoryInput = document.getElementById("sameSupercategoryInput");
const randomSupercategoryInput = document.getElementById("randomSupercategoryInput");
loadButton.onclick = loadCategoryDataFile;
submitButton.onclick = submitAnswers;
saveQuestionFileButton.onclick = saveQuestion;
loadQuestionFileButton.onclick = loadQuestion;
newQuestionButton.onclick = remakeTest;


loaded = false;
loadData(function(response) {
    sequences = Mocap.loadDataFromString(response);
    console.log("Loaded " + sequences.length + " sequences.");
    loaded = true;
    createRandomTest();
});

function loadData(callback) {   
    let xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/text");
    xobj.open('GET', 'hdm05part.txt', true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            callback(xobj.responseText);
        }
    };
    xobj.send(null);  
}
function loadCategoryDataFile() {
    if (dataFileInput.files.length == 0 || !loaded) {
        return;
    }
    loaded = false;
    sequences = [];
    let fileLocation = 0;
    let reader = new FileReader();
    let last = "";
    let loadChunkMbSize = 20;
    supercategory = Mocap.motionSuperCategories[superCategorySelection.value];
    sequenceLength = getRandomIntRange(80, 500);
    console.log("sequence length: " + sequenceLength);
    reader.onload = function (textResult) {
        let text = textResult.target.result;
        let split = text.split("#objectKey");
        split[0] = last+split[0];
        last = split[split.length-1];
        split.pop();
        let seqs = split.filter((s) => {return s != "";}).map((s) => s.split("\n"));
        seqs = seqs.filter((s) => {return supercategory.indexOf(Mocap.getSequenceCategory(s)) != -1;});
        if (randomLengthInput.checked) {
            let a  = seqs.map((s) => {return Mocap.getSequenceLength(s);});
            seqs = seqs.filter((s) => {return Mocap.getSequenceLength(s) > sequenceLength*0.9-10 && Mocap.getSequenceLength(s) < sequenceLength*1.1+10;});
        }
        sequences.push(...seqs);
        fileLocation += loadChunkMbSize*1024*1024;
        if (dataFileInput.files[0].size > fileLocation) {
            if (sequences.length > 500) {
                return;
            }
            reader.readAsText(dataFileInput.files[0].slice(fileLocation, fileLocation+loadChunkMbSize*1024*1024), "UTF-8");
        } else if (last.trim() != "") {
            if (supercategory.indexOf(Mocap.getSequenceCategory(last.trim().split("\n")) != -1)) {
                //sequences.push(last.trim().split("\n"));
            }
            loaded = true;
            console.log("Loaded " + sequences.length + " sequences.");
            createRandomTest();
        }
    }
    reader.onerror = function (e) {
        console.log("Loading the data file failed, most likely because of how big the file is.");
    }
    reader.readAsText(dataFileInput.files[0].slice(0, loadChunkMbSize*1024*1024), "UTF-8");
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function getRandomIntRange(min, max) {
    return Math.floor(Math.random()*Math.floor(max-min)+min);
}

function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function download(data, filename) {
    let file = new Blob([data], {type: "text/plain"});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        let a = document.createElement("a");
        let url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}

function saveQuestion() {
    let result = currentCategory + "\n" + keyframeAlgorithm + "\n";
    for (let i = 0; i < currentSequences.length; i++) {
        result += "#objectKey"+sequences[currentSequences[i]].join("\n");
    }
    download(result, "question.txt");
}

function loadQuestion() {
    if (dataFileInput.files.length == 0 || !loaded || dataFileInput.files[0].size > 50 * 1024 * 1024) {
        return;
    }
    loaded = false;
    sequences = [];
    let reader = new FileReader();
    reader.onload = function (textResult) {
        let text = textResult.target.result.split("\n");
        currentCategory = parseInt(text[0]);
        keyframeAlgorithm = parseInt(text[1]);
        text = text.slice(2).join("\n");
        sequences = Mocap.loadDataFromString(text);
        createRandomTest();
        console.log("Loaded " + sequences.length + " sequences from question.");
        loaded = true;
    }
    reader.onerror = function (e) {
        console.log("Loading the data file failed, most likely because of how big the file is.");
    }
    reader.readAsText(dataFileInput.files[0], "UTF-8");
}

function createRandomTest() {
    let time = performance.now();
    let targetElement = document.getElementById("drawRegion");
    targetElement.innerHTML = "";
    let chosenCategories = [];
    currentSequences = [];
    selectedSequences = [];
    currentVisualizationDivs = [];
    submittedAnswers = false;
    currentCategory = -1;
    let longestSequenceLength = 0;
    let targetLength = getRandomIntRange(130, 480);
    let randomizations = 0;
    if (sequences.length > 25) {
        let randomNum = getRandomInt(sequences.length);
        let category = Mocap.getSequenceCategory(sequences[randomNum]);
        currentCategory = category;
        let keys = Object.keys(Mocap.motionSuperCategories);
        keys.splice(Object.keys(Mocap.motionSuperCategories).indexOf("allCategories"), 1);
        let targetSuperCategory = keys.find((s) => Mocap.motionSuperCategories[s].indexOf(category) != -1);
        currentSequences.push(randomNum);
        longestSequenceLength = Mocap.getSequenceLength(sequences[randomNum]);
        targetLength = longestSequenceLength;
        console.log("Target length: " + targetLength + ", target supercategory: " + targetSuperCategory);
        for (let i = 0; i < parseInt(sameSupercategoryInput.value)-1; i++) {
            randomNum = getRandomInt(sequences.length);
            while (randomizations < 40000 && (currentSequences.indexOf(randomNum) != -1
                   || Mocap.motionSuperCategories[targetSuperCategory].indexOf(Mocap.getSequenceCategory(sequences[randomNum])) == -1
                   || Mocap.getSequenceLength(sequences[randomNum]) > targetLength*1.25+10 || Mocap.getSequenceLength(sequences[randomNum]) < targetLength*0.75-10)) {
                randomNum = getRandomInt(sequences.length);
                randomizations++;
            }
            currentSequences.push(randomNum);
            if (Mocap.getSequenceLength(sequences[randomNum]) > longestSequenceLength) {
                longestSequenceLength = Mocap.getSequenceLength(sequences[randomNum]);
            }
        }
        for (let i = 0; i < parseInt(randomSupercategoryInput.value); i++) {
            randomNum = getRandomInt(sequences.length);
            //while (randomizations < 10000 && (currentSequences.indexOf(randomNum) != -1 || getSequenceCategory(sequences[randomNum]) > multTargetCategory+4 || getSequenceCategory(sequences[randomNum]) < multTargetCategory-4 
            //|| getSequenceLength(sequences[randomNum]) > targetLength*1.25+10 || getSequenceLength(sequences[randomNum]) < targetLength*0.75-10)) {
            while (randomizations < 40000 && (currentSequences.indexOf(randomNum) != -1
                   || Mocap.getSequenceLength(sequences[randomNum]) > targetLength*1.25+10 || Mocap.getSequenceLength(sequences[randomNum]) < targetLength*0.75-10)) {
                randomNum = getRandomInt(sequences.length);
                randomizations++;
            }
            currentSequences.push(randomNum);
            if (Mocap.getSequenceLength(sequences[randomNum]) > longestSequenceLength) {
                longestSequenceLength = Mocap.getSequenceLength(sequences[randomNum]);
            }
        }
    } else {
        for (let i = 0; i < Math.min(sequences.length, 10); i++) {
            let randomNum = getRandomInt(sequences.length);
            while (currentSequences.indexOf(randomNum) != -1) {
                randomNum = getRandomInt(sequences.length);
            }
            currentSequences.push(randomNum);
            if (Mocap.getSequenceLength(sequences[randomNum]) > longestSequenceLength) {
                longestSequenceLength = Mocap.getSequenceLength(sequences[randomNum]);
            }
        }
    }
    shuffle(currentSequences);
    for (let i = 0; i < currentSequences.length; i++) {
        let sequence = sequences[currentSequences[i]];
        let visualization = Mocap.createZoomableVisualizationElement(sequence, Mocap.modelVicon, Math.ceil(10*(sequence.length/longestSequenceLength)), 12, 10, 
                                                       150, 150, 850*(sequence.length/longestSequenceLength), 150, false, true, keyframeAlgorithm);
        visualization.children[0].classList.add("drawBox");
        visualization.children[1].classList.add("drawBox");
        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("sequenceCheckbox");
        checkbox.onclick = function () {
            if (selectedSequences.indexOf(i) == -1) {
                selectedSequences.push(i);
            } else {
                selectedSequences.splice(selectedSequences.indexOf(i), 1);
            }
        };
        currentVisualizationDivs.push(visualization);
        visualization.appendChild(checkbox);
        targetElement.appendChild(visualization);
        let category = Mocap.getSequenceCategory(sequence);
        chosenCategories.push(category);
    }
    if (currentCategory == -1) {
        currentCategory = chosenCategories[getRandomInt(chosenCategories.length)];
    }
    resultText.innerHTML = "Select all sequences of category '" + Mocap.motionCategoriesHuman[currentCategory] + "'";
    console.log("Visualization done in " + (performance.now()-time) + "ms.");
} 

function remakeTest() {
    window.scrollTo(0, 0);
    keyframeAlgorithm = Mocap.KeyframeSelectionAlgorithmEnum[keyframeAlgorithmSelection.value];
    createRandomTest();
    submittedAnswers = false;
}

function submitAnswers() {
    if (submittedAnswers) {
        remakeTest();
        return;
    }
    submittedAnswers = true;
    let correct = [];
    for (let i = 0; i < currentSequences.length; i++) {
        let category = Mocap.getSequenceCategory(sequences[currentSequences[i]]);
        if (category == currentCategory) {
            correct.push(i);
            currentVisualizationDivs[i].classList.add("correctAnswer");
        }
    }
    let mistakes = 0;
    for (let i = 0; i < selectedSequences.length; i++) {
        if (correct.indexOf(selectedSequences[i]) == -1) {
            mistakes++;
        }
    }
    let selectedCorrect = 0;
    for (let i = 0; i < correct.length; i++) {
        if (selectedSequences.indexOf(correct[i]) != -1) {
            selectedCorrect++;
        }
    }
    resultText.innerHTML = "Selected " + selectedCorrect + "/" + correct.length + " of category " + Mocap.motionCategoriesHuman[currentCategory] + ". " + mistakes + " mistakes. Press submit again to continue.";
    window.scrollTo(0, 0);
}
