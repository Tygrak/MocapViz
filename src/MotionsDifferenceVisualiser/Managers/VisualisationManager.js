import * as Core from "../../mocapCore.js";
import {ContextManager} from "./ContextManager.js";
import {SequenceManager} from "./SequenceManager.js";
import * as Model from "../../model.js";
import {DTWManager} from "./DTWManager.js";
import {MotionsDifferenceRenderer} from "../Renderers/MotionsDifferenceRenderer.js";
import {Context} from "../Entities/Context.js"
import {modelKinect} from "../../model.js";
import {VisualizationParts} from "../Entities/VisualizationParts.js";

class VisualizationManager {
    model;
    context;
    drawer;

    constructor(model = Model.modelKinect) {
        this.model = model;
        this.context = new Context();
    }

    visualiseTwoMotionDifference(sequence1, sequence2, visualizationWidth, model, drawStyle, drawStyleBlur,
                                 contextOption, contextJson = "", visualizationParts = new VisualizationParts()) {
        this.context = ContextManager.getContext(this.context, contextOption, contextJson, [sequence1, sequence2], model);
        this.model = modelKinect;

        let sortedSequences = SequenceManager.sortSequencesByLength([sequence1, sequence2]);
        let longerSequence = sortedSequences[0];
        let shorterSequence = sortedSequences[1];

        let filteredLongerSequence = SequenceManager.getPoseCoordinatesPerSequence(longerSequence);
        let filteredShorterSequence = SequenceManager.getPoseCoordinatesPerSequence(shorterSequence);

        let dtw = DTWManager.calculateDTW(filteredLongerSequence, filteredShorterSequence, -1, this.context);

        let jointsCount = Core.getSequenceJointsPerFrame(longerSequence);
        let drawer = new MotionsDifferenceRenderer(longerSequence, shorterSequence, dtw, visualizationWidth,
            drawStyle, drawStyleBlur, jointsCount, this.model, visualizationParts);

        if (visualizationParts.description) drawer.fillTextDescription();
        if (visualizationParts.maps) drawer.fillMapCanvases();
        if (visualizationParts.bodyParts) drawer.fillBodyPartsCanvas();
        if (visualizationParts.sequenceDifference) drawer.fillSequenceDifferenceCanvas();
        if (visualizationParts.poseDetail && visualizationParts.sequenceDifference) drawer.setPoseDetail();
        if (visualizationParts.timeAlignedSequenceDifference || visualizationParts.timeAlignedMapping)
            drawer.fillTimeAlignedSequenceDifferenceCanvas();

        return drawer.renderImage();
    }

    clearContext() {
        this.context = new Context();
    }
}

export {VisualizationManager};