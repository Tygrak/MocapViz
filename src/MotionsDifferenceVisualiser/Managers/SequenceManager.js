import {SequenceIndexNotFound} from "../Exceptions/SequenceIndexNotFound.js";
import {modelKinect2d} from "../../model.js";


class SequenceManager {
    static sortSequencesByLength(sequences) {
        sequences.sort(function(a,b) {
            return b.length - a.length;
        });

        return sequences;
    }

    static getPoseCoordinatesPerSequence(sequence, model) {
        let frames = sequence.map((frame) => {
            return frame.replace(" ", "").split(';').map((joint) => {
                let xyz = joint.split(',');
                if (model === modelKinect2d) {
                    return {x:xyz[0], y:xyz[1]};
                }
                return {x:xyz[0], y:xyz[1], z:xyz[2]};
            });
        });

        if (model === modelKinect2d) {
            return frames.filter((f) => {
                return f.length > 0 && !isNaN(f[0].x) && !isNaN(f[0].y)
            });
        }

        return frames.filter((f) => {
            return f.length > 0 && !isNaN(f[0].x) && !isNaN(f[0].y) && !isNaN(f[0].z)
        });
    }

    static findWarpingPathIndexByLongerSeq(longerSequenceIndex, warpingPath) {
        for (let i = 0; i < warpingPath.length; i ++ ) {
            if (warpingPath[i].index1 === longerSequenceIndex) {
                return i;
            }
        }

        throw new SequenceIndexNotFound("Given index of longer sequence was not found in given warping path");
    }

    static findWarpingPathIndexByShorterSeq(shorterSequenceIndex, warpingPath) {
        for (let i = 0; i < warpingPath.length; i ++ ) {
            if (warpingPath[i].index2 === shorterSequenceIndex) {
                return i;
            }
        }

        throw new SequenceIndexNotFound("Given index of shorter sequence was not found in given warping path");
    }

    static reduceSequenceLength(longerSeq, desiredLength) {
        let newLongerSeq = [];
        let trimmedLength = longerSeq.length - 2;
        let trimmedDesiredLength  = desiredLength - 2;

        newLongerSeq[0] = longerSeq[0];

        let i = 0;
        let j = 0;
        while (j < trimmedLength) {
            let diff = (i + 1) * trimmedLength - (j + 1) * trimmedDesiredLength;

            if (diff < trimmedLength / 2) {
                i ++;
                j ++;
                newLongerSeq[i] = longerSeq[j];
            } else {
                j ++;
            }
        }

        newLongerSeq[trimmedDesiredLength + 1] = longerSeq[trimmedLength + 1];

        return newLongerSeq;
    }
}

export {SequenceManager};