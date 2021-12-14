import {addMapToVisualization, drawSequence, findKeyframes, initializeMocapRenderer, resizeSkeleton} from "../mocap.js";
import * as Core from "../mocapCore.js";
import {rgbaToColorString, Vec3} from "../mocapCore.js";
import * as THREE from "../lib/three.module.js";
import * as Model from "../model.js";

class VisualizationDrawer {
    numKeyframes = 10;
    sceneWidth = 100;
    startDotXPosition = 1;
    circleRadius = 0.1;
    model = Model.modelVicon;
    #bars = document.createElement("canvas");

    constructor(visualizationWidth, visualizationHeight, drawStyle, jointsCount, drawStyleBlur, mapWidth, mapHeight) {
        this.drawStyle = drawStyle;
        this.drawStyleBlur = drawStyleBlur;
        this.visualizationWidth = visualizationWidth;
        this.visualizationHeight = visualizationHeight;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;

        this.div = document.createElement("div");
        this.image = document.createElement("img");
        this.image.className = "drawItemVisualization";

        this.canvas = document.createElement("canvas");
        this.mainRenderer = initializeMocapRenderer(this.canvas, visualizationWidth, visualizationHeight, drawStyle, jointsCount);
    }

    processSequenceForDrawing(seq) {
        return Core.processSequence(seq, this.numKeyframes, this.sceneWidth, this.visualizationWidth, this.visualizationHeight / 3, this.drawStyle, true, false);
    }

    drawSequenceIntoImage(processed, yShift, xCoefficient = 1) {
        let figureScale = processed.figureScale;
        let frames = processed.frames;
        resizeSkeleton(this.mainRenderer.skeleton, this.drawStyle, figureScale);
        let keyframes = findKeyframes(frames, this.numKeyframes, Core.KeyframeSelectionAlgorithmEnum.Decimation);

        let fillKeyframes = Core.getFillKeyframes(frames, keyframes, this.sceneWidth);
        let fillStyle = new Core.MocapDrawStyle(this.drawStyle.skeletonModel, this.drawStyle.boneRadius, this.drawStyle.jointRadius,
            this.drawStyle.headRadius, this.drawStyle.boneStyle, this.drawStyle.leftBoneStyle, this.drawStyle.rightBoneStyle,
            this.drawStyle.jointStyle, this.drawStyle.figureScale, this.drawStyle.noseStyle, this.drawStyle.noseRadius, 0.4);
        drawSequence(this.mainRenderer, frames, fillKeyframes, 0, fillStyle, this.drawStyleBlur, figureScale, yShift, false, true, xCoefficient);

        return drawSequence(this.mainRenderer, frames, keyframes, 0, this.drawStyle, this.drawStyleBlur, figureScale, yShift, false, true, xCoefficient);
    }

    drawDTWValueToImage(dtwValue) {
        let text = document.createElement("p");
        text.textContent = "DTW value: " + dtwValue;
        this.div.appendChild(text);
    }

    drawDots(dotYShift, positions, frames, dtwMap, dtwArr, colorCoefficient, DTWcoeff, lowestDistance, shorter = false) {
        let shift = positions[positions.length - 1] / frames.length;
        let xPosition = this.startDotXPosition;
        let dots = [];
        for (let i = 1; i < frames.length; i++) {
            let color = VisualizationDrawer.#getColorForIndex(i, dtwMap, dtwArr, colorCoefficient, DTWcoeff, shorter, lowestDistance);
            this.#drawDotFrame(xPosition, dotYShift, this.circleRadius, color);
            dots.push(new Vec3(xPosition, dotYShift, 0));
            xPosition += shift;
        }
        return dots;
    }

