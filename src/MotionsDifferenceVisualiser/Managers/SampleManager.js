import {saveAs} from "../../lib/FileSaver.js";
import {SequenceManager} from "./SequenceManager.js";
import {DTWManager} from "./DTWManager.js";
import * as Model from "../../model.js";
import {Context} from "../Entities/Context.js";
import {ContextManager} from "./ContextManager.js";
import {BodyParts} from "../Entities/BodyParts.js";
import {BodyPartContext} from "../Entities/BodyPartContext.js";

class SampleManager {
    static arrayAverage(array) {
        return array.reduce((a, b) => a + b, 0) / array.length;
    }

    static sampleDataSet(sequences, sampleCount, model) {
        let samples = SampleManager.#doSampling(sequences, sampleCount, model);
        let poseDistance = samples[0];
        let lowestDistance = samples[1];
        let largestDistance = samples[2];
        let dtwDistance = samples[3];
        let torso = samples[4].torso;
        let leftHand = samples[4].leftHand;
        let rightHand = samples[4].rightHand;
        let leftFoot = samples[4].leftLeg;
        let rightFoot = samples[4].rightLeg;

        let content = ContextManager.createContextFile(poseDistance, lowestDistance, largestDistance,  dtwDistance,
            new BodyParts(torso, leftHand, rightHand, leftFoot, rightFoot));
        SampleManager.downloadFile(content);
    }

    static downloadFile(content) {
        let blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        alert("Context is downloading on your machine");
        saveAs(blob, "sampling.json");
    }

    static #doSampling(sequences, sampleCount, model) {
        let maxIndex = sequences.length;
        let samples = [];
        for (let i = 0; i < sampleCount; i ++) {
            samples.push(SampleManager.#selectTwoSamples(sequences, maxIndex));
        }

        return SampleManager.countDTWsAverage(samples, model)
    }

    static #selectTwoSamples(sequences, maxIndex) {
        let index1 = Math.floor(Math.random() * maxIndex);
        let index2 = Math.floor(Math.random() * maxIndex);
        return [sequences[index1], sequences[index2]];
    }

    static countDTWsAverage(samples, model) {
        let DTWs = [];
        let poseDistances = [];
        let lowestDistances = [];
        let largestDistances = [];
        let bodyParts = [[], [], [], [], []];

        samples.forEach(sample => {
            let sequence1 = SequenceManager.getPoseCoordinatesPerSequence(sample[0]);
            let sequence2 = SequenceManager.getPoseCoordinatesPerSequence(sample[1]);

            let dtw = DTWManager.calculateDTW(sequence1, sequence2, -1, new Context(false));
            DTWs.push(dtw.distance);
            poseDistances.push(SampleManager.#calculateDistanceAverage(dtw.warpingPath));
            lowestDistances.push(dtw.lowestDistance);
            largestDistances.push(dtw.largestDistance);
            bodyParts = SampleManager.#addBodyPartsDistanceAverage(sequence1, sequence2, dtw, bodyParts, model);
        });

        let dtwAverage = SampleManager.arrayAverage(DTWs);
        let distanceAverage = SampleManager.arrayAverage(poseDistances);
        let lowestDistanceAverage = SampleManager.arrayAverage(lowestDistances);
        let largestDistanceAverage = SampleManager.arrayAverage(largestDistances);
        let bodyPartsAverage = SampleManager.calculateBodyPartsAverage(bodyParts[0], bodyParts[1], bodyParts[2], bodyParts[3], bodyParts[4])

        return [distanceAverage, lowestDistanceAverage, largestDistanceAverage, dtwAverage, bodyPartsAverage];
    }

    static #addBodyPartsDistanceAverage(seq1, seq2, dtw, bodyParts, model) {
        bodyParts[0].push(SampleManager.#calculateDtwPerBodyPart(seq1, seq2, dtw, Model.BoneType.torso, model));
        bodyParts[1].push(SampleManager.#calculateDtwPerBodyPart(seq1, seq2, dtw, Model.BoneType.leftHand, model));
        bodyParts[2].push(SampleManager.#calculateDtwPerBodyPart(seq1, seq2, dtw, Model.BoneType.rightHand, model));
        bodyParts[3].push(SampleManager.#calculateDtwPerBodyPart(seq1, seq2, dtw, Model.BoneType.leftLeg, model));
        bodyParts[4].push(SampleManager.#calculateDtwPerBodyPart(seq1, seq2, dtw, Model.BoneType.rightLeg, model));
        return bodyParts;
    }

    static #calculateDtwPerBodyPart(seq1, seq2, dtw, bodyPart, model) {
        let context = new Context(false);
        let bodyPartDtw = DTWManager.calculateDtwPerBodyPart(seq1, seq2, dtw, bodyPart, model, context);
        let poseDistance = SampleManager.#calculateDistanceAverage(bodyPartDtw.warpingPath);
        return new BodyPartContext(poseDistance, bodyPartDtw.lowestDistance, bodyPartDtw.largestDistance);
    }

    static calculateBodyPartsAverage(torsos, leftHands, rightHands, leftLegs, rightLegs) {
        return new BodyParts(
            SampleManager.#calculateBodyPartAverage(torsos),
            SampleManager.#calculateBodyPartAverage(leftHands),
            SampleManager.#calculateBodyPartAverage(rightHands),
            SampleManager.#calculateBodyPartAverage(leftLegs),
            SampleManager.#calculateBodyPartAverage(rightLegs)
        )
    }

    static #calculateBodyPartAverage(bodyPartArray) {
        let poseDistances = [];
        let lowestDistances = [];
        let largestDistances = [];

        bodyPartArray.forEach(bp => {
            poseDistances.push(bp.poseDistance);
            lowestDistances.push(bp.lowestDistance);
            largestDistances.push(bp.largestDistance);
        });

        return new BodyPartContext(
            SampleManager.arrayAverage(poseDistances),
            SampleManager.arrayAverage(lowestDistances),
            SampleManager.arrayAverage(largestDistances));
    }

    static #calculateDistanceAverage(warpingPath) {
        let poseDistances = [];
        warpingPath.forEach(wp => poseDistances.push(wp.poseDistance));
        return SampleManager.arrayAverage(poseDistances);
    }
}

export {SampleManager};