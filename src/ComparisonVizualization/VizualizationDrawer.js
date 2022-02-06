import {
    addMapToVisualization, drawFrame,
    drawSequence,
    findKeyframes,
    initializeMocapRenderer,
    resizeSkeleton
} from "../mocap.js";
import * as Core from "../mocapCore.js";
import {Vec3} from "../mocapCore.js";
import * as THREE from "../lib/three.module.js";
import {VisualizationService} from "./VisualizationService.js";

class VisualizationDrawer {
    numKeyframes = 10;
    sceneWidth = 100;
    circleRadius = 0.1;
    #bars = document.createElement("canvas");
    #timeAlignedMapping = document.createElement("canvas");
    #detail = document.createElement("canvas");
    #detailRenderer;
    #detailPosePositionColor = 'rgb(30,144,255)';
    #coloredPose = new ColoredPose();

    constructor(visualizationWidth, visualizationHeight, drawStyle, jointsCount, drawStyleBlur, mapWidth, mapHeight, model) {
        this.drawStyle = drawStyle;
        this.drawStyleBlur = drawStyleBlur;
        this.visualizationWidth = visualizationWidth;
        this.visualizationHeight = visualizationHeight;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.model = model;

        this.textSpace = 80;
        this.textHeight = 16;
        this.xDefaultShift = 1;
        this.startDotXPosition = this.circleRadius;

        this.div = document.createElement("div");

        this.#detailRenderer = initializeMocapRenderer(this.#detail, visualizationWidth / 3.2, 200, drawStyle, jointsCount, 10);

        this.canvas = document.createElement("canvas");
        this.style = drawStyle;
        this.style.figureScale = 1.5;
        this.mainRenderer = initializeMocapRenderer(this.canvas, visualizationWidth, visualizationHeight, drawStyle, jointsCount);

        this.timeAlignedCanvas = document.createElement("canvas");
        this.timeAlignedRenderer = initializeMocapRenderer(this.timeAlignedCanvas, visualizationWidth, visualizationHeight, drawStyle, jointsCount);
    }

    processSequenceForDrawing(seq) {
        return Core.processSequence(seq, this.numKeyframes, this.sceneWidth, this.visualizationWidth, this.visualizationHeight / 3, this.drawStyle, true, false);
    }

    drawSequenceIntoImage(processed, yShift, xCoefficient = 1, defaultRenderer = null) {
        let renderer = (defaultRenderer === null) ? this.mainRenderer : defaultRenderer;
        let figureScale = processed.figureScale;
        let frames = processed.frames;
        resizeSkeleton(renderer.skeleton, this.drawStyle, figureScale);
        let keyframes = findKeyframes(frames, this.numKeyframes, Core.KeyframeSelectionAlgorithmEnum.Decimation);

        let fillKeyframes = Core.getFillKeyframes(frames, keyframes, this.sceneWidth);
        let fillStyle = new Core.MocapDrawStyle(this.drawStyle.skeletonModel, this.drawStyle.boneRadius, this.drawStyle.jointRadius,
            this.drawStyle.headRadius, this.drawStyle.boneStyle, this.drawStyle.leftBoneStyle, this.drawStyle.rightBoneStyle,
            this.drawStyle.jointStyle, this.drawStyle.figureScale, this.drawStyle.noseStyle, this.drawStyle.noseRadius, 0.4);
        drawSequence(renderer, frames, fillKeyframes, 0, fillStyle, this.drawStyleBlur, figureScale, yShift, false, true, xCoefficient);

        return drawSequence(renderer, frames, keyframes, 0, this.drawStyle, this.drawStyleBlur, figureScale, yShift, false, true, xCoefficient);
    }

    drawDTWInfoToImage(dtwValue, category1, category2, dtwAverageValue = 0) {
        let text = document.createElement("p");
        text.appendChild(document.createTextNode("DTW value: " + dtwValue));
        text.appendChild(document.createElement("br"));
        text.appendChild(document.createTextNode("Category1: " + category1));
        text.appendChild(document.createElement("br"));
        text.appendChild(document.createTextNode("Category2: " + category2));
        text.appendChild(document.createElement("br"));

        if (dtwAverageValue !== 0) {
            text.appendChild(document.createTextNode("Average DTW value: " + dtwAverageValue));
        }

        this.div.appendChild(text);
    }

