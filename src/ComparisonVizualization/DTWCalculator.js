import * as Model from "../model.js";

class DTWCalculator {
    static calculateDTW(seq1, seq2, jointIndex, sampleValue, useContext) {
        let arr = DTWCalculator.countDTW(seq1, seq2, jointIndex);

        let dtw = DTW.init(arr[arr.length - 1][arr[0].length - 1], arr, DTWCalculator.#countMatrix(arr), useContext);

        if (sampleValue !== 0) {
            let DTWCoeff = Math.floor((dtw.Val / sampleValue) * 50);
            dtw.ContextColorCoeff = (DTWCoeff > 150) ? 150 : DTWCoeff;
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
            arr[arr.length - 1][arr[0].length - 1],
            arr,
            DTWCalculator.#countMatrix(arr),
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
            arr[i][0] = Number.POSITIVE_INFINITY;
        }

        for (let i = 0; i < len2; i++) {
            arr[0][i] = Number.POSITIVE_INFINITY;
        }

        arr[0][0] = 0;

        for (let i = 1; i < len1; i++) {
            for (let j = 1; j < len2; j++) {
                let square = new DTWSquare(arr[i - 1][j - 1], arr[i][j - 1], arr[i - 1][j]);
                arr[i][j] = DTWCalculator.#compareTwoTimeSeries(seq1[i - 1], seq2[j - 1], square, jointIndexes);
            }
        }

        return arr;
    }

    static #compareTwoTimeSeries(m1, m2, square, jointIndexes) {
        let euclidDistance = (jointIndexes === -1) ? DTWCalculator.#getValueFromModels(m1, m2) : DTWCalculator.#getValueFromModelsPerBodyType(m1, m2, jointIndexes);
        let minPreviousValue = Math.min(square.leftBottom, square.leftUpper, square.rightBottom);
        return euclidDistance + minPreviousValue;
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

    static #countMatrix(arr) {
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
        pathArr[1][1] = new PathArrEl(arr[1][1], [[0,0], [1,1]]);
        let queue = [ [1, 1] ];
        while (queue.length !== 0) {
            let coords = queue.shift();
            let i = coords[0];
            let j = coords[1];
            // move right : depends on how you look at it
            if (i + 1 !== len1 && pathArr[i + 1][j].value > pathArr[i][j].value + arr[i + 1][j]) {
                queue.push([i + 1, j]);

                let path = pathArr[i][j].path.slice();
                path.push([i + 1, j]);
                pathArr[i + 1][j] = new PathArrEl(pathArr[i][j].value + arr[i + 1][j], path);
            }

            // move bottom right
            if (i + 1 !== len1 && j + 1 !== len2 && pathArr[i + 1][j + 1].value > pathArr[i][j].value + arr[i + 1][j + 1]) {
                queue.push([i + 1, j + 1]);

                let path = pathArr[i][j].path.slice();
                path.push([i + 1, j + 1]);
                pathArr[i + 1][j + 1] = new PathArrEl(pathArr[i][j].value + arr[i + 1][j + 1], path);
            }

            // move bottom
            if (j + 1 !== len2 && pathArr[i][j + 1].value > pathArr[i][j].value + arr[i][j + 1]) {
                queue.push([i, j + 1]);

                let path = pathArr[i][j].path.slice();
                path.push([i,j + 1]);
                pathArr[i][j + 1] = new PathArrEl(pathArr[i][j].value + arr[i][j + 1], path);
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

class DTW {
    Val;
    Arr;
    Map;
    ContextColorCoeff = 0;
    ColorCoeff;
    LargestDistance;
    LowestDistance;

    constructor(val, arr, map, coeff, useContext = false) {
        this.Val = val;
        this.Arr = arr;
        this.Map = map;
        this.ContextColorCoeff = coeff;
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
            let newVal = this.Arr[this.Map[i][0]][this.Map[i][1]] - this.Arr[this.Map[i - 1][0]][this.Map[i - 1][1]];
            max = (newVal > max) ? newVal : max;
        }
        this.LargestDistance = max;
    }

    #setLowestDistance() {
        let min = Number.POSITIVE_INFINITY;
        for (let i = 1; i < this.Map.length; i ++) {
            let newVal = this.Arr[this.Map[i][0]][this.Map[i][1]] - this.Arr[this.Map[i - 1][0]][this.Map[i - 1][1]];
            min = (newVal < min) ? newVal : min;
        }
        this.LowestDistance = min;
    }

    #setColorCoeff(useContext) {
        if (useContext) {
            this.ColorCoeff = 105 / (this.LargestDistance - this.LowestDistance);
        } else {
            this.ColorCoeff = 255 / (this.LargestDistance - this.LowestDistance);
        }
    }
}

export {DTWCalculator};