import * as Core from "../../mocapCore.js";
import {drawFrame, resizeSkeleton} from "../../mocap.js";
import {ColorManager} from "../Managers/ColorManager.js";
import {SequenceDifferenceRenderer} from "./SequenceDifferenceRenderer.js";
import {ColoredPose} from "../Entities/ColoredPose.js";
import {SequenceManager} from "../Managers/SequenceManager.js";
import {infoTableId} from "../Config/Config.js";

class PoseDetailRenderer {
    #FIRST_DETAIL_X_SHIFT = 2.5;
    #SECOND_POSE_X_SHIFT = 6;

    #coloredPoses = null;
    #sequenceDetailRenderer = null;
    #sequenceDifferenceRenderer = null;
    #dtw = null;
    #bodyPartsDtw = null;
    #processedLongerSequence = null;
    #processedShorterSequence = null;
    #longerSequencePoses = null;
    #shorterSequencePoses = null;
    #longerSequenceDotCoordinates = null;
    #shorterSequenceDotCoordinates = null;
    #drawStyle = null;
    #circleRadius = 0.1;
    #circleDetailColor = null;
    #infoTableId = null;

    constructor(detailRenderer, sequenceDifferenceRenderer, dtw, bodyPartsDtw, processedLongerSequence,
                processedShorterSequence, longerSequencePoses, shorterSequencePoses, longerSequenceDotCoordinates,
                shorterSequenceDotCoordinates, drawStyle, circleRadius, circleDetailColor, infoTableId) {
        this.#sequenceDetailRenderer = detailRenderer;
        this.#sequenceDifferenceRenderer = sequenceDifferenceRenderer;
        this.#dtw = dtw;
        this.#bodyPartsDtw = bodyPartsDtw;
        this.#processedLongerSequence = processedLongerSequence;
        this.#processedShorterSequence = processedShorterSequence;
        this.#longerSequencePoses = longerSequencePoses;
        this.#shorterSequencePoses = shorterSequencePoses;
        this.#longerSequenceDotCoordinates = longerSequenceDotCoordinates;
        this.#shorterSequenceDotCoordinates = shorterSequenceDotCoordinates;
        this.#drawStyle = drawStyle;
        this.#circleRadius = circleRadius;
        this.#circleDetailColor = circleDetailColor;
        this.#infoTableId = infoTableId;
    }