    drawDots(dotYShift, positions, frames, dtw, shorter = false, defaultRenderer = null) {
        let shift = positions[positions.length - 1] / frames.length;
        let xPosition = this.startDotXPosition;
        let dots = [];
        for (let i = 0; i < frames.length; i++) {
            let color = VisualizationDrawer.#getColorForSequenceIndex(i, dtw, shorter);
            this.#drawDotFrame(xPosition, dotYShift, this.circleRadius, color, defaultRenderer);
            dots.push(new Vec3(xPosition, dotYShift, 0));
            xPosition += shift;
        }
        return dots;
    }

    drawLines(dots1, dots2, lineCoefficient, dtw, defaultRenderer = null) {
        for (let i = 0; i < dtw.Map.length; i += lineCoefficient) {
            let color = VisualizationDrawer.#getColorForWarpingPathIndex(i, dtw);
            this.#drawLine(dots1[dtw.Map[i].index1], dots2[dtw.Map[i].index2], color, defaultRenderer);
        }
    }

    drawBars(bodyParts) {
        let bodyPart = bodyParts[0][0];
        let oneBarPieceWidth = this.visualizationWidth / bodyPart.Map.length;
        const canvas = document.createElement("canvas");
        canvas.width = bodyPart.Map.length * oneBarPieceWidth + this.textSpace;
        canvas.height = 20 * bodyParts.length;
        const ctx = canvas.getContext('2d');
        ctx.font = `${this.textHeight}px Arial`;

        for (let j = 0; j < bodyParts.length; j++) {
            ctx.fillStyle = "black";
            ctx.fillText(bodyParts[j][1], 0, j * this.textHeight + this.textHeight, this.textSpace);
            for (let i = 0; i < bodyParts[j][0].Map.length; i++) {
                let color = VisualizationDrawer.#getColorForWarpingPathIndex(i, bodyParts[j][0]);
                ctx.fillStyle = VisualizationDrawer.#getRGBFromColor(color);
                ctx.fillRect(this.textSpace + i * oneBarPieceWidth, j * this.textHeight, oneBarPieceWidth, this.textHeight);
            }
        }

        this.#bars = canvas;
    }

    drawTimeAlignmentBars(map, sequenceLength) {
        const canvas = document.createElement("canvas");
        canvas.width = this.visualizationWidth;
        canvas.height = this.visualizationHeight / 3 * 2;

        const xShift = canvas.width / sequenceLength;

        const ctx = canvas.getContext('2d');
        let yPosition = this.visualizationHeight / 2;
        let lastIteration = new Vec3(-1,-1,0);
        for (let i = 0; i < map.length; i ++) {
            let x1 = map[i].index1;
            let x2 = map[i].index2;

            ctx.beginPath();
            ctx.moveTo(x1 * xShift, 0);
            ctx.lineTo(x2 * xShift, yPosition);

            if (lastIteration.x + 1 === x1 && lastIteration.y + 1 === x2) {
                ctx.strokeStyle = 'rgb(204,204,0)';
            } else if (lastIteration.x + 1 === x1 && lastIteration.y === x2) {
                ctx.strokeStyle = 'red';
            } else if (lastIteration.x === x1 && lastIteration.y + 1 === x2) {
                ctx.strokeStyle = 'blue';
            } else {
                ctx.strokeStyle = 'black';
            }
            ctx.stroke();

            lastIteration.x = x1;
            lastIteration.y = x2;
        }


        this.#timeAlignedMapping = canvas;
    }

    setDetailView(dtw, processedLongerSeqFrames, processedShorterSeqFrames, dotCoords1, dotCoords2) {
        this.canvas.onmousemove = (event) => this.#onMouseMoveMapping(event, dtw, processedLongerSeqFrames, processedShorterSeqFrames, dotCoords1, dotCoords2);
    }

