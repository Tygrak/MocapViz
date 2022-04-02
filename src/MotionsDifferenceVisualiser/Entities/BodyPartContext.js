class BodyPartContext {
    poseDistance;
    lowestDistance;
    largestDistance;

    constructor(poseDistance, lowestDistance, largestDistance) {
        this.poseDistance = poseDistance;
        this.lowestDistance = lowestDistance;
        this.largestDistance = largestDistance;
    }
}

export {BodyPartContext};