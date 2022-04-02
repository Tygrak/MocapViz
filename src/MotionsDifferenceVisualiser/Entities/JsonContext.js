class JsonContext {
    poseDistance;
    lowestDistance;
    largestDistance;
    dtwDistance;
    bodyParts;

    constructor(poseDistance, lowestDistance, largestDistance, dtwDistance, bodyParts) {
        this.poseDistance = poseDistance;
        this.lowestDistance = lowestDistance;
        this.largestDistance = largestDistance;
        this.dtwDistance = dtwDistance;
        this.bodyParts = bodyParts;
    }
}

export {JsonContext};