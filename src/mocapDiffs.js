import * as Core from './mocapCore.js';

import {
    clearRenderer,
    drawSequence,
    findKeyframes,
    initializeMocapRenderer,
    resizeSkeleton,
    addMapToVisualization
} from "./mocap.js";

import * as THREE from "./lib/three.module.js";
import {Vec3} from "./mocapCore.js";
import * as Model from "./model.js";

const sceneWidth = 100;
const numKeyframes = 10;
const circleRadius = 0.1;
const startDotXPosition = 1;
const model = Model.modelVicon;

function createDiffVisualization(mainRenderer, sequence1, sequence2, visualizationWidth, visualizationHeight, drawStyle, drawStyleBlur, mapWidth, mapHeight, lineCoefficient = 5) {
    let longerSeq;
    let shorterSeq;
    if (sequence1.length > sequence2.length) {
        longerSeq = sequence1;
        shorterSeq = sequence2
    } else {
        longerSeq = sequence2;
        shorterSeq = sequence1;
    }

    let div = document.createElement("div");
    let image = document.createElement("img");
    image.className = "drawItemVisualization";

    let canvas = document.createElement("canvas");
    let jointsCount = Core.getSequenceJointsPerFrame(longerSeq);
    mainRenderer = initializeMocapRenderer(canvas, visualizationWidth, visualizationHeight, drawStyle, jointsCount);

    // draw skeletons
    let yThird = visualizationHeight / (visualizationWidth / visualizationHeight * 6);
    let longerProcessed = Core.processSequence(longerSeq, numKeyframes, sceneWidth, visualizationWidth, visualizationHeight  / 3, drawStyle);
    let longerPositions = drawSequenceIntoImage(mainRenderer, longerProcessed, drawStyle, drawStyleBlur, yThird * 2);

    let shorterProcessed = Core.processSequence(shorterSeq, numKeyframes, sceneWidth, visualizationWidth, visualizationHeight  / 3, drawStyle);
    let shorterPositions = drawSequenceIntoImage(mainRenderer, shorterProcessed, drawStyle, drawStyleBlur, 0, longerSeq.length / shorterSeq.length);

    // count DTW
    let DTWArr = countDTW(prepareSequence(longerSeq), prepareSequence(shorterSeq), compareTwoTimeSeries);
    console.log(DTWArr[DTWArr.length - 1][DTWArr[0].length - 1]);
    let DTWMapping = countMatrix(DTWArr);

    // draw dots
    const largestDistance = findLargestDistance(DTWMapping, DTWArr);
    let colorCoefficient = 255 / largestDistance;
    let dotCoords1 = drawDots(mainRenderer, yThird * 2, longerPositions, longerProcessed.frames, DTWMapping, DTWArr, colorCoefficient);
    let dotCoords2 = drawDots(mainRenderer, yThird, shorterPositions, shorterProcessed.frames, DTWMapping, DTWArr, colorCoefficient, true);

    // draw lines
    drawLines(mainRenderer, dotCoords1, dotCoords2, DTWMapping, DTWArr, lineCoefficient, colorCoefficient);

    // add maps
    div.appendChild(addMapToSequence(longerProcessed, mapWidth, mapHeight));
    div.appendChild(image);
    div.appendChild(addMapToSequence(shorterProcessed, mapWidth, mapHeight));
    image.src = mainRenderer.canvas.toDataURL("image/png");
    image.height = visualizationHeight;
    image.width = visualizationWidth;
    div.style.position = "relative";

    return div;
}

function addMapToSequence(processed, mapWidth, mapHeight) {
    let frames = processed.frames;
    let keyframes = findKeyframes(frames, numKeyframes, Core.KeyframeSelectionAlgorithmEnum.Decimation);
    let figureScale = processed.figureScale;
    return addMapToVisualization(frames, keyframes, figureScale, model, mapWidth, mapHeight);
}

