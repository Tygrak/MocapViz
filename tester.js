let loaded = false;
let sequences = [];

loadData(function(response) {
    sequences = loadDataFromString(response);
    console.log("Loaded " + sequences.length + " sequences.");
    loaded = true;
    createRandomTest();
});

function loadData(callback) {   
    let xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/text");
    xobj.open('GET', 'hdm05slice2.data', true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            callback(xobj.responseText);
        }
    };
    xobj.send(null);  
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