    onMouseMoveMapping(mouseEvent) {
        let longerSequenceFrames = this.#processedLongerSequence.frames;
        let shorterSequenceFrames = this.#processedShorterSequence.frames;

        // select index
        let warpingPathIndex = this.#selectWarpingPathIndex(mouseEvent, longerSequenceFrames, shorterSequenceFrames);

        // render and save dot coords with theirs colors
        this.#renderDetailDots(warpingPathIndex);

        // update info table
        this.#updateTable(warpingPathIndex, longerSequenceFrames, shorterSequenceFrames);

        // draw details
        let longerSequenceFrameIndex = this.#dtw.warpingPath[warpingPathIndex].index1;
        let shorterSequenceFrameIndex = this.#dtw.warpingPath[warpingPathIndex].index2;
        let figureScale = this.#processedLongerSequence.figureScale;

        let coreX = longerSequenceFrames[longerSequenceFrameIndex][0].x;
        let longerSequenceFrame = Core.moveOriginXBy(longerSequenceFrames[longerSequenceFrameIndex], coreX);
        resizeSkeleton(this.#sequenceDetailRenderer.skeleton, this.#drawStyle, figureScale);
        drawFrame(this.#sequenceDetailRenderer, longerSequenceFrame, figureScale, this.#FIRST_DETAIL_X_SHIFT, 0,
            this.#drawStyle, true);

        coreX = shorterSequenceFrames[shorterSequenceFrameIndex][0].x;
        let shorterSequenceFrame = Core.moveOriginXBy(shorterSequenceFrames[shorterSequenceFrameIndex], coreX);
        resizeSkeleton(this.#sequenceDetailRenderer.skeleton, this.#drawStyle, figureScale);
        drawFrame(this.#sequenceDetailRenderer, shorterSequenceFrame, figureScale, this.#SECOND_POSE_X_SHIFT, 0,
            this.#drawStyle, false);
    }

    #selectWarpingPathIndex(mouseEvent, longerSequenceFrames, shorterSequenceFrames) {
        let canvasBounding = this.#sequenceDifferenceRenderer.canvas.getBoundingClientRect();
        let canvasMiddle = canvasBounding.top + (canvasBounding.bottom - canvasBounding.top) / 2 + window.scrollY;

        let oneFrameValue = (canvasBounding.right - canvasBounding.left) / longerSequenceFrames.length - 0.12;

        let index = Math.floor((mouseEvent.pageX - canvasBounding.left) / oneFrameValue);
        let warpingPathIndex;

        try {
            if (mouseEvent.pageY <= canvasMiddle) {
                warpingPathIndex = SequenceManager.findWarpingPathIndexByLongerSeq(index, this.#dtw.warpingPath);
            } else {
                if (index >= shorterSequenceFrames.length) {
                    index = shorterSequenceFrames.length - 1;
                }
                warpingPathIndex = SequenceManager.findWarpingPathIndexByShorterSeq(index, this.#dtw.warpingPath);
            }
        } catch (SequenceIndexNotFound) {}


        if (warpingPathIndex >= this.#dtw.warpingPath.length || warpingPathIndex === undefined) {
            warpingPathIndex = this.#dtw.warpingPath.length - 1;
        }

        return warpingPathIndex;
    }

    #renderDetailDots(warpingPathIndex) {
        let longerSequenceColor = ColorManager.getColorForSequenceIndex(this.#dtw.warpingPath[warpingPathIndex].index1,
            this.#dtw, false);
        let shorterSequenceColor = ColorManager.getColorForSequenceIndex(this.#dtw.warpingPath[warpingPathIndex].index2,
            this.#dtw, true);

        let longerSequenceColorPose = new ColoredPose(
            this.#longerSequenceDotCoordinates[this.#dtw.warpingPath[warpingPathIndex].index1], longerSequenceColor);
        let shorterSequenceColorPose = new ColoredPose(
            this.#shorterSequenceDotCoordinates[this.#dtw.warpingPath[warpingPathIndex].index2], shorterSequenceColor);
        this.#drawPositions(longerSequenceColorPose, shorterSequenceColorPose);
        this.#coloredPoses = {upperPose:longerSequenceColorPose, bottomPose:shorterSequenceColorPose};
    }

    #drawPositions(coloredPose1, coloredPose2) {
        if (this.#coloredPoses != null) {
            SequenceDifferenceRenderer.drawDotFrame(this.#sequenceDifferenceRenderer, this.#coloredPoses.upperPose.coordination.x,
                this.#coloredPoses.upperPose.coordination.y + 0.1, 2 * this.#circleRadius, 'white');
            SequenceDifferenceRenderer.drawDotFrame(this.#sequenceDifferenceRenderer, this.#coloredPoses.bottomPose.coordination.x,
                this.#coloredPoses.bottomPose.coordination.y - 0.1, 2 * this.#circleRadius, 'white');
            SequenceDifferenceRenderer.drawDotFrame(this.#sequenceDifferenceRenderer, this.#coloredPoses.upperPose.coordination.x,
                this.#coloredPoses.upperPose.coordination.y, this.#circleRadius, this.#coloredPoses.upperPose.color);
            SequenceDifferenceRenderer.drawDotFrame(this.#sequenceDifferenceRenderer, this.#coloredPoses.bottomPose.coordination.x,
                this.#coloredPoses.bottomPose.coordination.y, this.#circleRadius, this.#coloredPoses.bottomPose.color);
        }

        SequenceDifferenceRenderer.drawDotFrame(this.#sequenceDifferenceRenderer, coloredPose1.coordination.x,
            coloredPose1.coordination.y + 0.1, 2 * this.#circleRadius, this.#circleDetailColor);
        SequenceDifferenceRenderer.drawDotFrame(this.#sequenceDifferenceRenderer, coloredPose2.coordination.x,
            coloredPose2.coordination.y - 0.1, 2 * this.#circleRadius, this.#circleDetailColor);
    }

    #updateTable(index) {
        let table = document.getElementById(this.#infoTableId);

        if (this.#bodyPartsDtw !== null) {
            for (let i = 0; i < this.#bodyPartsDtw.length; i ++) {
                let dtw = this.#bodyPartsDtw[i][0];
                let distance = dtw.warpingPath[index].poseDistance.toFixed(2);

                let cell = table.rows[i + 2].cells[2];
                cell.innerHTML = distance;
            }
        }

        let distance = this.#dtw.warpingPath[index].poseDistance.toFixed(2);
        let cell = table.rows[7].cells[2];
        cell.innerHTML = distance;

        // let index1 = this.#dtw.warpingPath[index].index1;
        // let index2 = this.#dtw.warpingPath[index].index2;
        // let calculatedDistance = DTWManager.calculateDistance(this.#longerSequencePoses[index1],
        //     this.#shorterSequencePoses[index2]).toFixed(2);
    }
}

export {PoseDetailRenderer};