import {BodyPartManager} from "./BodyPartManager.js";
import {DTWMatrixEntity} from "../Entities/DTWMatrixEntity.js";
import {MatrixNeighbours} from "../Entities/MatrixNeighbours.js";
import {DTW} from "../Entities/DTW.js";
import {WarpingPathEntity} from "../Entities/WarpingPathEntity.js";

class DTWManager {
    static calculateDTW(sequence1, sequence2, jointIndex, context) {
        let arr = DTWManager.#calculateDTWAlgorithm(sequence1, sequence2, jointIndex);
        return new DTW(arr[arr.length - 1][arr[0].length - 1].cumulativeDistance,
            arr[arr.length - 1][arr[0].length - 1].getWarpingPath(),
            context);
    }

    static calculateDtwPerBodyPart(sequence1, sequence2, dtw, bodyPart, model, context) {
        let indexes = BodyPartManager.getIndexesPerBodyPart(bodyPart, model);
        let warpingPath = [];

        for (let i = 0; i < dtw.warpingPath.length; i ++) {
            let j = dtw.warpingPath[i].index1
            let k = dtw.warpingPath[i].index2;
            warpingPath.push(new WarpingPathEntity(j, k,
                DTWManager.#getDistancePerBodyPart(sequence1[j], sequence2[k], indexes),
                0)
            );
        }

        return new DTW(0, warpingPath, context);
    }

    static #calculateDTWAlgorithm(sequence1, sequence2, jointIndexes) {
        let sequenceLength1 = sequence1.length + 1;
        let sequenceLength2 = sequence2.length + 1;

        let arr = new Array(sequenceLength1);
        for (let i = 0; i < sequenceLength1; i++) {
            arr[i] = new Array(sequenceLength2);
        }

        for (let i = 0; i < sequenceLength1; i++) {
            arr[i][0] = new DTWMatrixEntity(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        }

        for (let i = 0; i < sequenceLength2; i++) {
            arr[0][i] = new DTWMatrixEntity(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        }

        arr[0][0] = new DTWMatrixEntity(0, 0, []);

        for (let i = 1; i < sequenceLength1; i++) {
            for (let j = 1; j < sequenceLength2; j++) {
                let matrixNeighbours = new MatrixNeighbours(arr[i - 1][j - 1], arr[i][j - 1], arr[i - 1][j]);
                arr[i][j] = DTWManager.#compareTwoTimeSeries(sequence1[i - 1], sequence2[j - 1], matrixNeighbours, jointIndexes, i - 1, j - 1);
            }
        }

        return arr;
    }

    static #compareTwoTimeSeries(m1, m2, matrixNeighbours, jointIndexes, index1, index2) {
        let euclidDistance = (jointIndexes === -1) ? DTWManager.#getValueFromModels(m1, m2) : DTWManager.#getDistancePerBodyPart(m1, m2, jointIndexes);
        let minSquareEntity = DTWManager.#findLowestSquareValue(matrixNeighbours);
        return new DTWMatrixEntity(euclidDistance + minSquareEntity.cumulativeDistance, euclidDistance, minSquareEntity.getWarpingPath(), index1, index2);
    }

    static #findLowestSquareValue(matrixNeighbours) {
        let minPreviousValue = Math.min(matrixNeighbours.leftBottom.cumulativeDistance, matrixNeighbours.leftUpper.cumulativeDistance, matrixNeighbours.rightBottom.cumulativeDistance);

        // refactor?
        if (minPreviousValue === matrixNeighbours.leftBottom.cumulativeDistance) {
            return matrixNeighbours.leftBottom;
        } else if (minPreviousValue === matrixNeighbours.leftUpper.cumulativeDistance) {
            return matrixNeighbours.leftUpper;
        } else if (minPreviousValue === matrixNeighbours.rightBottom.cumulativeDistance) {
            return matrixNeighbours.rightBottom;
        }

        // refactor: throw new...
        console.log("Error!");
        return -1;
    }

    static #getValueFromModels(m1, m2) {
        let distance = 0;
        for (let i = 0; i < m1.length; i++) {
            distance += DTWManager.getVectorEuclideanDistance(m1[i], m2[i]);
        }
        return Math.sqrt(distance);
    }

    static getVectorEuclideanDistance(v1, v2) {
        return Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2) + Math.pow(v1.z - v2.z, 2);
    }

    static #getDistancePerBodyPart(m1, m2, jointIndexes) {
        let distance = 0;
        jointIndexes.forEach(function(i) {
            distance += DTWManager.getVectorEuclideanDistance(m1[i], m2[i]);
        });
        return Math.sqrt(distance);
    }
}

export {DTWManager};