function drawSequenceIntoImage(mainRenderer, processed, drawStyle, drawStyleBlur, yShift, xCoefficient = 1) {
    let figureScale = processed.figureScale;
    let frames = processed.frames;
    resizeSkeleton(mainRenderer.skeleton, drawStyle, figureScale);
    let keyframes = findKeyframes(frames, numKeyframes, Core.KeyframeSelectionAlgorithmEnum.Decimation);

    let fillKeyframes = Core.getFillKeyframes(frames, keyframes, sceneWidth);
    let fillStyle = new Core.MocapDrawStyle(drawStyle.skeletonModel,  drawStyle.boneRadius, drawStyle.jointRadius,
        drawStyle.headRadius, drawStyle.boneStyle, drawStyle.leftBoneStyle, drawStyle.rightBoneStyle,
        drawStyle.jointStyle, drawStyle.figureScale, drawStyle.noseStyle, drawStyle.noseRadius, 0.4);
    drawSequence(mainRenderer, frames, fillKeyframes, 0, fillStyle, drawStyleBlur, figureScale, yShift, false, true, xCoefficient);

    return drawSequence(mainRenderer, frames, keyframes, 0, drawStyle, drawStyleBlur, figureScale, yShift, false, true, xCoefficient);
}

function drawDots(mainRenderer, dotYShift, positions, frames, path, dtwArr, colorCoefficient, shorter = false) {
    let shift = positions[positions.length - 1]/frames.length;
    let xPosition = startDotXPosition;
    let dots = [];
    for (let i = 1; i < frames.length; i ++) {
        let color = getColorForIndex(i, path, dtwArr, colorCoefficient, shorter);
        drawDotFrame(mainRenderer, xPosition, dotYShift, circleRadius, color);
        dots.push(new Vec3(xPosition, dotYShift, 0));
        xPosition += shift;
    }
    return dots;
}

function getColorForIndex(index, path, dtwArr, colorCoefficient, shorter) {
    let colorValue;
    let i = (shorter) ? getIndexForShorterSequence(path, index) : index;
    if (i > 0) {
        colorValue = dtwArr[path[i][0]][path[i][1]] - dtwArr[path[i - 1][0]][path[i - 1][1]];
    } else {
        colorValue = dtwArr[path[i][0]][path[i][1]];
    }
    return Math.floor(colorCoefficient * colorValue);
}

function getIndexForShorterSequence(path, searchingValue) {
    for (let i = 0; i < path.length; i ++) {
        if (path[i][1] === searchingValue) {
            return i;
        }
    }
    return -1;
}

function drawDotFrame(mocapRenderer, xPosition, yPosition, circleRadius, color) {
    let scene = new THREE.Scene();
    const geometry = new THREE.CircleGeometry(circleRadius, 32);
    const material = new THREE.MeshBasicMaterial( { color: `rgb(${color}, ${255 - color}, 0)` } );
    const circle = new THREE.Mesh(geometry, material);
    circle.position.set(xPosition, 0.1 + yPosition, 0);
    scene.add(circle);
    mocapRenderer.renderer.render(scene, mocapRenderer.camera);
}

function countDTW(seq1, seq2, comparisonFunction) {
    let len1 = seq1.length + 1;
    let len2 = seq2.length + 1;
    let arr = new Array(len1);
    for (let i = 0; i < len1; i++) {
        arr[i] = new Array(len2);
    }

    for (let i = 0; i < len1; i++) {
        arr[i][0] = Number.POSITIVE_INFINITY;
    }

    for (let i = 0; i < len2; i++) {
        arr[0][i] = Number.POSITIVE_INFINITY;
    }

    arr[0][0] = 0;

    for (let i = 1; i < len1; i++) {
        for (let j = 1; j < len2; j++) {
            let square = new DTWSquare(arr[i - 1][j - 1], arr[i][j - 1], arr[i - 1][j]);
            arr[i][j] = comparisonFunction(seq1[i - 1], seq2[j - 1], square);
        }
    }

    return arr;
}

function prepareSequence(seq) {
    let frames = seq.map((frame) => {
        return frame.replace(" ", "").split(';').map((joint) => {
            let xyz = joint.split(',');
            return {x:xyz[0], y:xyz[1], z:xyz[2]};
        });
    });
    return frames.filter((f) => {return f.length > 0 && !isNaN(f[0].x) && !isNaN(f[0].y) && !isNaN(f[0].z)});
}

function DTWSquare(v1, v2, v3) {
    this.leftUpper = v1;
    this.leftBottom = v2;
    this.rightBottom = v3;
}

function compareTwoTimeSeries(m1, m2, square) {
    let euclidDistance = getValueFromModels(m1, m2);
    let minPreviousValue = Math.min(square.leftBottom, square.leftUpper, square.rightBottom);
    return euclidDistance + minPreviousValue;
}

