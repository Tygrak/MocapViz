import {addMapToVisualization, findKeyframes} from "../../mocap.js";
import * as Core from "../../mocapCore.js";

class MapRenderer {
    static drawMap(processedSequence, mapWidth, mapHeight, numKeyframes, model) {
        let frames = processedSequence.frames;
        let keyframes = findKeyframes(frames, numKeyframes, Core.KeyframeSelectionAlgorithmEnum.Decimation);
        let figureScale = processedSequence.figureScale;
        return addMapToVisualization(frames, keyframes, figureScale, model, mapWidth, mapHeight);
    }
}

export{MapRenderer};