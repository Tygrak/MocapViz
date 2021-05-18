import * as Mocap from '../src/mocap.js';

const asfFileInput = document.getElementById("asfFileInput");
const amcFileInput = document.getElementById("amcFileInput");
const visualizeButton = document.getElementById("visualizeButton");
const animateButton = document.getElementById("animateButton");
const drawRegion = document.getElementById("drawRegion");

visualizeButton.onclick = () => {Mocap.loadAsfAmcFile(asfFileInput.files[0], amcFileInput.files[0],
    (result) => {
        let seq = result.sequence;
        let factory = new Mocap.VisualizationFactory();
        factory.numKeyframes = 14;
        factory.model = result.skeletonModel;
        drawRegion.innerHTML = "";
        drawRegion.appendChild(factory.createVisualization(seq, window.innerWidth-450, 250, 250, 250));
    })
};
animateButton.onclick = () => {Mocap.loadAsfAmcFile(asfFileInput.files[0], amcFileInput.files[0],
    (result) => {
        let seq = result.sequence;
        drawRegion.innerHTML = "";
        drawRegion.appendChild(Mocap.createAnimationElement(seq, result.skeletonModel, window.innerWidth-450, window.innerHeight-200));
    })
};
