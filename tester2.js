let loaded = true;
let sequences = [];
let currentSequences = [];
let selectedSequences = [];
let currentVisualizationDivs = [];
let currentCategory = 0;
let submittedAnswers = false;
let keyframeAlgorithm = KeyframeSelectionAlgorithmEnum.Decimation;
const dataFileInput = document.getElementById("dataFileInput");
const loadButton = document.getElementById("dataInputLoadButton");
const submitButton = document.getElementById("submitAnswersButton");
const saveQuestionFileButton = document.getElementById("saveQuestionFileButton");
const loadQuestionFileButton = document.getElementById("loadQuestionFileButton");
const resultText = document.getElementById("resultText");
loadButton.onclick = loadDataFile;
submitButton.onclick = submitAnswers;
saveQuestionFileButton.onclick = saveQuestion;
loadQuestionFileButton.onclick = loadQuestion;


loaded = false;
loadData(function(response) {
    sequences = loadDataFromString(response);
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

function getSimilarCategory(category) {
    return Math.min(152, Math.max(22, getRandomIntRange(category-4, category+5)));
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
    if (dataFileInput.files.length == 0 || !loaded) {
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
        sequences = loadDataFromString(text);
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
    let targetElement = document.getElementById("drawRegion");
    targetElement.innerHTML = "";
    let chosenCategories = [];
    currentSequences = [];
    selectedSequences = [];
    currentVisualizationDivs = [];
    submittedAnswers = false;
    let longestSequenceLength = 0;
    let targetLength = getRandomIntRange(130, 480);
    let randomizations = 0;
    if (sequences.length > 150) {
        console.log("Target length: " + targetLength);
        let amountMult = getRandomIntRange(1, 5); 
        let multTarget = getRandomInt(sequences.length);
        while (getSequenceLength(sequences[multTarget]) > targetLength*1.25+10 || getSequenceLength(sequences[multTarget]) < targetLength*0.75-10) {
            multTarget = getRandomInt(sequences.length);
        }
        let multTargetCategory = getSequenceCategory(sequences[multTarget]);
        console.log("Target category: " + multTargetCategory);
        currentSequences.push(multTarget);
        longestSequenceLength = getSequenceLength(sequences[multTarget]);
        for (let i = 0; i < amountMult; i++) {
            let randomNum = getRandomInt(sequences.length);
            while (randomizations < 10000 && (currentSequences.indexOf(randomNum) != -1 || getSequenceCategory(sequences[randomNum]) > multTargetCategory+4 || getSequenceCategory(sequences[randomNum]) < multTargetCategory-4 
                    || getSequenceLength(sequences[randomNum]) > targetLength*1.25+10 || getSequenceLength(sequences[randomNum]) < targetLength*0.75-10)) {
                randomNum = getRandomInt(sequences.length);
                randomizations++;
            }
            currentSequences.push(randomNum);
            if (getSequenceLength(sequences[randomNum]) > longestSequenceLength) {
                longestSequenceLength = getSequenceLength(sequences[randomNum]);
            }
        }
        for (let i = 0; i < 9-amountMult; i++) {
            let randomNum = getRandomInt(sequences.length);
            while (randomizations < 10000 && (currentSequences.indexOf(randomNum) != -1 
                    || getSequenceLength(sequences[randomNum]) > targetLength*1.25+10 || getSequenceLength(sequences[randomNum]) < targetLength*0.75-10)) {
                randomNum = getRandomInt(sequences.length);
                randomizations++;
            }
            currentSequences.push(randomNum);
            if (getSequenceLength(sequences[randomNum]) > longestSequenceLength) {
                longestSequenceLength = getSequenceLength(sequences[randomNum]);
            }
        }
    } else {
        for (let i = 0; i < Math.min(sequences.length, 10); i++) {
            let randomNum = getRandomInt(sequences.length);
            while (currentSequences.indexOf(randomNum) != -1) {
                randomNum = getRandomInt(sequences.length);
            }
            currentSequences.push(randomNum);
            if (getSequenceLength(sequences[randomNum]) > longestSequenceLength) {
                longestSequenceLength = getSequenceLength(sequences[randomNum]);
            }
        }
    }
    shuffle(currentSequences);
    for (let i = 0; i < currentSequences.length; i++) {
        let sequence = sequences[currentSequences[i]];
        let visualization = createZoomableVisualizationElement(sequence, modelVicon, Math.ceil(10*(sequence.length/longestSequenceLength)), 10, 
                                                       150, 150, 850*(sequence.length/longestSequenceLength), 150, false, false, keyframeAlgorithm);
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
    resultText.innerHTML = "Select all sequences of category '" + motionCategoriesHuman[currentCategory] + "'";
} 

function submitAnswers() {
    if (submittedAnswers) {
        window.scrollTo(0, 0);
        keyframeAlgorithm = KeyframeSelectionAlgorithmEnum[keyframeAlgorithmSelection.value];
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
    resultText.innerHTML = "Selected " + selectedCorrect + "/" + correct.length + " of category " + motionCategoriesHuman[currentCategory] + ". " + mistakes + " mistakes. Press submit again to continue.";
    window.scrollTo(0, 0);
}
