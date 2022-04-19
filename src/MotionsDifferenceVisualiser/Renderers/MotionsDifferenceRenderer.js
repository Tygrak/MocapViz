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
    timeAlignedSequenceDifferenceDescription, infoTableId, descriptionBoxSize
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
    #longerSequencePoses = [];
    #longerSequenceDotCoordinates = [];
    #shorterSequence = [];
    #shorterSequenceProcessed = [];
    #shorterSequencePoses = [];
    #shorterSequenceDotCoordinates = [];
    #dtw = null;
    #visualizationWidth = 0;
    #drawStyle = null;
    #drawStyleBlur = null;
    #jointsCount = 0;
    #model = null;
    #visualizationParts = null;
    #dtwBodyParts = null;
    #visualizationId = null;

    #textDescription = document.createElement("p");
    #longerSequenceMapCanvas = document.createElement("canvas");
    #shorterSequenceMapCanvas = document.createElement("canvas");
    #bodyPartsCanvas = document.createElement("canvas");
    #sequenceDifferenceCanvas = document.createElement("canvas");
    #detailCanvas = document.createElement("canvas");
    #infoTable = document.createElement("div");
    #timeAlignedSequenceDifferenceCanvas = document.createElement("canvas");
    #timeAlignedMappingCanvas = document.createElement("canvas");

    #sequenceDifferenceRenderer = null;
    #sequenceDetailRenderer = null;
    #timeAlignedSequenceDifferenceRenderer = null;

    constructor(longerSequence, shorterSequence, dtw, visualizationWidth, drawStyle, drawStyleBlur, jointsCount, model,
                visualizationParts) {
        this.#longerSequence = longerSequence;
        this.#shorterSequence = shorterSequence;
        this.#dtw = dtw;
        this.#visualizationWidth = visualizationWidth;
        this.#drawStyle = drawStyle;
        this.#drawStyle.figureScale = this.#FIGURE_SCALE;
        this.#drawStyleBlur = drawStyleBlur;
        this.#jointsCount = jointsCount;
        this.#model = model;
        this.#visualizationParts = visualizationParts;

        this.#sequenceDifferenceRenderer = initializeMocapRenderer(this.#sequenceDifferenceCanvas , visualizationWidth, this.#VISUALIZATION_HEIGHT, drawStyle, jointsCount);
        this.#sequenceDetailRenderer = initializeMocapRenderer(this.#detailCanvas, visualizationWidth / 3.2, 200, drawStyle, jointsCount, this.#DETAIL_SCENE_WIDTH);
        this.#timeAlignedSequenceDifferenceRenderer = initializeMocapRenderer(this.#timeAlignedSequenceDifferenceCanvas, visualizationWidth, this.#VISUALIZATION_HEIGHT, drawStyle, jointsCount);

        this.#longerSequenceProcessed = this.#processSequenceForDrawing(this.#longerSequence);
        this.#shorterSequenceProcessed = this.#processSequenceForDrawing(this.#shorterSequence);
        this.#longerSequencePoses = SequenceManager.getPoseCoordinatesPerSequence(this.#longerSequence, this.#model);
        this.#shorterSequencePoses = SequenceManager.getPoseCoordinatesPerSequence(this.#shorterSequence, this.#model);

        this.#timeAlignedMappingCanvas.width = this.#visualizationWidth;
        this.#timeAlignedMappingCanvas.height = this.#VISUALIZATION_HEIGHT / 3 * 2;
        this.#visualizationId = (new Date()).getTime().toString();
    }

    fillTextDescription() {
        TextDescriptionRenderer.render(this.#textDescription, this.#longerSequence, this.#shorterSequence,
            this.#dtw);
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
        this.#dtwBodyParts = BodyPartManager.getBodyPartsPerModel(this.#longerSequencePoses, this.#shorterSequencePoses,
            this.#dtw, this.#model)
        BodyPartsRenderer.render(this.#bodyPartsCanvas, this.#dtwBodyParts, this.#longerSequencePoses.length, this.#visualizationWidth,
            this.#TEXT_SPACE, this.#TEXT_HEIGHT);
    }

    setPoseDetail() {
        this.#createTable(this.#infoTable);
        let poseDetailRenderer = new PoseDetailRenderer(this.#sequenceDetailRenderer, this.#sequenceDifferenceRenderer, this.#dtw, this.#dtwBodyParts,
            JSON.parse(JSON.stringify(this.#longerSequenceProcessed)), JSON.parse(JSON.stringify(this.#shorterSequenceProcessed)), this.#longerSequencePoses, this.#shorterSequencePoses,
            this.#longerSequenceDotCoordinates, this.#shorterSequenceDotCoordinates, this.#drawStyle, this.#POSE_CIRCLE_RADIUS, this.#DETAIL_POSE_POSITION_COLOR, this.#getInfoTableId());

        this.#sequenceDifferenceCanvas.onmousemove = (event) => poseDetailRenderer.onMouseMoveMapping(event);
    }

    fillTimeAlignedSequenceDifferenceCanvas() {
        let reducedLongerSequence = SequenceManager.reduceSequenceLength(this.#longerSequencePoses, this.#shorterSequencePoses.length);
        let reducedLongerSequenceProcessed = this.#longerSequenceProcessed;
        reducedLongerSequenceProcessed.frames = SequenceManager.reduceSequenceLength(this.#longerSequenceProcessed.frames, this.#shorterSequenceProcessed.frames.length);

        let yThird = this.#VISUALIZATION_HEIGHT / (this.#visualizationWidth / this.#VISUALIZATION_HEIGHT * 6);
        let positions1 = SequenceDifferenceRenderer.renderSequence(reducedLongerSequenceProcessed,
            this.#timeAlignedSequenceDifferenceRenderer, this.#NUM_KEYFRAMES, this.#SCENE_WIDTH, this.#drawStyle,
            this.#drawStyleBlur, yThird * 2);
        let positions2 = SequenceDifferenceRenderer.renderSequence(this.#shorterSequenceProcessed,
            this.#timeAlignedSequenceDifferenceRenderer, this.#NUM_KEYFRAMES, this.#SCENE_WIDTH, this.#drawStyle,
            this.#drawStyleBlur, 0, reducedLongerSequence.length / this.#shorterSequencePoses.length);

        let reducedDtw = DTWManager.calculateDTW(reducedLongerSequence, this.#shorterSequencePoses, -1, this.#dtw.context, this.#model);

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

        if (this.#visualizationParts.description)
            this.#renderCanvas(div, [this.#textDescription]);

        if (this.#visualizationParts.maps)
            this.#renderCanvas(div, [this.#longerSequenceMapCanvas, this.#shorterSequenceMapCanvas], true, mapDescription);

        if (this.#visualizationParts.bodyParts)
            this.#renderCanvas(div, [this.#bodyPartsCanvas]);

        if (this.#visualizationParts.sequenceDifference)
            this.#renderCanvas(div, [this.#sequenceDifferenceCanvas], false, sequenceDifferenceDescription);

        if (this.#visualizationParts.sequenceDifference && this.#visualizationParts.poseDetail)
            this.#renderCanvas(div, [this.#detailCanvas, this.#infoTable], true, detailDescription)

        if (this.#visualizationParts.timeAlignedSequenceDifference)
            this.#renderCanvas(div, [this.#timeAlignedSequenceDifferenceCanvas], true, timeAlignedSequenceDifferenceDescription);

        if (this.#visualizationParts.timeAlignedMapping)
            this.#renderCanvas(div, [this.#timeAlignedMappingCanvas], false, timeAlignedMapping);

        return div;
    }

    #renderCanvas(mainDiv, elements, marginBottom = false, description = null) {
        let divRow = document.createElement('div');
        divRow.style.display = "flex";

        if (marginBottom) {
            divRow.style.marginBottom = this.#VISUALISATION_MARGIN_BOTTOM;
        }

        if (description !== null) {
            divRow.appendChild(this.#createLeftSideInfo(description));
        }

        elements.forEach(canvas => divRow.appendChild(canvas));
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

    #createTable(infoTable) {
        let table = document.createElement('table');
        let thead = document.createElement('thead');
        let tbody = document.createElement('tbody');

        let row1 = document.createElement('tr');
        let heading1 = document.createElement('th');
        heading1.innerHTML = "Body part";
        let heading2 = document.createElement('th');
        heading2.innerHTML = "Color";
        let heading3 = document.createElement('th');
        heading3.innerHTML = "Distance";

        row1.appendChild(heading1);
        row1.appendChild(heading2);
        row1.appendChild(heading3);
        thead.appendChild(row1);

        table.appendChild(thead);
        table.appendChild(tbody);
        table.id = this.#getInfoTableId();
        infoTable.appendChild(table);

        this.#addRow(tbody, "Nose", this.#drawStyle.noseStyle);
        this.#addRow(tbody, "Torso", this.#drawStyle.boneStyle);
        this.#addRow(tbody, "Left hand", this.#drawStyle.leftBoneStyle);
        this.#addRow(tbody, "Right hand", this.#drawStyle.rightBoneStyle);
        this.#addRow(tbody, "Left leg", this.#drawStyle.leftBoneStyle);
        this.#addRow(tbody, "Right leg", this.#drawStyle.rightBoneStyle);
        this.#addRow(tbody, "Whole pose", null);
    }

    #getInfoTableId() {
        return infoTableId + this.#visualizationId;
    }

    #addRow(tbody, bodyPartName, color = null) {
        let box = MotionsDifferenceRenderer.#createBox(color);

        let row = document.createElement('tr');
        row.style.textAlign = "center";
        let rowColumn1 = document.createElement('td');
        rowColumn1.innerHTML = bodyPartName;
        let rowColumn2 = document.createElement('td');
        rowColumn2.appendChild(box);
        let rowColumn3 = document.createElement('td');

        row.appendChild(rowColumn1);
        row.appendChild(rowColumn2);
        row.appendChild(rowColumn3);
        tbody.appendChild(row);
    }

    static #createBox(color) {
        if (color === null) {
            return document.createTextNode("");
        }

        let box = document.createElement('div');
        box.style.height = descriptionBoxSize;
        box.style.float = "right";
        box.style.width = descriptionBoxSize;
        box.style.border = "1px solid black";
        box.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
        return box;
    }
}

export {MotionsDifferenceRenderer};