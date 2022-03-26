import * as Core from "../../mocapCore.js";
import {ContextManager} from "./ContextManager.js";
import {SequenceManager} from "./SequenceManager.js";
import * as Model from "../../model.js";
import {DTWManager} from "./DTWManager.js";
import {MotionsDifferenceRenderer} from "../Renderers/MotionsDifferenceRenderer.js";
import {Context} from "../Entities/Context.js"

class VisualizationManager {
    model;

    context = new Context();
    drawer;

    constructor(model = Model.modelVicon) {
        this.model = model;
    }

    visualiseTwoMotionDifference(sequence1, sequence2, visualizationWidth, drawStyle, drawStyleBlur,
                                 contextOption, contextJson = "")
    {
        this.context = ContextManager.getContext(this.context, contextOption, contextJson);

        let sortedSequences = SequenceManager.sortSequencesByLength([sequence1, sequence2]);
        let longerSequence = sortedSequences[0];
        let shorterSequence = sortedSequences[1];

        let filteredLongerSequence = SequenceManager.getPoseCoordinatesPerSequence(longerSequence);
        let filteredShorterSequence = SequenceManager.getPoseCoordinatesPerSequence(shorterSequence);

        let dtw = DTWManager.calculateDTW(filteredLongerSequence, filteredShorterSequence, -1, this.context);

        let jointsCount = Core.getSequenceJointsPerFrame(longerSequence);
        let drawer = new MotionsDifferenceRenderer(longerSequence, shorterSequence, dtw, visualizationWidth,
            drawStyle, drawStyleBlur, jointsCount, this.model);

        drawer.fillTextDescription();
        drawer.fillMapCanvases();
        drawer.fillBodyPartsCanvas();
        drawer.fillSequenceDifferenceCanvas();
        drawer.setPoseDetail();
        drawer.fillTimeAlignedSequenceDifferenceCanvas();

        return drawer.renderImage();
    }
}

export {VisualizationManager};