import * as Core from "../mocapCore.js";
import {VisualizationDrawer} from "./VizualizationDrawer.js";
import {DTWCalculator} from "./DTWCalculator.js";
import * as Model from "../model.js";
import {saveAs} from '../lib/FileSaver.js';
import {motionCategories} from "../model.js";

class VisualizationService {
    sampleCount = 10;
    context = new Context(0);
    model = Model.modelVicon;
    #longerProcessed;
    #shorterProcessed;

    createSequenceComparisonVisualization(sequence1, sequence2, visualizationWidth, visualizationHeight, drawStyle, drawStyleBlur, mapWidth, mapHeight, contextOption, defaultContext = "", lineCoefficient = 1) {
        let useContext = (contextOption != ContextOption.NO_CONTEXT);
        let contextVal = 0;
        let dtwA = 0;
        let bodyPartsAverage = new BodyPart(0,0,0,0,0);
        if (useContext !== false) {
            if (contextOption === ContextOption.SAMPLED_CONTEXT) {
                if (defaultContext.length !== 0) {
                    let parsedContext = JSON.parse(defaultContext);
                    this.context.setValue(parsedContext.distanceA);
                    dtwA = parsedContext.dtwA;
                    bodyPartsAverage = new BodyPart(parsedContext.bodyParts["torso"], parsedContext.bodyParts["leftHand"],
                        parsedContext.bodyParts["rightHand"], parsedContext.bodyParts["leftFoot"], parsedContext.bodyParts["rightFoot"]);
                }
                contextVal = this.context.getValue();
            } else if (contextOption === ContextOption.BUILT_CONTEXT) {
                contextVal = this.context.getBuiltValue();
            }
        }

        let sortedSequences = VisualizationService.#sortSequences(sequence1, sequence2);
        let longerSeq = sortedSequences[0];
        let shorterSeq = sortedSequences[1];

        let category1 = VisualizationService.#getCategory(longerSeq[0]);
        let category2 = VisualizationService.#getCategory(shorterSeq[0]);

        let jointsCount = Core.getSequenceJointsPerFrame(longerSeq);
        this.drawer = new VisualizationDrawer(visualizationWidth, visualizationHeight, drawStyle, jointsCount, drawStyleBlur, mapWidth, mapHeight, this.model);

        // draw skeletons
        let yThird = visualizationHeight / (visualizationWidth / visualizationHeight * 6);
        this.#longerProcessed = this.drawer.processSequenceForDrawing(longerSeq);
        let longerPositions = this.drawer.drawSequenceIntoImage(this.#longerProcessed, yThird * 2);
        this.#shorterProcessed = this.drawer.processSequenceForDrawing(shorterSeq);
        let shorterPositions = this.drawer.drawSequenceIntoImage(this.#shorterProcessed, 0, longerSeq.length / shorterSeq.length);

        // count DTW
        longerSeq = this.#parseSequence(longerSeq);
        shorterSeq = this.#parseSequence(shorterSeq);

        // if we want to use context, the value of distance will have only 105/255 of 1 the rest will be context
        let dtw = DTWCalculator.calculateDTW(longerSeq, shorterSeq, -1, contextVal, useContext);

        if (contextOption === ContextOption.BUILT_CONTEXT) {
            this.context.addNewSample(VisualizationService.#countDistanceAverage(dtw));
        }

        // draw DTW
        this.drawer.drawDTWInfoToImage(dtw.Val, category1, category2, dtwA);
        console.log("DTW result: ");
        console.log(dtw);

        let dotCoords1 = this.drawer.drawDots(yThird * 2 - 0.35, longerPositions, this.#longerProcessed.frames, dtw);
        let dotCoords2 = this.drawer.drawDots(yThird + 0.15, shorterPositions, this.#shorterProcessed.frames, dtw, true);

        // draw lines
        this.drawer.drawLines(dotCoords1, dotCoords2, lineCoefficient, dtw);

        this.drawer.setDetailView(dtw, JSON.parse(JSON.stringify(this.#longerProcessed)), JSON.parse(JSON.stringify(this.#shorterProcessed)), dotCoords1, dotCoords2);

        // draw body parts

        let dtwPerBodyParts = this.#visualizeBodyParts(longerSeq, shorterSeq, dtw, bodyPartsAverage);
        this.drawer.drawBars(dtwPerBodyParts);

        // timeAlignment
        let timeAlignedLongerSeq = VisualizationService.#reduceArray(longerSeq, shorterSeq.length);
        this.#timeAlignedVisualization(timeAlignedLongerSeq, shorterSeq, contextVal, useContext, visualizationWidth, visualizationHeight, lineCoefficient);

        // add maps
        return this.drawer.putTogetherImage(this.#longerProcessed, this.#shorterProcessed);
    }

    sampleDataSet(sequences, count) {
        let dtwSamples = 0;
        let distanceSamples = 0;
        let torso = 0;
        let leftHand = 0;
        let rightHand = 0;
        let leftFoot = 0;
        let rightFoot = 0;

        for (let i = 0; i < count; i ++) {
            let sample = this.#doSampling(sequences);
            dtwSamples += sample[0];
            distanceSamples += sample[1];
            torso += sample[2][0];
            leftHand += sample[2][1];
            rightHand += sample[2][2];
            leftFoot += sample[2][3];
            rightFoot += sample[2][4];
        }

        this.context = (distanceSamples / count);
        let dtwA = (dtwSamples / count);
        torso = torso / count;
        leftHand = leftHand / count;
        rightHand = rightHand / count;
        leftFoot = leftFoot / count;
        rightFoot = rightFoot / count;

        //save data
        let content = "{\n  \"distanceA\": " + this.context.toString() + ",\n  " +
            "\"dtwA\": " + dtwA.toString() + ",\n  " +
            "\"bodyParts\": " + "{\"torso\": " + torso.toString() + ", " +
            "\"leftHand\": " + leftHand.toString() + ", " +
            "\"rightHand\": " + rightHand.toString() + ", " +
            "\"leftFoot\": " + leftFoot.toString() + ", " +
            "\"rightFoot\": " + rightFoot.toString() + "}\n" +"}";
        let blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        saveAs(blob, "sampling.json");
    }

    clearSampling() {
        this.context = 0;
    }

    #timeAlignedVisualization(sequence1, sequence2, contextVal, useContext, visualizationWidth, visualizationHeight, lineCoefficient) {
        let processed1 = this.#longerProcessed;
        processed1.frames = VisualizationService.#reduceArray(this.#longerProcessed.frames, this.#shorterProcessed.frames.length);

        let yThird = visualizationHeight / (visualizationWidth / visualizationHeight * 6);
        let positions1 = this.drawer.drawSequenceIntoImage(processed1, yThird * 2, 1, this.drawer.timeAlignedRenderer);
        let positions2 = this.drawer.drawSequenceIntoImage(this.#shorterProcessed, 0, sequence1.length / sequence2.length, this.drawer.timeAlignedRenderer);

        let dtw = DTWCalculator.calculateDTW(sequence1, sequence2, -1, contextVal, useContext);

        let dotCoords1 = this.drawer.drawDots(yThird * 2 - 0.35, positions1, processed1.frames, dtw, false, this.drawer.timeAlignedRenderer);
        let dotCoords2 = this.drawer.drawDots(yThird + 0.15, positions2, this.#shorterProcessed.frames, dtw, true, this.drawer.timeAlignedRenderer);

        // draw lines
        this.drawer.drawLines(dotCoords1, dotCoords2, lineCoefficient, dtw, this.drawer.timeAlignedRenderer);

        this.drawer.drawTimeAlignmentBars(dtw.Map, sequence1.length);
    }

    static #reduceArray(longerSeq, desiredLength) {
        let newLongerSeq = [];
        let trimmedLength = longerSeq.length - 2;
        let trimmedDesiredLength  = desiredLength - 2;

        newLongerSeq[0] = longerSeq[0];

        let i = 0;
        let j = 0;
        while (j < trimmedLength) {
            let diff = (i + 1) * trimmedLength - (j + 1) * trimmedDesiredLength;

            if (diff < trimmedLength / 2) {
                i ++;
                j ++;
                newLongerSeq[i] = longerSeq[j];
            } else {
                j ++;
            }
        }

        newLongerSeq[trimmedDesiredLength + 1] = longerSeq[trimmedLength + 1];

        return newLongerSeq;
    }

    static #sortSequences(sequence1, sequence2) {
        let longerSeq;
        let shorterSeq;
        if (sequence1.length > sequence2.length) {
            longerSeq = sequence1;
            shorterSeq = sequence2
        } else {
            longerSeq = sequence2;
            shorterSeq = sequence1;
        }

        return [longerSeq, shorterSeq];
    }

    #visualizeBodyParts(longerSeq, shorterSeq, dtw, bodyPartsAverage) {
        let dtws = [];
        dtws.push([DTWCalculator.dtwPerBodyPart(longerSeq, shorterSeq, dtw, Model.BoneType.torso, this.model, bodyPartsAverage.torso), "Torso"]);
        dtws.push([DTWCalculator.dtwPerBodyPart(longerSeq, shorterSeq, dtw, Model.BoneType.leftHand, this.model, bodyPartsAverage.leftHand), "Left hand"]);
        dtws.push([DTWCalculator.dtwPerBodyPart(longerSeq, shorterSeq, dtw, Model.BoneType.rightHand, this.model, bodyPartsAverage.rightHand), "Right hand"]);
        dtws.push([DTWCalculator.dtwPerBodyPart(longerSeq, shorterSeq, dtw, Model.BoneType.leftLeg, this.model, bodyPartsAverage.leftLeg), "Left leg"]);
        dtws.push([DTWCalculator.dtwPerBodyPart(longerSeq, shorterSeq, dtw, Model.BoneType.rightLeg, this.model, bodyPartsAverage.rightLeg), "Right leg"]);

        // let largestDistance = 0;
        // let lowestDistance = Number.POSITIVE_INFINITY;
        // for (let i = 0; i < dtws.length; i ++) {
        //     const newLargestDistance = dtws[i][0].LargestDistance;
        //     largestDistance =  (newLargestDistance > largestDistance) ? newLargestDistance : largestDistance;
        //
        //     const newLowestDistance = dtws[i][0].LowestDistance;
        //     largestDistance = (newLowestDistance < lowestDistance) ? newLowestDistance : lowestDistance;
        // }
        //
        // for (let i = 0; i < dtws.length; i ++) {
        //     dtws[i][0].setLargestDistance(largestDistance);
        //     dtws[i][0].setLowestDistance(lowestDistance);
        // }
        return dtws;
    }

    // independent body parts
    #visualizeBodyPartsIndependent(longerSeq, shorterSeq, contextCoeff, useContext) {
        let dtws = [];
        dtws.push([DTWCalculator.dtwPerBodyPart(longerSeq, shorterSeq, contextCoeff, useContext, Model.BoneType.leftLeg, this.model), "Left leg:"]);
        dtws.push([DTWCalculator.dtwPerBodyPart(longerSeq, shorterSeq, contextCoeff, useContext, Model.BoneType.rightLeg, this.model), "Right leg:"]);
        dtws.push([DTWCalculator.dtwPerBodyPart(longerSeq, shorterSeq, contextCoeff, useContext, Model.BoneType.leftHand, this.model), "Left hand:"]);
        dtws.push([DTWCalculator.dtwPerBodyPart(longerSeq, shorterSeq, contextCoeff, useContext, Model.BoneType.rightHand, this.model), "Right hand:"]);
        dtws.push([DTWCalculator.dtwPerBodyPart(longerSeq, shorterSeq, contextCoeff, useContext, Model.BoneType.torso, this.model), "Torso:"]);
        return dtws;
    }

    #doSampling(sequences) {
        let coeff = Math.ceil(sequences.length / (this.sampleCount * 2));
        if (coeff < 1) {
            coeff = 1;
        }

        let samples = [];
        for (let i = 0; i < sequences.length; i += coeff) {
            samples.push(sequences[i]);
        }

        let shuffledSamples = VisualizationService.#shuffle(samples);
        return this.#countDTWsAverage(shuffledSamples)
    }

    #countDTWsAverage(samples) {
        let DTWs = [];
        let poseDistances = [];
        let bodyParts = [[], [], [], [], []];

        if (samples % 2 === 1) {
            samples.pop();
        }

        for (let i = 0; i < samples.length - 1; i += 2) {
            let seq1 = this.#parseSequence(samples[i]);
            let seq2 = this.#parseSequence(samples[i + 1]);

            let dtw = DTWCalculator.calculateDTW(seq1, seq2, -1, 0, false);
            DTWs.push(dtw.Val);
            poseDistances.push(VisualizationService.#countDistanceAverage(dtw));
            bodyParts = this.#addBodyPartsDistanceAverage(seq1, seq2, dtw, bodyParts);
        }

        let dtwAverage = VisualizationService.arrayAverage(DTWs);
        let distanceAverage = VisualizationService.arrayAverage(poseDistances);
        let bodyPartsAverage = [];
        bodyParts.forEach(bp => bodyPartsAverage.push(VisualizationService.arrayAverage(bp)));
        return [dtwAverage, distanceAverage, bodyPartsAverage];
    }

    static #countDistanceAverage(dtw) {
        let valueDistance = dtw.Map[0].poseDistance;

        for (let i = 1; i < dtw.Map.length; i += 1) {
            valueDistance += dtw.Map[i].poseDistance;
        }

        return valueDistance / dtw.Map.length;
    }

    #addBodyPartsDistanceAverage(seq1, seq2, dtw, bodyParts) {
        const torsoWarpingPath = DTWCalculator.dtwPerBodyPart(seq1, seq2, dtw, Model.BoneType.torso, this.model).Map;
        bodyParts[0].push(this.#extractPoseAverageFromWarpingPath(torsoWarpingPath));

        const leftHandWarpingPath = DTWCalculator.dtwPerBodyPart(seq1, seq2, dtw, Model.BoneType.leftHand, this.model).Map;
        bodyParts[1].push(this.#extractPoseAverageFromWarpingPath(leftHandWarpingPath));

        const rightHandWarpingPath = DTWCalculator.dtwPerBodyPart(seq1, seq2, dtw, Model.BoneType.rightHand, this.model).Map;
        bodyParts[2].push(this.#extractPoseAverageFromWarpingPath(rightHandWarpingPath));

        const leftLegWarpingPath = DTWCalculator.dtwPerBodyPart(seq1, seq2, dtw, Model.BoneType.leftLeg, this.model).Map;
        bodyParts[3].push(this.#extractPoseAverageFromWarpingPath(leftLegWarpingPath));

        const rightLegWarpingPath = DTWCalculator.dtwPerBodyPart(seq1, seq2, dtw, Model.BoneType.rightLeg, this.model).Map;
        bodyParts[4].push(this.#extractPoseAverageFromWarpingPath(rightLegWarpingPath));

        return bodyParts;
    }

    #extractPoseAverageFromWarpingPath(warpingPath) {
        let poses = [];
        warpingPath.forEach(wp => poses.push(wp.poseDistance));
        return VisualizationService.arrayAverage(poses);
    }

    static arrayAverage(array) {
        return array.reduce((a, b) => a + b, 0) / array.length;
    }

    #parseSequence(seq) {
        let frames = seq.map((frame) => {
            return frame.replace(" ", "").split(';').map((joint) => {
                let xyz = joint.split(',');
                return {x:xyz[0], y:xyz[1], z:xyz[2]};
            });
        });
        return frames.filter((f) => {return f.length > 0 && !isNaN(f[0].x) && !isNaN(f[0].y) && !isNaN(f[0].z)});
    }

    static #shuffle(array) {
        let currentIndex = array.length
        let randomIndex;

        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }

        return array;
    }

    static #getCategory(sequenceInfo) {
        let splitSequenceInfo = sequenceInfo.split(' ');
        let splitNumInfo = splitSequenceInfo[splitSequenceInfo.length - 1].split('_');
        let categoryNumber = splitNumInfo[1];
        return motionCategories[categoryNumber];
    }
}

class Context {
    #value;
    #values = [];
    #buildValue = 0;

    constructor(value) {
        this.#value = value;
    }

    setValue(val) {
        this.#value = val;
    }

    getValue() {
        return this.#value;
    }

    getBuiltValue() {
        return this.#buildValue;
    }

    addNewSample(sample) {
        this.#values.push(sample);
        this.#buildValue = VisualizationService.arrayAverage(this.#values);
    }
}

class BodyPart {
    constructor(torso, leftHand, rightHand, leftLeg, rightLeg) {
        this.torso = torso;
        this.leftHand = leftHand;
        this.rightHand = rightHand;
        this.leftLeg = leftLeg;
        this.rightLeg = rightLeg;
    }
}

const ContextOption = {
    NO_CONTEXT: 1,
    SAMPLED_CONTEXT: 2,
    BUILT_CONTEXT: 3
}

export {VisualizationService, ContextOption}