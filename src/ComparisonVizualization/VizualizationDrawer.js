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
    startDotXPosition = 1;
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

        this.div = document.createElement("div");
        this.image = document.createElement("img");
        this.image.className = "drawItemVisualization";

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

    drawBars(dtws) {
        let height = 18;
        let textSpace = 100;
        let oneBarPieceWidth = 4.5;

        let dtw = dtws[0][0];
        const canvas = document.createElement("canvas");
        canvas.width = dtw.Map.length * oneBarPieceWidth + textSpace + 10000;
        canvas.height = 20 * dtws.length;
        const ctx = canvas.getContext('2d');
        ctx.font = `${height}px Arial`;

        for (let j = 0; j < dtws.length; j++) {
            ctx.fillStyle = "black";
            ctx.fillText(dtws[j][1], 0, j * height + height, textSpace);
            for (let i = 0; i < dtws[j][0].Map.length; i++) {
                let color = VisualizationDrawer.#getColorForWarpingPathIndex(i, dtws[j][0]);
                ctx.fillStyle = VisualizationDrawer.#getRGBFromColor(color);
                ctx.fillRect(i * oneBarPieceWidth + textSpace, j * height, oneBarPieceWidth, height);
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

            console.log(lastIteration);
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
        const longerFrames = processedLongerSeqFrames.frames;
        const shorterFrames = processedShorterSeqFrames.frames;
        let oneFrameVal = this.visualizationWidth / dtw.Map.length;
        let figureScale = processedLongerSeqFrames.figureScale;

        let index = Math.floor((mouseEvent.pageX - 8) / oneFrameVal);
        let longerSeqFrameIndex = dtw.Map[index].index1;
        let shorterSeqFrameIndex = dtw.Map[index].index2;

        let colorSeq1 = VisualizationDrawer.#getColorForSequenceIndex(dtw.Map[index].index1, dtw, false);
        let colorSeq2 = VisualizationDrawer.#getColorForSequenceIndex(dtw.Map[index].index2, dtw, true);
        let colorPose = new ColoredPose(dotCoords1[dtw.Map[index].index1],
            dotCoords2[dtw.Map[index].index2],
            colorSeq1,
            colorSeq2);
        this.#drawPositions(colorPose);

        let coreX = longerFrames[longerSeqFrameIndex][0].x;
        let longerSeqFrame = Core.moveOriginXBy(longerFrames[longerSeqFrameIndex], coreX);
        resizeSkeleton(this.#detailRenderer.skeleton, this.drawStyle, figureScale);
        drawFrame(this.#detailRenderer, longerSeqFrame, figureScale, 1, 0, this.drawStyle, true);

        coreX = shorterFrames[shorterSeqFrameIndex][0].x;
        let shorterSeqFrame = Core.moveOriginXBy(shorterFrames[shorterSeqFrameIndex], coreX);
        resizeSkeleton(this.#detailRenderer.skeleton, this.drawStyle, figureScale);
        drawFrame(this.#detailRenderer, shorterSeqFrame, figureScale, 3, 0, this.drawStyle, false);
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
        this.div.appendChild(this.#addMapToSequence(longerProcessed, this.mapWidth, this.mapHeight));
        this.div.appendChild(this.#addMapToSequence(shorterProcessed, this.mapWidth, this.mapHeight));
        this.div.appendChild(this.#bars);
        this.div.appendChild(this.canvas);
        this.div.appendChild(this.#detail);
        this.div.appendChild(this.timeAlignedCanvas);
        this.div.appendChild(this.#timeAlignedMapping);

        return this.div;
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