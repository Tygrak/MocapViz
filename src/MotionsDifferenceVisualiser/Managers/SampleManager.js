import {saveAs} from "../../lib/FileSaver.js";
import {SequenceManager} from "./SequenceManager.js";
import {DTWManager} from "./DTWManager.js";
import * as Model from "../../model.js";
import {Context} from "../Entities/Context.js";
import {ContextManager} from "./ContextManager.js";
import {BodyParts} from "../Entities/BodyParts.js";

class SampleManager {
    static sampleCount = 10;

    static arrayAverage(array) {
        return array.reduce((a, b) => a + b, 0) / array.length;
    }

    static sampleDataSet(sequences, count, model = Model.modelKinect, sampleCount = SampleManager.sampleCount) {
        let dtwSamples = 0;
        let distanceSamples = 0;
        let lowestDistanceSamples = 0;
        let largestDistanceSamples = 0;
        let torso = 0;
        let leftHand = 0;
        let rightHand = 0;
        let leftFoot = 0;
        let rightFoot = 0;

        for (let i = 0; i < count; i ++) {
            let sample = SampleManager.#doSampling(sequences, sampleCount, model);
            distanceSamples += sample[0];
            lowestDistanceSamples += sample[1];
            largestDistanceSamples += sample[2];
            dtwSamples += sample[3];
            torso += sample[4][0];
            leftHand += sample[4][1];
            rightHand += sample[4][2];
            leftFoot += sample[4][3];
            rightFoot += sample[4][4];
        }

        let distanceA = distanceSamples / count;
        let dtwA = dtwSamples / count;
        let lowestDistanceA = lowestDistanceSamples / count;
        let largestDistanceA = largestDistanceSamples / count;
        torso = torso / count;
        leftHand = leftHand / count;
        rightHand = rightHand / count;
        leftFoot = leftFoot / count;
        rightFoot = rightFoot / count;

        //save data
        let content = ContextManager.createContextFile(distanceA, lowestDistanceA, largestDistanceA,  dtwA,
            new BodyParts(torso, leftHand, rightHand, leftFoot, rightFoot));
        SampleManager.downloadSampleFile(content);
    }

    static downloadSampleFile(content) {
        let blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        alert("Context is downloading on your machine");
        saveAs(blob, "sampling.json");
    }

    static #doSampling(sequences, sampleCount, model) {
        let coeff = Math.ceil(sequences.length / (sampleCount * 2));
        if (coeff < 1) {
            coeff = 1;
        }

        let samples = [];
        for (let i = 0; i < sequences.length; i += coeff) {
            samples.push(sequences[i]);
        }

        let shuffledSamples = SampleManager.#shuffleSamples(samples);
        return SampleManager.countDTWsAverage(shuffledSamples, model)
    }

    static #shuffleSamples(samples) {
        let currentIndex = samples.length
        let randomIndex;

        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            [samples[currentIndex], samples[randomIndex]] = [
                samples[randomIndex], samples[currentIndex]];
        }

        return samples;
    }

    static countDTWsAverage(samples, model) {
        let DTWs = [];
        let poseDistances = [];
        let lowestDistances = [];
        let largestDistances = [];
        let bodyParts = [[], [], [], [], []];

        if (samples % 2 === 1) {
            samples.pop();
        }

        for (let i = 0; i < samples.length - 1; i += 2) {
            let sequence1 = SequenceManager.getPoseCoordinatesPerSequence(samples[i]);
            let sequence2 = SequenceManager.getPoseCoordinatesPerSequence(samples[i + 1]);

            let dtw = DTWManager.calculateDTW(sequence1, sequence2, -1, new Context(false));
            DTWs.push(dtw.distance);
            poseDistances.push(SampleManager.#countDistanceAverage(dtw));
            lowestDistances.push(dtw.lowestDistance);
            largestDistances.push(dtw.largestDistance);
            bodyParts = this.#addBodyPartsDistanceAverage(sequence1, sequence2, dtw, bodyParts, model);
        }

        let dtwAverage = SampleManager.arrayAverage(DTWs);
        let distanceAverage = SampleManager.arrayAverage(poseDistances);
        let lowestDistanceAverage = SampleManager.arrayAverage(lowestDistances);
        let largestDistanceAverage = SampleManager.arrayAverage(largestDistances);
        let bodyPartsAverage = [];
        bodyParts.forEach(bp => bodyPartsAverage.push(SampleManager.arrayAverage(bp)));
        return [distanceAverage, lowestDistanceAverage, largestDistanceAverage, dtwAverage, bodyPartsAverage];
    }

    static #countDistanceAverage(dtw) {
        let valueDistance = dtw.warpingPath[0].poseDistance;

        for (let i = 1; i < dtw.warpingPath.length; i += 1) {
            valueDistance += dtw.warpingPath[i].poseDistance;
        }

        return valueDistance / dtw.warpingPath.length;
    }

    static #addBodyPartsDistanceAverage(seq1, seq2, dtw, bodyParts, model) {
        let context = new Context(false);
        const torsoWarpingPath = DTWManager.calculateDtwPerBodyPart(seq1, seq2, dtw, Model.BoneType.torso, model, context).warpingPath;
        bodyParts[0].push(SampleManager.#extractPoseAverageFromWarpingPath(torsoWarpingPath));

        const leftHandWarpingPath = DTWManager.calculateDtwPerBodyPart(seq1, seq2, dtw, Model.BoneType.leftHand, model, context).warpingPath;
        bodyParts[1].push(SampleManager.#extractPoseAverageFromWarpingPath(leftHandWarpingPath));

        const rightHandWarpingPath = DTWManager.calculateDtwPerBodyPart(seq1, seq2, dtw, Model.BoneType.rightHand, model, context).warpingPath;
        bodyParts[2].push(SampleManager.#extractPoseAverageFromWarpingPath(rightHandWarpingPath));

        const leftLegWarpingPath = DTWManager.calculateDtwPerBodyPart(seq1, seq2, dtw, Model.BoneType.leftLeg, model, context).warpingPath;
        bodyParts[3].push(SampleManager.#extractPoseAverageFromWarpingPath(leftLegWarpingPath));

        const rightLegWarpingPath = DTWManager.calculateDtwPerBodyPart(seq1, seq2, dtw, Model.BoneType.rightLeg, model, context).warpingPath;
        bodyParts[4].push(SampleManager.#extractPoseAverageFromWarpingPath(rightLegWarpingPath));

        return bodyParts;
    }

    static #extractPoseAverageFromWarpingPath(warpingPath) {
        let poses = [];
        warpingPath.forEach(wp => poses.push(wp.poseDistance));
        return SampleManager.arrayAverage(poses);
    }
}

export {SampleManager};