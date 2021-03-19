let loaded = false;
let sequences = [];
let currentSequences = [];
let selectedSequences = [];
let currentVisualizationDivs = [];
let currentCategory = 0;
let submittedAnswers = false;
const dataFileInput = document.getElementById("dataFileInput");
const loadButton = document.getElementById("dataInputLoadButton");
const submitButton = document.getElementById("submitAnswersButton");
const resultText = document.getElementById("resultText");
loadButton.onclick = loadDataFile;
submitButton.onclick = submitAnswers;

loadData(function(response) {
    sequences = loadDataFromString(response);
    console.log("Loaded " + sequences.length + " sequences.");
    loaded = true;
    createRandomTest();
});

function loadData(callback) {   
    let xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/text");
    xobj.open('GET', 'hdm05part.data', true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            callback(xobj.responseText);
        }
    };
    xobj.send(null);  
}

function loadDataFile() {
    if (dataFileInput.files.length == 0 || !loaded) {
        return;
    }
    loaded = false;
    sequences = [];
    let fileLocation = 0;
    let reader = new FileReader();
    let last = "";
    let loadChunkMbSize = 10;
    reader.onload = function (textResult) {
        let text = textResult.target.result;
        let split = text.split("#objectKey");
        split[0] = last+split[0];
        last = split[split.length-1];
        split.pop();
        sequences.push(...split.filter((s) => {return s != "";}).map((s) => s.split("\n")));
        fileLocation += loadChunkMbSize*1024*1024;
        if (dataFileInput.files[0].size > fileLocation) {
            reader.readAsText(dataFileInput.files[0].slice(fileLocation, fileLocation+loadChunkMbSize*1024*1024), "UTF-8");
        } else if (last.trim() != "") {
            sequences.push(last.split("\n"));
            loaded = true;
            console.log("Loaded " + sequences.length + " sequences.");
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

function createRandomTest() {
    let targetElement = document.getElementById("drawRegion");
    targetElement.innerHTML = "";
    let chosenCategories = [];
    currentSequences = [];
    selectedSequences = [];
    currentVisualizationDivs = [];
    for (let i = 0; i < Math.min(sequences.length, 10); i++) {
        let randomNum = getRandomInt(sequences.length);
        while (currentSequences.indexOf(randomNum) != -1) {
            randomNum = getRandomInt(sequences.length);
        }
        currentSequences.push(randomNum);
        let sequence = sequences[randomNum];
        let visualization = createVisualizationElement(sequence, modelVicon, 10, 10, 200, 200, 1000, 200, true);
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
        let category = getSequenceCategory(sequence);
        chosenCategories.push(category);
    }
    currentCategory = chosenCategories[getRandomInt(chosenCategories.length)];
    resultText.innerHTML = "Select all sequences of category " + motionCategories[currentCategory];
} 

function submitAnswers() {
    if (submittedAnswers) {
        window.scrollTo(0, 0);
        createRandomTest();
        submittedAnswers = false;
        return;
    }
    submittedAnswers = true;
    let correct = [];
    for (let i = 0; i < currentSequences.length; i++) {
        let category = getSequenceCategory(sequences[currentSequences[i]]);
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
    resultText.innerHTML = "Selected " + selectedCorrect + "/" + correct.length + " of category " + motionCategories[currentCategory] + ". " + mistakes + " mistakes. Press submit again to continue.";
    window.scrollTo(0, 0);
}