    #onMouseMoveMapping(mouseEvent, dtw, processedLongerSeqFrames, processedShorterSeqFrames, dotCoords1, dotCoords2) {
        let canvasCoords = this.canvas.getBoundingClientRect();
        this.canvasMiddle = canvasCoords.top + (canvasCoords.bottom - canvasCoords.top) / 2 + window.scrollY;
        // console.log("Page X: " + mouseEvent.pageX + "; Page Y: " + mouseEvent.pageY + "; CanvasMiddle: " + this.canvasMiddle);

        const longerFrames = processedLongerSeqFrames.frames;
        const shorterFrames = processedShorterSeqFrames.frames;
        let oneFrameVal = (canvasCoords.right - canvasCoords.left) / longerFrames.length - 0.12;
        let figureScale = processedLongerSeqFrames.figureScale;

        // select index
        let index = Math.floor((mouseEvent.pageX - canvasCoords.left) / oneFrameVal);
        let warpingPathIndex;
        if (mouseEvent.pageY <= this.canvasMiddle) {
            warpingPathIndex = VisualizationDrawer.#findMapIndexByLongerSeq(index, dtw.Map);
        } else {
            if (index >= shorterFrames.length) {
                index = shorterFrames.length - 1;
            }
            warpingPathIndex = VisualizationDrawer.#findMapIndexByShorterSeq(index, dtw.Map);
        }

        if (warpingPathIndex >= dtw.Map.length || warpingPathIndex === undefined) {
            warpingPathIndex = dtw.Map.length - 1;
        }

        let longerSeqFrameIndex = dtw.Map[warpingPathIndex].index1;
        let shorterSeqFrameIndex = dtw.Map[warpingPathIndex].index2;

        // render and save dot coords with theirs colors
        let colorSeq1 = VisualizationDrawer.#getColorForSequenceIndex(dtw.Map[warpingPathIndex].index1, dtw, false);
        let colorSeq2 = VisualizationDrawer.#getColorForSequenceIndex(dtw.Map[warpingPathIndex].index2, dtw, true);
        let colorPose = new ColoredPose(dotCoords1[dtw.Map[warpingPathIndex].index1],
            dotCoords2[dtw.Map[warpingPathIndex].index2],
            colorSeq1,
            colorSeq2);
        this.#drawPositions(colorPose);

        // draw details
        let coreX = longerFrames[longerSeqFrameIndex][0].x;
        let longerSeqFrame = Core.moveOriginXBy(longerFrames[longerSeqFrameIndex], coreX);
        resizeSkeleton(this.#detailRenderer.skeleton, this.drawStyle, figureScale);
        drawFrame(this.#detailRenderer, longerSeqFrame, figureScale, 2.5, 0, this.drawStyle, true);

        coreX = shorterFrames[shorterSeqFrameIndex][0].x;
        let shorterSeqFrame = Core.moveOriginXBy(shorterFrames[shorterSeqFrameIndex], coreX);
        resizeSkeleton(this.#detailRenderer.skeleton, this.drawStyle, figureScale);
        drawFrame(this.#detailRenderer, shorterSeqFrame, figureScale, 6, 0, this.drawStyle, false);
    }

    static #findMapIndexByLongerSeq(longerSequenceIndex, warpingPath) {
        for (let i = 0; i < warpingPath.length; i ++ ) {
            if (warpingPath[i].index1 === longerSequenceIndex) {
                return i;
            }
        }
    }

    static #findMapIndexByShorterSeq(shorterSequenceIndex, warpingPath) {
        for (let i = 0; i < warpingPath.length; i ++ ) {
            if (warpingPath[i].index2 === shorterSequenceIndex) {
                return i;
            }
        }

        return warpingPath.length - 1;
    }

    #drawPositions(colorPose) {
        if (this.#coloredPose.coord1 != null) {
            this.#drawDetailDot(this.#coloredPose.coord1, 'white', 0.1);
            this.#drawDetailDot(this.#coloredPose.coord2, 'white', -0.1);
            this.#drawDotFrame(this.#coloredPose.coord1.x, this.#coloredPose.coord1.y, this.circleRadius, this.#coloredPose.color1);
            this.#drawDotFrame(this.#coloredPose.coord2.x, this.#coloredPose.coord2.y, this.circleRadius, this.#coloredPose.color2);
        }

        this.#coloredPose = colorPose;
        this.#drawDetailDot(colorPose.coord1, this.#detailPosePositionColor, 0.1);
        this.#drawDetailDot(colorPose.coord2, this.#detailPosePositionColor, -0.1);
    }

