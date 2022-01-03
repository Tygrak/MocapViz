import * as Core from "../mocapCore.js";
import {VisualizationDrawer} from "./VizualizationDrawer.js";
import {DTWCalculator} from "./DTWCalculator.js";
import * as Model from "../model.js";

class VisualizationService {
    sampleCount = 100;
    context = new Context(0);
    model = Model.modelVicon;
    #longerProcessed;
    #shorterProcessed;

    createSequenceComparisonVisualization(sequence1, sequence2, visualizationWidth, visualizationHeight, drawStyle, drawStyleBlur, mapWidth, mapHeight, lineCoefficient = 1, useContext = false) {
        let sortedSequences = VisualizationService.#sortSequences(sequence1, sequence2);
        let longerSeq = sortedSequences[0];
        let shorterSeq = sortedSequences[1];

        let jointsCount = Core.getSequenceJointsPerFrame(longerSeq);
        let drawer = new VisualizationDrawer(visualizationWidth, visualizationHeight, drawStyle, jointsCount, drawStyleBlur, mapWidth, mapHeight, this.model);

        // draw skeletons
        let yThird = visualizationHeight / (visualizationWidth / visualizationHeight * 6);
        this.#longerProcessed = drawer.processSequenceForDrawing(longerSeq);
        let longerPositions = drawer.drawSequenceIntoImage(this.#longerProcessed, yThird * 2);
        this.#shorterProcessed = drawer.processSequenceForDrawing(shorterSeq);
        let shorterPositions = drawer.drawSequenceIntoImage(this.#shorterProcessed, 0, longerSeq.length / shorterSeq.length);

        // count DTW
        // longerSeq = this.#parseSequence(longerSeq);
        // shorterSeq = this.#parseSequence(shorterSeq);
        // let dtw;
        // // if we want to use context, the value of distance will have only 105/255 of 1 the rest will be context
        // if (useContext) {
        //     dtw = DTWCalculator.calculateDTW(longerSeq, shorterSeq, -1, this.context.getValue(), useContext);
        // } else {
        //     dtw = DTWCalculator.calculateDTW(longerSeq, shorterSeq, -1, 0, useContext);
        // }
        //
        // // draw DTW
        // drawer.drawDTWValueToImage(dtw.Val);
        // console.log("DTW result: " + dtw.Val);
        //
        // let dotCoords1 = drawer.drawDots(yThird * 2, longerPositions, this.#longerProcessed.frames, dtw.Map, dtw.Arr, dtw.ColorCoeff, dtw.ContextColorCoeff, dtw.LowestDistance);
        // let dotCoords2 = drawer.drawDots(yThird, shorterPositions, this.#shorterProcessed.frames, dtw.Map, dtw.Arr, dtw.ColorCoeff, dtw.ContextColorCoeff, dtw.LowestDistance, true);
        //
        // // draw lines
        // drawer.drawLines(dotCoords1, dotCoords2, dtw.Map, dtw.Arr, lineCoefficient, dtw.ColorCoeff, dtw.ContextColorCoeff, dtw.LowestDistance);
        //
        // // set detail
        // drawer.setDetailView(dtw, this.#longerProcessed);
        //
        // // draw body parts
        // let dtws = this.#visualizeBodyParts(longerSeq, shorterSeq, dtw.ContextColorCoeff, useContext);
        //
        // drawer.drawBars(dtws);
        //
        // // add maps
        // return drawer.putTogetherImage(this.#longerProcessed, this.#shorterProcessed);
    }

    sampleDataSet(sequences, count) {
        let samples = 0;
        for (let i = 0; i < count; i ++) {
            samples += this.#doSampling(sequences);
        }
        this.context = (samples / count);
        console.log(this.context);
    }

    static onMouseMoveMapping(mouseEvent, dtw) {
        // console.log("I am here!");
        // const canvas = document.getElementById("detailCanvas");
        // console.log(canvas);
        // const ctx = canvas.getContext('2d');
        // console.log(ctx);
        // ctx.clearRect(0, 0, canvas.width, canvas.height);
        // ctx.font = "20px Arial";
        //
        // ctx.fillStyle = "black";
        // ctx.fillText(mouseEvent.x.toString(), 1, 21);
        // ctx.fillText(mouseEvent.y.toString(), 1, 43);
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

    static #findLargestDistance(path, dtwArr) {
        let max = 0;
        for (let i = 1; i < path.length; i ++) {
            let newVal = dtwArr[path[i][0]][path[i][1]] - dtwArr[path[i - 1][0]][path[i - 1][1]];
            max = (newVal > max) ? newVal : max;
        }
        return max;
    }

    static #findLowestDistance(path, dtwArr) {
        let min = Number.POSITIVE_INFINITY;
        for (let i = 1; i < path.length; i ++) {
            let newVal = dtwArr[path[i][0]][path[i][1]] - dtwArr[path[i - 1][0]][path[i - 1][1]];
            min = (newVal < min) ? newVal : min;
        }
        return min;
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
    #enabled = false;
    #values = [];
    #buildValue = 0;

    constructor(value) {
        this.#value = value;
    }

    enable() {
        this.#enabled = true;
    }

    disable() {
        this.#enabled = false;
    }

    isEnabled() {
        return this.#enabled;
    }

    setValue(value) {
        this.#value = value;
    }

    getValue() {
        return this.#value;
    }

    addNewSample(sample) {
        this.#values.push(sample);
        this.#buildValue = VisualizationService.arrayAverage(this.#values);
    }
}

export {VisualizationService}