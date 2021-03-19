let loaded = false;
let sequences = [];
const dataFileInput = document.getElementById("dataFileInput");
const loadButton = document.getElementById("dataInputLoadButton");
loadButton.onclick = loadDataFile;

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

function createRandomTest() {
    let randomNum = getRandomInt(sequences.length);
    let sequence = sequences[randomNum];
    let targetElement = document.getElementById("drawRegion");
    targetElement.innerHTML = "";
    let visualization = createVisualizationElement(sequence, modelVicon, 10, 10, 200, 200, 1000, 200);
    visualization.children[0].classList.add("drawBox");
    visualization.children[1].classList.add("drawBox");
    targetElement.appendChild(visualization);
    let correctCategory = getSequenceCategory(sequence);
    let chosenCategories = [];
    let buttons = document.getElementById("answerButtons").getElementsByTagName("button");
    let resultText = document.getElementById("resultText");
    let correct = getRandomInt(buttons.length);
    buttons[correct].innerText = motionCategories[correctCategory];
    buttons[correct].onclick = function () {resultText.innerText = "Correct!"; createRandomTest();};
    for (let i = 0; i < buttons.length; i++) {
        if (i == correct) {
            continue;
        }
        let category = getRandomIntRange(22, 152);
        while (category == correctCategory || chosenCategories.indexOf(category) != -1 || category == 140) {
            category = getRandomIntRange(22, 152);
        }
        //console.log("Incorrect " + i + " " + motionCategories[category]);
        chosenCategories.push(category);
        buttons[i].innerText = motionCategories[category.toFixed(0)];
        buttons[i].onclick = function () {resultText.innerText = "Wrong! Correct was: " + motionCategories[correctCategory]; createRandomTest();};
    }
    console.log("Correct " + correct + " " + motionCategories[correctCategory]);
    console.log("Sequence " + randomNum);
} 
