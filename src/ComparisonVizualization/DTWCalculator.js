import * as Model from "../model.js";

class DTWCalculator {
    static calculateDTW(seq1, seq2, jointIndex, contextVal, useContext) {
        let arr = DTWCalculator.countDTW(seq1, seq2, jointIndex);

        let dtw = DTW.init(arr[arr.length - 1][arr[0].length - 1].cumulativeDistance, arr, arr[arr.length - 1][arr[0].length - 1].getWarpingPath(), useContext);

        if (contextVal !== 0) {
            dtw.DistanceAverage = contextVal;
        }

        return dtw;
    }

    static dtwPerBodyPart(seq1, seq2, dtw, bodyPart, model, bodyPartAverage = 0) {
        let indexes = DTWCalculator.#getIndexesPerBodyPart(bodyPart, model);
        let mapValues = [];

        for (let i = 0; i < dtw.Map.length; i ++) {
            let j = dtw.Map[i].index1
            let k = dtw.Map[i].index2;
            mapValues.push(new WarpingPathEntity(j, k,
                DTWCalculator.#getValueFromModelsPerBodyType(seq1[j], seq2[k], indexes),
                0)
            );
        }
        return new DTW(0, [], mapValues, bodyPartAverage, dtw.useContext);
    }

    // independent body parts
    static dtwPerBodyPartIndependent(seq1, seq2, dtwCoeff, useContext, bodyPart, model) {
        let indexes = DTWCalculator.#getIndexesPerBodyPart(bodyPart, model);

        let arr = DTWCalculator.countDTW(seq1, seq2, indexes);
        return new DTW(
            arr[arr.length - 1][arr[0].length - 1].cumulativeDistance,
            arr,
            arr[arr.length - 1][arr[0].length - 1].getWarpingPath(),
            dtwCoeff * (indexes.length / seq1[0].length),
            useContext);
    }

    static #getIndexesPerBodyPart(bodyPart, model) {
        if (model === Model.modelVicon) {
            return DTWCalculator.getIndexesForBodyPartsVicon(bodyPart);
        } else if (model === Model.modelKinect) {
            return DTWCalculator.getIndexesForBodyPartsKinect(bodyPart);
        }

        return null;
    }

    static getIndexesForBodyPartsVicon(bodyPart) {
        let filteredBones = Model.bonesVicon.filter(function(b) {
           return b.type === bodyPart
        });

        let set1 = new Set(filteredBones.map(fb => fb.a));
        let set2 = new Set(filteredBones.map(fb => fb.b));

        set2.forEach(set1.add, set1);
        return set2;
    }

    static getIndexesForBodyPartsKinect(bodyPart) {
        let filteredBones = Model.bonesKinect.filter(function(b) {
            return b.type === bodyPart
        });

        return filteredBones.map(b => b.a);
    }

    static countDTW(seq1, seq2, jointIndexes) {
        let len1 = seq1.length + 1;
        let len2 = seq2.length + 1;
        let arr = new Array(len1);
        for (let i = 0; i < len1; i++) {
            arr[i] = new Array(len2);
        }

        for (let i = 0; i < len1; i++) {
            arr[i][0] = new DTWEntity(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        }

        for (let i = 0; i < len2; i++) {
            arr[0][i] = new DTWEntity(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        }

        arr[0][0] = new DTWEntity(0, 0, []);

        for (let i = 1; i < len1; i++) {
            for (let j = 1; j < len2; j++) {
                let square = new DTWSquare(arr[i - 1][j - 1], arr[i][j - 1], arr[i - 1][j]);
                arr[i][j] = DTWCalculator.#compareTwoTimeSeries(seq1[i - 1], seq2[j - 1], square, jointIndexes, i - 1, j - 1);
            }
        }

        return arr;
    }

    static #compareTwoTimeSeries(m1, m2, square, jointIndexes, index1, index2) {
        let euclidDistance = (jointIndexes === -1) ? DTWCalculator.#getValueFromModels(m1, m2) : DTWCalculator.#getValueFromModelsPerBodyType(m1, m2, jointIndexes);
        let minSquareEntity = DTWCalculator.#findLowestSquareValue(square);
        return new DTWEntity(euclidDistance + minSquareEntity.cumulativeDistance, euclidDistance, minSquareEntity.getWarpingPath(), index1, index2);
    }

    static #findLowestSquareValue(square) {
        let minPreviousValue = Math.min(square.leftBottom.cumulativeDistance, square.leftUpper.cumulativeDistance, square.rightBottom.cumulativeDistance);

        // refactor?
        if (minPreviousValue === square.leftBottom.cumulativeDistance) {
            return square.leftBottom;
        } else if (minPreviousValue === square.leftUpper.cumulativeDistance) {
            return square.leftUpper;
        } else if (minPreviousValue === square.rightBottom.cumulativeDistance) {
            return square.rightBottom;
        }

        console.log("Error!");
        return -1;
    }

    static #getValueFromModels(m1, m2) {
        let distance = 0;
        for (let i = 0; i < m1.length; i++) {
            distance += DTWCalculator.#getVectorEuclideanDistance(m1[i], m2[i]);
        }
        return Math.sqrt(distance);
    }

    static #getValueFromModelsPerBodyType(m1, m2, jointIndexes) {
        let distance = 0;
        jointIndexes.forEach(function(i) {
            distance += DTWCalculator.#getVectorEuclideanDistance(m1[i], m2[i]);
        });
        return Math.sqrt(distance);
    }

    static #getVectorEuclideanDistance(v1, v2) {
        return Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2) + Math.pow(v1.z - v2.z, 2);
    }
}

