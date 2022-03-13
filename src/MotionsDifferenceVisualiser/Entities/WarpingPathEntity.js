class WarpingPathEntity {
    constructor(index1, index2, poseDistance, cumulativeDistance) {
        this.index1 = index1;
        this.index2 = index2;
        this.poseDistance = poseDistance;
        this.cumulativeDistance = cumulativeDistance;
    }
}

export {WarpingPathEntity};