    putTogetherImage(longerProcessed, shorterProcessed) {
        this.div.appendChild(this.#addMapToSequence(longerProcessed, this.mapWidth, this.mapHeight));
        this.div.appendChild(this.image);
        this.div.appendChild(this.#addMapToSequence(shorterProcessed, this.mapWidth, this.mapHeight));
        this.div.appendChild(this.#bars);
        //this.div.appendChild(VisualizationDrawer.#drawBar(100, 100));
        this.image.src = this.mainRenderer.canvas.toDataURL("image/png");
        this.image.height = this.visualizationHeight;
        this.image.width = this.visualizationWidth;
        this.div.style.position = "relative";

        return this.div;
    }

    #drawDotFrame(xPosition, yPosition, circleRadius, color) {
        let scene = new THREE.Scene();
        const geometry = new THREE.CircleGeometry(circleRadius, 32);
        let rgb = VisualizationDrawer.#getRGBFromColor(color);
        const material = new THREE.MeshBasicMaterial({color: rgb});
        const circle = new THREE.Mesh(geometry, material);
        circle.position.set(xPosition, 0.1 + yPosition, 0);
        scene.add(circle);
        this.mainRenderer.renderer.render(scene, this.mainRenderer.camera);
    }

    drawLines(dots1, dots2, path, dtwArr, lineCoefficient, colorCoefficient, DTWcoeff, lowestDistance) {
        for (let i = 1; i < path.length; i += lineCoefficient) {
            let color = VisualizationDrawer.#getColorForIndex(i, path, dtwArr, colorCoefficient, DTWcoeff, false, lowestDistance);
            if (path[i - 1][0] >= dots1.length || path[i - 1][1] >= dots2.length) {
                break;
            }
            this.#drawLine(dots1[path[i - 1][0]], dots2[path[i - 1][1]], color);
        }
    }

    #drawLine(coord1, coord2, color) {
        let scene = new THREE.Scene();
        let rgb = VisualizationDrawer.#getRGBFromColor(color);
        const material = new THREE.LineBasicMaterial({color: rgb});

        const points = [];
        points.push( new THREE.Vector3( coord1.x, coord1.y, coord1.z));
        points.push( new THREE.Vector3( coord2.x, coord2.y, coord2.z));

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        this.mainRenderer.renderer.render(scene, this.mainRenderer.camera);
    }

    static #getColorForIndex(index, path, dtwArr, colorCoefficient, DTWcoeff, shorter, lowestDistance) {
        let colorValue;
        let i = (shorter) ? VisualizationDrawer.#getIndexForShorterSequence(path, index) : index;
        if (i > 0) {
            colorValue = dtwArr[path[i][0]][path[i][1]] - dtwArr[path[i - 1][0]][path[i - 1][1]];
        } else {
            colorValue = dtwArr[path[i][0]][path[i][1]];
        }
        colorValue -= lowestDistance;
        return Math.floor((colorCoefficient * colorValue) + DTWcoeff);
    }

    static #getIndexForShorterSequence(path, searchingValue) {
        for (let i = 0; i < path.length; i ++) {
            if (path[i][1] === searchingValue) {
                return i;
            }
        }
        return -1;
    }

    #addMapToSequence(processed, mapWidth, mapHeight) {
        let frames = processed.frames;
        let keyframes = findKeyframes(frames, this.numKeyframes, Core.KeyframeSelectionAlgorithmEnum.Decimation);
        let figureScale = processed.figureScale;
        return addMapToVisualization(frames, keyframes, figureScale, this.model, mapWidth, mapHeight);
    }

    drawBars(dtws) {
        let dtw = dtws[0];
        const canvas = document.createElement("canvas");
        canvas.width = dtw.Map.length * 3;
        canvas.height = 10 * dtws.length;
        const ctx = canvas.getContext('2d');

        for (let j = 0; j < dtws.length; j ++ ) {
            for (let i = 1; i < dtws[j].Map.length; i ++) {
                let color = VisualizationDrawer.#getColorForIndex(i, dtws[j].Map, dtws[j].Arr, dtws[j].ColorCoeff, dtws[j].ContextColorCoeff, false, dtws[j].LowestDistance)
                ctx.fillStyle = VisualizationDrawer.#getRGBFromColor(color);
                ctx.fillRect(i * 3, j * 10, 3, 10);
            }
        }

        this.#bars = canvas;
    }

    static #getRGBFromColor(color) {
        return `rgb(${color}, ${255 - color}, 0)`;
    }

    //TODO: implement
    static #drawBar(barWidth, barHeight) {
        let canvas = document.createElement("canvas");
        canvas.className = "drawItemMap";
        canvas.width = barWidth;
        canvas.height = barHeight;
        canvas.style = "width: "+barWidth+"px; height: "+barHeight+"px;";

        let ctx = canvas.getContext("2d");
        ctx.fillStyle = rgbaToColorString("rgba(10,100,100)");
        ctx.beginPath();
        ctx.moveTo(5, 5);
        ctx.lineTo(50, 5);
        ctx.lineTo(50, 50);
        ctx.lineTo(5, 50);
        ctx.lineTo(5, 5);
        ctx.closePath();
        ctx.fill();

        this.bar = canvas;
        return canvas;
    }
}

export {VisualizationDrawer};