class DTWSquare {
    constructor(v1, v2, v3) {
        this.leftUpper = v1;
        this.leftBottom = v2;
        this.rightBottom = v3;
    }
}

class DTWEntity {
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

class WarpingPathEntity {
    constructor(index1, index2, poseDistance, cumulativeDistance) {
        this.index1 = index1;
        this.index2 = index2;
        this.poseDistance = poseDistance;
        this.cumulativeDistance = cumulativeDistance;
    }
}

class DTW {
    Val;
    Arr;
    Map;
    DistanceAverage = 0;
    ColorCoeff;
    LargestDistance;
    LowestDistance;
    ContextPart = 150;
    RgbaValues = 255;
    MaxContextMultiple = 2;

    constructor(val, arr, map, distanceAverage, useContext = false) {
        this.Val = val;
        this.Arr = arr;
        this.Map = map;
        this.useContext = useContext;
        this.DistanceAverage = distanceAverage;
        this.#setLargestDistance();
        this.#setLowestDistance();
        this.#setColorCoeff();
    }

    static init(val, arr, map, useContext) {
        return new DTW(val, arr, map, 0, useContext);
    }

    #setLargestDistance() {
        let max = 0;
        for (let i = 1; i < this.Map.length; i ++) {
            let newVal = this.Map[i].poseDistance;
            max = (newVal > max) ? newVal : max;
        }
        this.LargestDistance = max;
    }

    #setLowestDistance() {
        let min = Number.POSITIVE_INFINITY;
        for (let i = 1; i < this.Map.length; i ++) {
            let newVal = this.Map[i].poseDistance;
            min = (newVal < min) ? newVal : min;
        }
        this.LowestDistance = min;
    }

    setLargestDistance(newLargestDistance) {
        this.LargestDistance = newLargestDistance;
        this.#setColorCoeff();
    }

    setLowestDistance(newLowestDistance) {
        this.LowestDistance = newLowestDistance;
        this.#setColorCoeff();
    }

    #setColorCoeff() {
        if (this.useContext) {
            this.ColorCoeff = (this.RgbaValues - this.ContextPart) / (this.LargestDistance - this.LowestDistance);
        } else {
            this.ColorCoeff = this.RgbaValues / (this.LargestDistance - this.LowestDistance);
        }
    }
}

export {DTWCalculator};