    #drawDetailDot(coord, color, yShitf = 0) {
        let scene = new THREE.Scene();
        const geometry = new THREE.CircleGeometry(2 * this.circleRadius, 32);
        const material = new THREE.MeshBasicMaterial({color: color});
        const circle = new THREE.Mesh(geometry, material);
        circle.position.set(coord.x, coord.y + yShitf, coord.z);
        scene.add(circle);
        this.mainRenderer.renderer.render(scene, this.mainRenderer.camera);
    }

    putTogetherImage(longerProcessed, shorterProcessed) {
        const marginBottom = "70";

        let divRow1 = document.createElement('div');
        divRow1.style.display = "flex";
        divRow1.style.marginBottom = marginBottom;
        divRow1.appendChild(this.#createLeftSideInfoCanvas("Super maps where you can see everything"));
        divRow1.appendChild(this.#addMapToSequence(longerProcessed, this.mapWidth, this.mapHeight));
        divRow1.appendChild(this.#addMapToSequence(shorterProcessed, this.mapWidth, this.mapHeight));
        divRow1.appendChild(document.createElement('br'));
        this.div.appendChild(divRow1);

        let divRow2 = document.createElement('div');
        divRow2.style.display = "flex";
        divRow2.appendChild(this.#bars);
        divRow2.appendChild(document.createElement('br'));
        this.div.appendChild(divRow2);

        let divRow3 = document.createElement('div');
        divRow3.style.display = "flex";
        divRow3.appendChild(this.#createLeftSideInfoCanvas("Super canvas where you can see everything"));
        divRow3.appendChild(this.canvas);
        divRow3.appendChild(document.createElement('br'));
        this.div.appendChild(divRow3);

        let divRow4 = document.createElement('div');
        divRow4.style.display = "flex";
        divRow4.style.marginBottom = marginBottom;
        divRow4.appendChild(this.#createLeftSideInfoCanvas("Super detail where you can see everything"));
        divRow4.appendChild(this.#detail);
        divRow4.appendChild(document.createElement('br'));
        this.div.appendChild(divRow4);

        let divRow5 = document.createElement('div');
        divRow5.style.display = "flex";
        divRow5.style.marginBottom = marginBottom;
        divRow5.appendChild(this.#createLeftSideInfoCanvas("Super time-aligning where you can see everything"));
        divRow5.appendChild(this.timeAlignedCanvas);
        divRow5.appendChild(document.createElement('br'));
        this.div.appendChild(divRow5);

        let divRow6 = document.createElement('div');
        divRow6.style.display = "flex";
        divRow6.appendChild(this.#createLeftSideInfoCanvas("Super time-aligning visualization where you can see everything"));
        divRow6.appendChild(this.#timeAlignedMapping);
        divRow6.appendChild(document.createElement('br'));
        this.div.appendChild(divRow6);

        return this.div;
    }

    // #createLeftSideInfoCanvas(text) {
    //     let infoCanvas = document.createElement("canvas");
    //     infoCanvas.width = this.textSpace;
    //     infoCanvas.height = this.visualizationHeight;
    //     const ctx = infoCanvas.getContext('2d');
    //     ctx.font = `${this.textHeight}px Arial`;
    //     ctx.fillStyle = "black";
    //     ctx.fillText(text, 0, this.textHeight, this.textSpace);
    //     return infoCanvas;
    // }

    #createLeftSideInfoCanvas(text) {
        let div = document.createElement("div");
        let infoSpan = document.createElement("span");
        infoSpan.style.width = this.textSpace;
        infoSpan.style.height = this.visualizationHeight;
        infoSpan.style.display = "inline-block";
        infoSpan.innerHTML = text;
        div.appendChild(infoSpan);
        return div;
    }

    #drawDotFrame(xPosition, yPosition, circleRadius, color, defaultRenderer = null) {
        let renderer = (defaultRenderer === null) ? this.mainRenderer : defaultRenderer;
        let scene = new THREE.Scene();
        const geometry = new THREE.CircleGeometry(circleRadius, 32);
        let rgb = VisualizationDrawer.#getRGBFromColor(color);
        const material = new THREE.MeshBasicMaterial({color: rgb});
        const circle = new THREE.Mesh(geometry, material);
        circle.position.set(xPosition, yPosition, 0);
        scene.add(circle);
        renderer.renderer.render(scene, renderer.camera);
    }

    #drawLine(coord1, coord2, color, defaultRenderer = null) {
        let renderer = (defaultRenderer === null) ? this.mainRenderer : defaultRenderer;
        let scene = new THREE.Scene();
        let rgb = VisualizationDrawer.#getRGBFromColor(color);
        const material = new THREE.LineBasicMaterial({color: rgb});

        const points = [];
        points.push(new THREE.Vector3(coord1.x, coord1.y, coord1.z));
        points.push(new THREE.Vector3(coord2.x, coord2.y, coord2.z));

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        renderer.renderer.render(scene, renderer.camera);
    }

    #addMapToSequence(processed, mapWidth, mapHeight) {
        let frames = processed.frames;
        let keyframes = findKeyframes(frames, this.numKeyframes, Core.KeyframeSelectionAlgorithmEnum.Decimation);
        let figureScale = processed.figureScale;
        return addMapToVisualization(frames, keyframes, figureScale, this.model, mapWidth, mapHeight);
    }

    static #getColorForWarpingPathIndex(index, dtw) {
        let poseDistance = dtw.Map[index].poseDistance;
        return VisualizationDrawer.#selectColorByPoseDistance(poseDistance, dtw);
    }

    static #getColorForSequenceIndex(index, dtw, shorter) {
        let poseDistance = this.#getColorValueForIndex(index, dtw.Map, shorter);
        return VisualizationDrawer.#selectColorByPoseDistance(poseDistance, dtw);
    }

    static #selectColorByPoseDistance(poseDistance, dtw) {
        let contextValue;
        if (dtw.DistanceAverage !== 0) {
            let contextCoeff = poseDistance / dtw.DistanceAverage;
            contextCoeff = (contextCoeff > dtw.MaxContextMultiple) ? dtw.MaxContextMultiple : contextCoeff;
            contextCoeff = contextCoeff / dtw.MaxContextMultiple;
            contextValue = dtw.ContextPart * contextCoeff;
        } else {
            contextValue = 0;
        }
        poseDistance -= dtw.LowestDistance;
        return Math.floor((dtw.ColorCoeff * poseDistance) + contextValue);
    }

    static #getColorValueForIndex(index, warpingPath, shorter = false) {
        let poseDistances = [];

        let paths = warpingPath.filter(function (warpingEntity) {
            if (shorter) {
                return (warpingEntity.index2 === index);
            }
            return (warpingEntity.index1 === index);
        });

        paths.forEach(p => poseDistances.push(p.poseDistance));

        return VisualizationService.arrayAverage(poseDistances);
    }

    static #getRGBFromColor(color) {
        return `rgb(${color}, ${255 - color}, 0)`;
    }
}

class ColoredPose {
    constructor(coord1 = null, coord2 = null, color1 = null, color2 = null) {
        this.coord1 = coord1;
        this.coord2 = coord2;
        this.color1 = color1;
        this.color2 = color2;
    }
}

export {VisualizationDrawer};