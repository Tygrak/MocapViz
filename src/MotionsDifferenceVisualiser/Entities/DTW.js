class DTW {
    distance;
    warpingPath;
    context;

    largestDistance;
    lowestDistance;
    colorCoefficient;

    // maximal pose distance (ie: maxContextMultiple = 2 => if pose distance is larger than
    // (poseAverage * maxCountMultiple) then color will be the worst possible
    maxContextMultiple = 2;

    // value 0-255 which represents context importance during coloring
    #contextPart = 150;
    #rgbaValues = 255;

    constructor(distance, warpingPath, context) {
        this.distance = distance;
        this.warpingPath = warpingPath;
        this.context = context
        this.#setLargestAndLowestDistance();
        this.#setColorCoeff();
    }

    #setLargestAndLowestDistance() {
        let maximalPoseDistance = 0;
        let minimalPoseDistance = Number.POSITIVE_INFINITY;

        for (let i = 1; i < this.warpingPath.length; i ++) {
            let poseDistance = this.warpingPath[i].poseDistance;
            maximalPoseDistance = (poseDistance > maximalPoseDistance) ? poseDistance : maximalPoseDistance;
            minimalPoseDistance = (poseDistance < minimalPoseDistance) ? poseDistance : minimalPoseDistance;
        }

        this.largestDistance = maximalPoseDistance;
        this.lowestDistance = minimalPoseDistance;
    }

    setLargestDistance(newLargestDistance) {
        this.largestDistance = newLargestDistance;
        this.#setColorCoeff();
    }

    setLowestDistance(newLowestDistance) {
        this.lowestDistance = newLowestDistance;
        this.#setColorCoeff();
    }

    #setColorCoeff() {
        if (this.context.useContext) {
            this.colorCoefficient = (this.#rgbaValues - this.#contextPart) / (this.largestDistance - this.lowestDistance);
        } else {
            this.colorCoefficient = this.#rgbaValues / (this.largestDistance - this.lowestDistance);
        }
    }
}

export {DTW};