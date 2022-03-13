import {WarpingPathEntity} from "./WarpingPathEntity.js";

class DTWMatrixEntity {
    warpingPath = [];

    constructor(cumulativeDistance, poseDistance, warpingPath = [], index1 = -1, index2 = -1) {
        this.cumulativeDistance = cumulativeDistance;
        this.poseDistance = poseDistance;

        if (warpingPath.length !== 0) {
            this.warpingPath = warpingPath;
        }

        if (index1 !== -1 && index2 !== -1) {
            this.warpingPath.push(new WarpingPathEntity(index1, index2, poseDistance, cumulativeDistance));
        }
    }

    getWarpingPath() {
        return [...this.warpingPath];
    }
}

export {DTWMatrixEntity};