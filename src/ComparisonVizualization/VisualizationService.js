import * as Core from "../mocapCore.js";
import {VisualizationDrawer} from "./VizualizationDrawer.js";
import {DTWHandler} from "./DTWHandler.js";

class VisualizationService {
    context = new Context(0);

    createSequenceComparisonVisualization(sequence1, sequence2, visualizationWidth, visualizationHeight, drawStyle, drawStyleBlur, mapWidth, mapHeight, lineCoefficient = 1, useContext = false) {
        let longerSeq;
        let shorterSeq;
        if (sequence1.length > sequence2.length) {
            longerSeq = sequence1;
            shorterSeq = sequence2
        } else {
            longerSeq = sequence2;
            shorterSeq = sequence1;
        }

        let jointsCount = Core.getSequenceJointsPerFrame(longerSeq);
        let drawer = new VisualizationDrawer(visualizationWidth, visualizationHeight, drawStyle, jointsCount, drawStyleBlur, mapWidth, mapHeight);

        // draw skeletons
        let yThird = visualizationHeight / (visualizationWidth / visualizationHeight * 6);
        let longerProcessed = drawer.processSequenceForDrawing(longerSeq);
        let longerPositions = drawer.drawSequenceIntoImage(longerProcessed, yThird * 2);
        let shorterProcessed = drawer.processSequenceForDrawing(shorterSeq);
        let shorterPositions = drawer.drawSequenceIntoImage(shorterProcessed, 0, longerSeq.length / shorterSeq.length);

        // count DTW
        longerSeq = this.#parseSequence(longerSeq);
        shorterSeq = this.#parseSequence(shorterSeq);
        let dtw;
        // if we want to use context, the value of distance will have only 105/255 of 1 the rest will be context
        if (useContext) {
            dtw = DTWHandler.calculateDTW(longerSeq, shorterSeq, -1, this.context.getValue(), useContext);
        } else {
            dtw = DTWHandler.calculateDTW(longerSeq, shorterSeq, -1, 0, useContext);
        }

        // draw DTW
        drawer.drawDTWValueToImage(dtw.Val);
        console.log("DTW result: " + dtw.Val);

        let dotCoords1 = drawer.drawDots(yThird * 2, longerPositions, longerProcessed.frames, dtw.Map, dtw.Arr, dtw.ColorCoeff, dtw.ContextColorCoeff, dtw.LowestDistance);
        let dotCoords2 = drawer.drawDots(yThird, shorterPositions, shorterProcessed.frames, dtw.Map, dtw.Arr, dtw.ColorCoeff, dtw.ContextColorCoeff, dtw.LowestDistance, true);

        // draw lines
        drawer.drawLines(dotCoords1, dotCoords2, dtw.Map, dtw.Arr, lineCoefficient, dtw.ColorCoeff, dtw.ContextColorCoeff, dtw.LowestDistance);

        // draw body parts
        let dtws = DTWHandler.dtwPerJoints(longerSeq, shorterSeq, dtw.ContextColorCoeff, useContext);
        drawer.drawBars(dtws);

        // add maps
        return drawer.putTogetherImage(longerProcessed, shorterProcessed);
    }

    sampleDataSet(sequences, count = 1) {
        let samples = 0;
        for (let i = 0; i < count; i ++) {
            samples += this.#doSampling(sequences);
        }
        return (samples / count);
    }

    #doSampling(sequences) {
        let coeff = Math.ceil(sequences.length / (sampleCount * 2));
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
            let dtwMatrix = (seq1, seq2, -1);
            DTWs.push(dtwMatrix[dtwMatrix.length - 1][dtwMatrix[0].length - 1]);
        }
        console.log(DTWs);
        return arrayAverage(DTWs);
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
        //TODO implement
    }
}

export {VisualizationService}