import * as Model from "../../model.js";
import {initializeMocapRenderer} from "../../mocap.js";
import * as Core from "../../mocapCore.js";
import {SequenceDifferenceRenderer} from "./SequenceDifferenceRenderer.js";
import {TextDescriptionRenderer} from "./TextDescriptionRenderer.js";
import {PoseDetailRenderer} from "./PoseDetailRenderer.js";
import {BodyPartsRenderer} from "./BodyPartsRenderer.js";
import {TimeAlignedMappingRenderer} from "./TimeAlignedMappingRenderer.js";
import {MapRenderer} from "./MapRenderer.js";
import {BodyPartManager} from "../Managers/BodyPartManager.js";
import {SequenceManager} from "../Managers/SequenceManager.js";
import {DTWManager} from "../Managers/DTWManager.js";
import {
    detailDescription,
    mapDescription,
    sequenceDifferenceDescription, timeAlignedMapping,
    timeAlignedSequenceDifferenceDescription
} from "../Config/Config.js";

class MotionsDifferenceRenderer {
    #TEXT_SPACE = 80;
    #DETAIL_SCENE_WIDTH = 10;
    #TEXT_HEIGHT = 16;
    #NUM_KEYFRAMES = 10;
    #FIGURE_SCALE = 1.5;
    #POSE_CIRCLE_RADIUS = 0.1;
    #X_DOT_START_POSITION = 0.1
    #DETAIL_POSE_POSITION_COLOR = 'rgb(30,144,255)';
    #SCENE_WIDTH = 100;
    #MAP_WIDTH = 200;
    #MAP_HEIGHT = 200;
    #VISUALISATION_MARGIN_BOTTOM = "70";
    #VISUALIZATION_HEIGHT = 200;
    #LINE_COEFFICIENT = 1;

    #longerSequence = [];
    #longerSequenceProcessed = [];
    #longerSequenceFiltered = [];
    #longerSequenceDotCoordinates = [];
    #shorterSequence = [];
    #shorterSequenceProcessed = [];
    #shorterSequenceFiltered = [];
    #shorterSequenceDotCoordinates = [];
    #dtw = null;
    #visualizationWidth = 0;
    #drawStyle = null;
    #drawStyleBlur = null;
    #jointsCount = 0;
    #model = Model.modelVicon;

    #textDescription = document.createElement("p");
    #longerSequenceMapCanvas = document.createElement("canvas");
    #shorterSequenceMapCanvas = document.createElement("canvas");
    #bodyPartsCanvas = document.createElement("canvas");
    #sequenceDifferenceCanvas = document.createElement("canvas");
    #detailCanvas = document.createElement("canvas");
    #timeAlignedSequenceDifferenceCanvas = document.createElement("canvas");
    #timeAlignedMappingCanvas = document.createElement("canvas");

    #sequenceDifferenceRenderer = null;
    #sequenceDetailRenderer = null;
    #timeAlignedSequenceDifferenceRenderer = null;

    constructor(longerSequence, shorterSequence, dtw, visualizationWidth, drawStyle, drawStyleBlur,
                jointsCount, model) {
        this.#longerSequence = longerSequence;
        this.#shorterSequence = shorterSequence;
        this.#dtw = dtw;
        this.#visualizationWidth = visualizationWidth;
        this.#drawStyle = drawStyle;
        this.#drawStyle.figureScale = this.#FIGURE_SCALE;
        this.#drawStyleBlur = drawStyleBlur;
        this.#jointsCount = jointsCount;
        this.#model = model;

        this.#sequenceDifferenceRenderer = initializeMocapRenderer(this.#sequenceDifferenceCanvas , visualizationWidth, this.#VISUALIZATION_HEIGHT, drawStyle, jointsCount);
        this.#sequenceDetailRenderer = initializeMocapRenderer(this.#detailCanvas, visualizationWidth / 3.2, 200, drawStyle, jointsCount, this.#DETAIL_SCENE_WIDTH);
        this.#timeAlignedSequenceDifferenceRenderer = initializeMocapRenderer(this.#timeAlignedSequenceDifferenceCanvas, visualizationWidth, this.#VISUALIZATION_HEIGHT, drawStyle, jointsCount);

        this.#longerSequenceProcessed = this.#processSequenceForDrawing(this.#longerSequence);
        this.#shorterSequenceProcessed = this.#processSequenceForDrawing(this.#shorterSequence);
        this.#longerSequenceFiltered = SequenceManager.getPoseCoordinatesPerSequence(this.#longerSequence);
        this.#shorterSequenceFiltered = SequenceManager.getPoseCoordinatesPerSequence(this.#shorterSequence);

        this.#timeAlignedMappingCanvas.width = this.#visualizationWidth;
        this.#timeAlignedMappingCanvas.height = this.#VISUALIZATION_HEIGHT / 3 * 2;
    }