function  getValueFromModels(m1, m2) {
    let res = 0;
    for (let i = 0; i < m1.length; i++) {
        res += getVectorEuclideanDistance(m1[i], m2[i]);
    }
    return Math.sqrt(res);
}

function  getVectorEuclideanDistance(v1, v2) {
    return Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2) + Math.pow(v1.z - v2.z, 2);
}

function countMatrix(arr) {
    let len1 = arr.length;
    let len2 = arr[0].length;
    let pathArr = new Array(len1);
    for (let i = 0; i < len1; i++) {
        pathArr[i] = new Array(len2);
    }
    for (let i = 0; i < len1; i++) {
        for (let j = 0; j < len2; j++) {
            pathArr[i][j] = new PathArrEl(Number.POSITIVE_INFINITY, []);
        }
    }
    pathArr[0][0] = new PathArrEl(0, [[0,0]]);
    pathArr[1][1] = new PathArrEl(arr[1][1], [[0,0], [1,1]]);
    let queue = [ [1, 1] ];
    while (queue.length !== 0) {
        let coords = queue.shift();
        let i = coords[0];
        let j = coords[1];
        // move right : depends on how you look at it
        if (i + 1 !== len1 && pathArr[i + 1][j].value > pathArr[i][j].value + arr[i + 1][j]) {
            queue.push([i + 1, j]);

            let path = pathArr[i][j].path.slice();
            path.push([i + 1, j]);
            pathArr[i + 1][j] = new PathArrEl(pathArr[i][j].value + arr[i + 1][j], path);
        }

        // move bottom right
        if (i + 1 !== len1 && j + 1 !== len2 && pathArr[i + 1][j + 1].value > pathArr[i][j].value + arr[i + 1][j + 1]) {
            queue.push([i + 1, j + 1]);

            let path = pathArr[i][j].path.slice();
            path.push([i + 1, j + 1]);
            pathArr[i + 1][j + 1] = new PathArrEl(pathArr[i][j].value + arr[i + 1][j + 1], path);
        }

        // move bottom
        if (j + 1 !== len2 && pathArr[i][j + 1].value > pathArr[i][j].value + arr[i][j + 1]) {
            queue.push([i, j + 1]);

            let path = pathArr[i][j].path.slice();
            path.push([i,j + 1]);
            pathArr[i][j + 1] = new PathArrEl(pathArr[i][j].value + arr[i][j + 1], path);
        }
    }

    return pathArr[len1 - 1][len2 - 1].path;
}

function PathArrEl(value, path) {
    this.value = value;
    this.path = path;
}

function drawLines(mocapRenderer, dots1, dots2, path, dtwArr, lineCoefficient, colorCoefficient) {
    for (let i = 1; i < path.length; i += lineCoefficient) {
        let color = getColorForIndex(i, path, dtwArr, colorCoefficient, false);
        if (path[i - 1][0] >= dots1.length || path[i - 1][1] >= dots2.length){
            break;
        }
        drawLine(mocapRenderer, dots1[path[i - 1][0]], dots2[path[i - 1][1]], color);
    }
}

function drawLine(mocapRenderer, coord1, coord2, color) {
    let scene = new THREE.Scene();
    const material = new THREE.LineBasicMaterial( { color: `rgb(${color}, ${255 - color}, 0)` } );
    const points = [];
    points.push( new THREE.Vector3( coord1.x, coord1.y, coord1.z));
    points.push( new THREE.Vector3( coord2.x, coord2.y, coord2.z));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    mocapRenderer.renderer.render(scene, mocapRenderer.camera);
}

function findLargestDistance(path, dtwArr) {
    let max = 0;
    for (let i = 1; i < path.length; i ++) {
        let newVal = dtwArr[path[i][0]][path[i][1]] - dtwArr[path[i - 1][0]][path[i - 1][1]];
        max = (newVal > max) ? newVal : max;
    }
    return max;
}

export {createDiffVisualization};
export {VisualizationFactory, visualizeToCanvas, createVisualizationElement, createZoomableVisualizationElement, createAnimationElement, drawSequence, resizeSkeleton, findKeyframes, clearRenderer, initializeMocapRenderer, resizeMocapRenderer} from './mocap.js';
export {loadDataFromString, loadDataFromFile, getSequenceLength, getSequenceCategory, getSequenceJointsPerFrame, KeyframeSelectionAlgorithmEnum} from './mocapCore.js';
export * from './model.js';
export * from './asfAmcParser.js';
