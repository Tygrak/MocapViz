import {
    addMapToVisualization, drawFrame,
    drawSequence,
    findKeyframes,
    initializeMocapRenderer,
    resizeSkeleton
} from "../mocap.js";
import * as Core from "../mocapCore.js";
import {rgbaToColorString, Vec3} from "../mocapCore.js";
import * as THREE from "../lib/three.module.js";

class VisualizationDrawer {
    numKeyframes = 10;
    sceneWidth = 100;
    startDotXPosition = 1;
    circleRadius = 0.1;
    #bars = document.createElement("canvas");
    #detail = document.createElement("canvas");
    #detailRenderer;

    constructor(visualizationWidth, visualizationHeight, drawStyle, jointsCount, drawStyleBlur, mapWidth, mapHeight, model) {
        this.drawStyle = drawStyle;
        this.drawStyleBlur = drawStyleBlur;
        this.visualizationWidth = visualizationWidth;
        this.visualizationHeight = visualizationHeight;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.model = model;

        this.div = document.createElement("div");
        this.image = document.createElement("img");
        this.image.className = "drawItemVisualization";

        this.#detailRenderer = initializeMocapRenderer(this.#detail, 600, 300, drawStyle, jointsCount, 10);

        this.canvas = document.createElement("canvas");
        this.style = drawStyle;
        this.style.figureScale = 1.5;
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

    drawLines(dots1, dots2, path, dtwArr, lineCoefficient, colorCoefficient, DTWcoeff, lowestDistance) {
        for (let i = 1; i < path.length; i += lineCoefficient) {
            let color = VisualizationDrawer.#getColorForIndex(i, path, dtwArr, colorCoefficient, DTWcoeff, false, lowestDistance);
            if (path[i - 1][0] >= dots1.length || path[i - 1][1] >= dots2.length) {
                break;
            }
            this.#drawLine(dots1[path[i - 1][0]], dots2[path[i - 1][1]], color);
        }
    }

    drawBars(dtws) {
        let height = 18;
        let textSpace = 100;
        let oneBarPieceWidth = 4;

        let dtw = dtws[0][0];
        const canvas = document.createElement("canvas");
        canvas.width = dtw.Map.length * oneBarPieceWidth + textSpace;
        canvas.height = 20 * dtws.length;
        const ctx = canvas.getContext('2d');
        ctx.font = `${height}px Arial`;

        for (let j = 0; j < dtws.length; j ++ ) {
            ctx.fillStyle = "black";
            ctx.fillText(dtws[j][1], 0, j * height + height, textSpace);
            for (let i = 1; i < dtws[j][0].Map.length; i ++) {
                let color = VisualizationDrawer.#getColorForIndex(i, dtws[j][0].Map, dtws[j][0].Arr, dtws[j][0].ColorCoeff, dtws[j][0].ContextColorCoeff, false, dtws[j][0].LowestDistance)
                ctx.fillStyle = VisualizationDrawer.#getRGBFromColor(color);
                ctx.fillRect(i * oneBarPieceWidth + textSpace, j * height, oneBarPieceWidth, height);
            }
        }

        this.#bars = canvas;
    }

    setDetailView(dtw, processedLongerSeqFrames, processedShorterSeqFrames) {
        this.image.onmousemove = (event) => this.#onMouseMoveMapping(event, dtw, processedLongerSeqFrames, processedShorterSeqFrames);
    }

    #onMouseMoveMapping(mouseEvent, dtw, processedLongerSeqFrames, processedShorterSeqFrames) {
        const longerFrames = processedLongerSeqFrames.frames;
        const shorterFrames = processedShorterSeqFrames.frames;
        let oneFrameVal = this.visualizationWidth / dtw.Map.length;
        let figureScale = processedLongerSeqFrames.figureScale;

        let index = Math.floor(mouseEvent.pageX / oneFrameVal);
        let longerSeqFrameIndex = dtw.Map[index][0];
        let shorterSeqFrameIndex = dtw.Map[index][1];

        let coreX = longerFrames[longerSeqFrameIndex][0].x;
        let longerSeqFrame = Core.moveOriginXBy(longerFrames[longerSeqFrameIndex], coreX);
        resizeSkeleton(this.#detailRenderer.skeleton, this.drawStyle, figureScale);
        drawFrame(this.#detailRenderer, longerSeqFrame, figureScale, 1, 0, this.drawStyle, true);

        coreX = shorterFrames[shorterSeqFrameIndex][0].x;
        let shorterSeqFrame = Core.moveOriginXBy(shorterFrames[shorterSeqFrameIndex], coreX);
        resizeSkeleton(this.#detailRenderer.skeleton, this.drawStyle, figureScale);
        drawFrame(this.#detailRenderer, shorterSeqFrame, figureScale, 3, 0, this.drawStyle, false);
    }

    putTogetherImage(longerProcessed, shorterProcessed) {
        this.div.appendChild(this.#addMapToSequence(longerProcessed, this.mapWidth, this.mapHeight));
        this.div.appendChild(this.#addMapToSequence(shorterProcessed, this.mapWidth, this.mapHeight));
        this.div.appendChild(this.#bars);
        this.div.appendChild(this.image);
        this.div.appendChild(this.#detail);

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

    #addMapToSequence(processed, mapWidth, mapHeight) {
        let frames = processed.frames;
        let keyframes = findKeyframes(frames, this.numKeyframes, Core.KeyframeSelectionAlgorithmEnum.Decimation);
        let figureScale = processed.figureScale;
        return addMapToVisualization(frames, keyframes, figureScale, this.model, mapWidth, mapHeight);
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

    static #getRGBFromColor(color) {
        return `rgb(${color}, ${255 - color}, 0)`;
    }
}

export {VisualizationDrawer};