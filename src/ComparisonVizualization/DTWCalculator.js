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

    static dtwPerBodyPart(seq1, seq2, dtwCoeff, useContext, bodyPart, model) {
        let indexes;
        if (model === Model.modelVicon) {
            indexes = DTWCalculator.getIndexesForBodyPartsVicon(bodyPart);
        } else if (model === Model.modelKinect) {
            indexes = DTWCalculator.getIndexesForBodyPartsKinect(bodyPart);
        }

        let arr = DTWCalculator.countDTW(seq1, seq2, indexes);
        return new DTW(
            arr[arr.length - 1][arr[0].length - 1].cumulativeDistance,
            arr,
            arr[arr.length - 1][arr[0].length - 1].getWarpingPath(),
            dtwCoeff * (indexes.length / seq1[0].length),
            useContext);
    }

    static getIndexesForBodyPartsVicon(bodyPart) {
        let filteredBones = Model.bonesVicon.filter(function(b) {
           return b.type === bodyPart
        });

        return filteredBones.map(b => b.a);
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

    static countMatrix(arr) {
        let len1 = arr.length;
        let len2 = arr[0].length;
        let pathArr = new Array(len1);
        for (let i = 0; i < len1; i++) {
            pathArr[i] = new Array(len2);
        }
        for (let i = 0; i < len1; i++) {
            for (let j = 0; j < len2; j++) {
                pathArr[i][j] = new PathArrEl(Number.POSITIVE_INFINITY, []);
            }
        }
        pathArr[0][0] = new PathArrEl(0, [[0,0]]);
        pathArr[1][1] = new PathArrEl(arr[1][1].cumulativeDistance, [[0,0], [1,1]]);
        let queue = [ [1, 1] ];
        while (queue.length !== 0) {
            let coords = queue.shift();
            let i = coords[0];
            let j = coords[1];
            // move right : depends on how you look at it
            if (i + 1 !== len1 && pathArr[i + 1][j].value > pathArr[i][j].value + arr[i + 1][j].cumulativeDistance) {
                queue.push([i + 1, j]);

                let path = pathArr[i][j].path.slice();
                path.push([i + 1, j]);
                pathArr[i + 1][j] = new PathArrEl(pathArr[i][j].value + arr[i + 1][j].cumulativeDistance, path);
            }

            // move bottom right
            if (i + 1 !== len1 && j + 1 !== len2 && pathArr[i + 1][j + 1].value > pathArr[i][j].value + arr[i + 1][j + 1].cumulativeDistance) {
                queue.push([i + 1, j + 1]);

                let path = pathArr[i][j].path.slice();
                path.push([i + 1, j + 1]);
                pathArr[i + 1][j + 1] = new PathArrEl(pathArr[i][j].value + arr[i + 1][j + 1].cumulativeDistance, path);
            }

            // move bottom
            if (j + 1 !== len2 && pathArr[i][j + 1].value > pathArr[i][j].value + arr[i][j + 1].cumulativeDistance) {
                queue.push([i, j + 1]);

                let path = pathArr[i][j].path.slice();
                path.push([i,j + 1]);
                pathArr[i][j + 1] = new PathArrEl(pathArr[i][j].value + arr[i][j + 1].cumulativeDistance, path);
            }
        }

        return pathArr[len1 - 1][len2 - 1].path;
    }
}

class PathArrEl {
    constructor(value, path) {
        this.value = value;
        this.path = path;
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

    constructor(val, arr, map, coeff, useContext = false) {
        this.Val = val;
        this.Arr = arr;
        this.Map = map;
        this.DistanceAverage = coeff;
        this.#setLargestDistance();
        this.#setLowestDistance();
        this.#setColorCoeff(useContext);
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

    #setColorCoeff(useContext) {
        if (useContext) {
            this.ColorCoeff = (this.RgbaValues - this.ContextPart) / (this.LargestDistance - this.LowestDistance);
        } else {
            this.ColorCoeff = this.RgbaValues / (this.LargestDistance - this.LowestDistance);
        }
    }
}

export {DTWCalculator};