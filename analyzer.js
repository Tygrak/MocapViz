let loaded = true;
let sequences = [];
const dataFileInput = document.getElementById("dataFileInput");
const loadButton = document.getElementById("dataInputLoadButton");
const submitButton = document.getElementById("submitAnswersButton");
const resultText = document.getElementById("resultText");
loadButton.onclick = loadDataFile;
submitButton.onclick = submitAnswers;

/*
loaded = false;
loadData(function(response) {
    sequences = loadDataFromString(response);
    console.log("Loaded " + sequences.length + " sequences.");
    loaded = true;
    createRandomTest();
});*/

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

const numKeyframes = 12;

function calculateError(keyframeSelectionAlgorithm) {
    let totalError = 0;
    for (let i = 0; i < sequences.length; i++) {
        let frames = processSequenceToFrames(sequences[i], 200, 0.5);
        let keyframes;
        if (keyframeSelectionAlgorithm == KeyframeSelectionAlgorithmEnum.Decimation) {
            keyframes = findKeyframesDecimation(frames, numKeyframes);
        } else if (keyframeSelectionAlgorithm == KeyframeSelectionAlgorithmEnum.Lowe) {
            keyframes = findKeyframesLowe(frames, numKeyframes);
        } else if (keyframeSelectionAlgorithm == KeyframeSelectionAlgorithmEnum.Euclidean) {
            keyframes = findKeyframesEuclidean(frames, numKeyframes);
        } else if (keyframeSelectionAlgorithm == KeyframeSelectionAlgorithmEnum.Equidistant) {
            keyframes = findKeyframesEquidistant(frames, numKeyframes);
            keyframes[keyframes.length-1] = frames.length-1;
        } else {
            keyframes = findKeyframesTemporal(frames, numKeyframes);
        }
        let error = 0;
        let keyframePos = 0;
        for (let j = 0; j < frames.length; j++) {
            if (keyframes[keyframePos+1] < j) {
                keyframePos++;
            }
            let pos = inverseLerp(keyframes[keyframePos], keyframes[keyframePos+1], j);
            let interpolatedFrame = lerpFrame(frames[keyframes[keyframePos]], frames[keyframes[keyframePos+1]], pos);
            error += frameDistance(frames[j], interpolatedFrame);
        }
        totalError += error;
    }
    return totalError/sequences.length;
}

function submitAnswers() {
    console.log("start!");
    resultText.innerHTML = "Decimation avg. error: " +  calculateError(KeyframeSelectionAlgorithmEnum.Decimation) + "\n";
    console.log("decimation!");
    resultText.innerHTML += "Lowe avg. error: " +  calculateError(KeyframeSelectionAlgorithmEnum.Lowe) + "\n"
    console.log("lowe!");
    resultText.innerHTML += "Euclidean avg. error: " +  calculateError(KeyframeSelectionAlgorithmEnum.Euclidean) + "\n"
    console.log("euclidean!");
    resultText.innerHTML += "Temporal avg. error: " +  calculateError(KeyframeSelectionAlgorithmEnum.Temporal) + "\n"
    console.log("temporal!");
    resultText.innerHTML += "Equidistant avg. error: " +  calculateError(KeyframeSelectionAlgorithmEnum.Equidistant) + "\n";
    console.log("equidistant!");
    console.log("done!");
}