    fillTextDescription() {
        TextDescriptionRenderer.render(this.#textDescription, this.#longerSequence, this.#shorterSequence,
            this.#dtw.distance, this.#dtw.context.dtwDistanceAverage);
    }

    fillMapCanvases() {
        this.#longerSequenceMapCanvas = MapRenderer.renderMap(this.#longerSequenceProcessed, this.#MAP_WIDTH, this.#MAP_HEIGHT, this.#NUM_KEYFRAMES, this.#model);
        this.#shorterSequenceMapCanvas = MapRenderer.renderMap(this.#shorterSequenceProcessed, this.#MAP_WIDTH, this.#MAP_HEIGHT, this.#NUM_KEYFRAMES, this.#model);
    }

    fillSequenceDifferenceCanvas() {
        let yThird = this.#VISUALIZATION_HEIGHT / (this.#visualizationWidth / this.#VISUALIZATION_HEIGHT * 6);
        let longerPositions = SequenceDifferenceRenderer.renderSequence(this.#longerSequenceProcessed,
            this.#sequenceDifferenceRenderer, this.#NUM_KEYFRAMES, this.#SCENE_WIDTH, this.#drawStyle,
            this.#drawStyleBlur, yThird * 2);
        let shorterPositions = SequenceDifferenceRenderer.renderSequence(this.#shorterSequenceProcessed,
            this.#sequenceDifferenceRenderer, this.#NUM_KEYFRAMES, this.#SCENE_WIDTH, this.#drawStyle,
            this.#drawStyleBlur, 0, this.#longerSequence.length / this.#shorterSequence.length);

        this.#longerSequenceDotCoordinates = SequenceDifferenceRenderer.renderDots(this.#sequenceDifferenceRenderer,
            yThird * 2 - 0.35, longerPositions, this.#longerSequenceProcessed.frames, this.#dtw, 
            this.#X_DOT_START_POSITION, this.#POSE_CIRCLE_RADIUS);
        this.#shorterSequenceDotCoordinates = SequenceDifferenceRenderer.renderDots(this.#sequenceDifferenceRenderer,
            yThird + 0.15, shorterPositions, this.#shorterSequenceProcessed.frames, this.#dtw,
            this.#X_DOT_START_POSITION, this.#POSE_CIRCLE_RADIUS, true);

        SequenceDifferenceRenderer.renderLines(this.#sequenceDifferenceRenderer, this.#longerSequenceDotCoordinates,
            this.#shorterSequenceDotCoordinates, this.#LINE_COEFFICIENT, this.#dtw);
    }

    fillBodyPartsCanvas() {
        let dtwBodyParts = BodyPartManager.getBodyPartsPerModel(this.#longerSequenceFiltered, this.#shorterSequenceFiltered,
            this.#dtw, this.#model)
        BodyPartsRenderer.render(this.#bodyPartsCanvas, dtwBodyParts, this.#longerSequenceFiltered.length, this.#visualizationWidth,
            this.#TEXT_SPACE, this.#TEXT_HEIGHT);
    }

    setPoseDetail() {
        let poseDetailRenderer = new PoseDetailRenderer(this.#sequenceDetailRenderer, this.#sequenceDifferenceRenderer,
            this.#dtw, JSON.parse(JSON.stringify(this.#longerSequenceProcessed)),
                JSON.parse(JSON.stringify(this.#shorterSequenceProcessed)), this.#longerSequenceDotCoordinates,
            this.#shorterSequenceDotCoordinates, this.#drawStyle, this.#POSE_CIRCLE_RADIUS, this.#DETAIL_POSE_POSITION_COLOR);

        this.#sequenceDifferenceCanvas.onmousemove = (event) => poseDetailRenderer.onMouseMoveMapping(event);
    }

    fillTimeAlignedSequenceDifferenceCanvas() {
        let reducedLongerSequence = SequenceManager.reduceSequenceLength(this.#longerSequenceFiltered, this.#shorterSequenceFiltered.length);
        let reducedLongerSequenceProcessed = this.#longerSequenceProcessed;
        reducedLongerSequenceProcessed.frames = SequenceManager.reduceSequenceLength(this.#longerSequenceProcessed.frames, this.#shorterSequenceProcessed.frames.length);

        let yThird = this.#VISUALIZATION_HEIGHT / (this.#visualizationWidth / this.#VISUALIZATION_HEIGHT * 6);
        let positions1 = SequenceDifferenceRenderer.renderSequence(reducedLongerSequenceProcessed,
            this.#timeAlignedSequenceDifferenceRenderer, this.#NUM_KEYFRAMES, this.#SCENE_WIDTH, this.#drawStyle,
            this.#drawStyleBlur, yThird * 2);
        let positions2 = SequenceDifferenceRenderer.renderSequence(this.#shorterSequenceProcessed,
            this.#timeAlignedSequenceDifferenceRenderer, this.#NUM_KEYFRAMES, this.#SCENE_WIDTH, this.#drawStyle,
            this.#drawStyleBlur, 0, reducedLongerSequence.length / this.#shorterSequenceFiltered.length);

        let reducedDtw = DTWManager.calculateDTW(reducedLongerSequence, this.#shorterSequenceFiltered, -1, this.#dtw.context);

        let longerSequenceDotCoordinates = SequenceDifferenceRenderer.renderDots(this.#timeAlignedSequenceDifferenceRenderer,
            yThird * 2 - 0.35, positions1, reducedLongerSequenceProcessed.frames, reducedDtw,
            this.#X_DOT_START_POSITION, this.#POSE_CIRCLE_RADIUS);
        let shorterSequenceDotCoordinates = SequenceDifferenceRenderer.renderDots(this.#timeAlignedSequenceDifferenceRenderer,
            yThird + 0.15, positions2, this.#shorterSequenceProcessed.frames, reducedDtw,
            this.#X_DOT_START_POSITION, this.#POSE_CIRCLE_RADIUS, true);

        SequenceDifferenceRenderer.renderLines(this.#timeAlignedSequenceDifferenceRenderer, longerSequenceDotCoordinates,
            shorterSequenceDotCoordinates, this.#LINE_COEFFICIENT, reducedDtw);

        this.#timeAlignedMappingCanvas = TimeAlignedMappingRenderer.drawTimeAlignedBars(reducedDtw.warpingPath,
            reducedLongerSequence.length, this.#visualizationWidth, this.#VISUALIZATION_HEIGHT);
    }

    renderImage() {
        let div = document.createElement("div");

        this.#renderCanvas(div, [this.#textDescription]);
        this.#renderCanvas(div, [this.#longerSequenceMapCanvas, this.#shorterSequenceMapCanvas], true, mapDescription);
        this.#renderCanvas(div, [this.#bodyPartsCanvas]);
        this.#renderCanvas(div, [this.#sequenceDifferenceCanvas], false, sequenceDifferenceDescription);
        this.#renderCanvas(div, [this.#detailCanvas], true, detailDescription);
        this.#renderCanvas(div, [this.#timeAlignedSequenceDifferenceCanvas], true, timeAlignedSequenceDifferenceDescription);
        this.#renderCanvas(div, [this.#timeAlignedMappingCanvas], false, timeAlignedMapping);

        return div;
    }

    #renderCanvas(mainDiv, canvases, marginBottom = false, description = null) {
        let divRow = document.createElement('div');
        divRow.style.display = "flex";

        if (marginBottom) {
            divRow.style.marginBottom = this.#VISUALISATION_MARGIN_BOTTOM;
        }

        if (description !== null) {
            divRow.appendChild(this.#createLeftSideInfo(description));
        }

        canvases.forEach(canvas => divRow.appendChild(canvas));
        divRow.appendChild(document.createElement('br'));
        mainDiv.appendChild(divRow);
    }

    #createLeftSideInfo(text) {
        let div = document.createElement("div");
        let infoSpan = document.createElement("span");
        infoSpan.style.width = this.#TEXT_SPACE.toString();
        infoSpan.style.height = this.#VISUALIZATION_HEIGHT.toString();
        infoSpan.style.display = "inline-block";
        infoSpan.innerHTML = text;
        div.appendChild(infoSpan);
        return div;
    }

    #processSequenceForDrawing(sequence) {
        return Core.processSequence(sequence, this.#NUM_KEYFRAMES, this.#SCENE_WIDTH, this.#visualizationWidth,
            this.#VISUALIZATION_HEIGHT / 3, this.#drawStyle, true, false);
    }
}

export {MotionsDifferenceRenderer};