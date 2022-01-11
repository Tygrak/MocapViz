import * as Core from "../mocapCore.js";
import {VisualizationDrawer} from "./VizualizationDrawer.js";
import {DTWCalculator} from "./DTWCalculator.js";
import * as Model from "../model.js";
import {saveAs} from '../lib/FileSaver.js';

class VisualizationService {
    sampleCount = 100;
    context = new Context(0);
    model = Model.modelVicon;
    #longerProcessed;
    #shorterProcessed;

    createSequenceComparisonVisualization(sequence1, sequence2, visualizationWidth, visualizationHeight, drawStyle, drawStyleBlur, mapWidth, mapHeight, contextOption, defaultContext, lineCoefficient = 1, ) {
        let useContext = (contextOption !== ContextOption.NO_CONTEXT);
        let contextVal = 0;
        if (useContext !== false) {
            if (contextOption === ContextOption.SAMPLED_CONTEXT) {
                if (defaultContext > 0) {
                    this.context.setValue(defaultContext);
                }
                contextVal = this.context.getValue();
            } else if (contextOption === ContextOption.BUILT_CONTEXT) {
                contextVal = this.context.getBuiltValue();
            }
        }

        let sortedSequences = VisualizationService.#sortSequences(sequence1, sequence2);
        let longerSeq = sortedSequences[0];
        let shorterSeq = sortedSequences[1];

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
            this.context.addNewSample(dtw.Val);
        }

        // draw DTW
        this.drawer.drawDTWValueToImage(dtw.Val);
        console.log("DTW result: " + dtw.Val);

        let dotCoords1 = this.drawer.drawDots(yThird * 2, longerPositions, this.#longerProcessed.frames, dtw.Map, dtw.Arr, dtw.ColorCoeff, dtw.ContextColorCoeff, dtw.LowestDistance);
        let dotCoords2 = this.drawer.drawDots(yThird, shorterPositions, this.#shorterProcessed.frames, dtw.Map, dtw.Arr, dtw.ColorCoeff, dtw.ContextColorCoeff, dtw.LowestDistance, true);

        // draw lines
        this.drawer.drawLines(dotCoords1, dotCoords2, dtw.Map, dtw.Arr, lineCoefficient, dtw.ColorCoeff, dtw.ContextColorCoeff, dtw.LowestDistance);

        this.drawer.setDetailView(dtw, this.#longerProcessed, this.#shorterProcessed);

        // draw body parts
        let dtws = this.#visualizeBodyParts(longerSeq, shorterSeq, dtw.ContextColorCoeff, useContext);
        this.drawer.drawBars(dtws);

        // timeAlignment
        let timeAlignedLongerSeq = VisualizationService.#reduceArray(longerSeq, shorterSeq.length);
        this.#timeAlignedVisualization(timeAlignedLongerSeq, shorterSeq, contextVal, useContext, visualizationWidth, visualizationHeight, lineCoefficient);

        // add maps
        return this.drawer.putTogetherImage(this.#longerProcessed, this.#shorterProcessed);
    }

    #timeAlignedVisualization(sequence1, sequence2, contextVal, useContext, visualizationWidth, visualizationHeight, lineCoefficient) {
        let processed1 = this.#longerProcessed;
        processed1.frames = VisualizationService.#reduceArray(this.#longerProcessed.frames, this.#shorterProcessed.frames.length);

        let yThird = visualizationHeight / (visualizationWidth / visualizationHeight * 6);
        let positions1 = this.drawer.drawSequenceIntoImage(processed1, yThird * 2, 1, this.drawer.timeAlignedRenderer);
        let positions2 = this.drawer.drawSequenceIntoImage(this.#shorterProcessed, 0, sequence1.length / sequence2.length, this.drawer.timeAlignedRenderer);

        let dtw = DTWCalculator.calculateDTW(sequence1, sequence2, -1, contextVal, useContext);
        console.log("Special value: ");
        console.log(dtw.Val);

        let dotCoords1 = this.drawer.drawDots(yThird * 2, positions1, processed1.frames, dtw.Map, dtw.Arr, dtw.ColorCoeff, dtw.ContextColorCoeff, dtw.LowestDistance, false, this.drawer.timeAlignedRenderer);
        let dotCoords2 = this.drawer.drawDots(yThird, positions2, this.#shorterProcessed.frames, dtw.Map, dtw.Arr, dtw.ColorCoeff, dtw.ContextColorCoeff, dtw.LowestDistance, true, this.drawer.timeAlignedRenderer);

        // draw lines
        this.drawer.drawLines(dotCoords1, dotCoords2, dtw.Map, dtw.Arr, lineCoefficient, dtw.ColorCoeff, dtw.ContextColorCoeff, dtw.LowestDistance, this.drawer.timeAlignedRenderer);
    }

    sampleDataSet(sequences, count) {
        console.log("Starting!");
        let samples = 0;
        for (let i = 0; i < count; i ++) {
            samples += this.#doSampling(sequences);
        }
        console.log("Finished");
        this.context = (samples / count);
        //save data
        let blob = new Blob([this.context.toString()], { type: "text/plain;charset=utf-8" });
        console.log("Downloading!");
        saveAs(blob, "averageDtw.txt");
    }

    clearSampling() {
        this.context = 0;
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

    #visualizeBodyParts(longerSeq, shorterSeq, contextCoeff, useContext) {
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

        if (samples.length % 2 === 1) {
            samples.pop();
        }

        for (let i = 0; i < samples.length - 1; i += 2) {
            let seq1 = this.#parseSequence(samples[i]);
            let seq2 = this.#parseSequence(samples[i + 1]);
            let dtwMatrix = DTWCalculator.countDTW(seq1, seq2, -1);
            DTWs.push(dtwMatrix[dtwMatrix.length - 1][dtwMatrix[0].length - 1]);
        }

        return VisualizationService.arrayAverage(DTWs);
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

const ContextOption = {
    NO_CONTEXT: 1,
    SAMPLED_CONTEXT: 2,
    BUILT_CONTEXT: 3
}

export {VisualizationService, ContextOption}