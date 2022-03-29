class DTW {
    distance;
    warpingPath;
    context;
    largestDistance;
    lowestDistance;

    constructor(distance, warpingPath, context) {
        this.distance = distance;
        this.warpingPath = warpingPath;
        this.context = context;
        this.#setLargestAndLowestDistance();
    }

    #setLargestAndLowestDistance() {
        if (this.context.useContext) {
            this.lowestDistance = context.lowestDistanceAverage
            this.largestDistance = context.largestDistanceAverage
        } else {
            let maximalPoseDistance = 0;
            let minimalPoseDistance = Number.POSITIVE_INFINITY;

            for (let i = 1; i < this.warpingPath.length; i++) {
                let poseDistance = this.warpingPath[i].poseDistance;
                maximalPoseDistance = (poseDistance > maximalPoseDistance) ? poseDistance : maximalPoseDistance;
                minimalPoseDistance = (poseDistance < minimalPoseDistance) ? poseDistance : minimalPoseDistance;
            }

            this.largestDistance = maximalPoseDistance;
            this.lowestDistance = minimalPoseDistance;
        }
    }
}

export {DTW};