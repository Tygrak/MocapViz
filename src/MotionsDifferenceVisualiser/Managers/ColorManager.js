import {SampleManager} from "./SampleManager.js";

class ColorManager {
    static getColorForSequenceIndex(index, dtw, isShorterSequence) {
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
        let contextValue;
        if (dtw.context.useContext) {
            let contextCoefficient = poseDistance / dtw.context.poseDistanceAverage;
            contextCoefficient = (contextCoefficient > dtw.maxContextMultiple) ? dtw.maxContextMultiple : contextCoefficient;
            contextCoefficient = contextCoefficient / dtw.maxContextMultiple;
            contextValue = dtw.ContextPart * contextCoefficient;
        } else {
            contextValue = 0;
        }
        poseDistance -= dtw.lowestDistance;
        return Math.floor((dtw.colorCoefficient * poseDistance) + contextValue);
    }
}

export {ColorManager};