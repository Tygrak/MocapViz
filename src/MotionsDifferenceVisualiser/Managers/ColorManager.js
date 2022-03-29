import {SampleManager} from "./SampleManager.js";

class ColorManager {
    static getColorForSequenceIndex(index, dtw, isShorterSequence = false) {
        let poseDistance = ColorManager.#getPoseDistanceAverageForIndex(index, dtw.warpingPath, isShorterSequence);
        return ColorManager.#selectColorByPoseDistance(poseDistance, dtw);
    }

    static getRGBFromColor(color) {
        return `rgb(${color}, ${255 - color}, 0)`;
    }

    static getColorForWarpingPathIndex(index, dtw) {
        let poseDistance = dtw.warpingPath[index].poseDistance;
        return ColorManager.#selectColorByPoseDistance(poseDistance, dtw);
    }

    static #getPoseDistanceAverageForIndex(index, warpingPath, shorter = false) {
        let poseDistances = [];

        let paths = warpingPath.filter(function (warpingEntity) {
            if (shorter) {
                return (warpingEntity.index2 === index);
            }
            return (warpingEntity.index1 === index);
        });

        paths.forEach(p => poseDistances.push(p.poseDistance));

        return SampleManager.arrayAverage(poseDistances);
    }

    static #selectColorByPoseDistance(poseDistance, dtw) {
        let colorCoefficient = (poseDistance - dtw.lowestDistance) / (dtw.largestDistance - dtw.lowestDistance);

        if (colorCoefficient > 1) colorCoefficient = 1;
        if (colorCoefficient < 0) colorCoefficient = 0;

        return Math.floor(colorCoefficient * 255);
    }
}

export {ColorManager};