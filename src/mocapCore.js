class MocapDrawStyle {
    constructor (skeletonModel, boneRadius, jointRadius, headRadius, boneStyle, leftBoneStyle, rightBoneStyle, jointStyle, figureScale, noseStyle = "rgba(192, 16, 128, 1)", noseRadius = 0.85, opacity = 1) {
        this.skeletonModel = skeletonModel;
        this.boneRadius = boneRadius;
        this.jointRadius = jointRadius;
        this.headRadius = headRadius;
        this.boneStyle = boneStyle;
        this.leftBoneStyle = leftBoneStyle;
        this.rightBoneStyle = rightBoneStyle;
        this.jointStyle = jointStyle;
        this.figureScale = figureScale;
        this.noseStyle = noseStyle;
        this.noseRadius = noseRadius;
        this.opacity = opacity;
    }

    get bonesModel() {
        return this.skeletonModel.bonesModel;
    }

    get headIndex() {
        return this.skeletonModel.headJointIndex;
    }

    get thoraxIndex() {
        return this.skeletonModel.thoraxIndex;
    }

    get leftArmIndex() {
        return this.skeletonModel.leftArmIndex;
    }
}


function Vec3(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
}

const KeyframeSelectionAlgorithmEnum = {Equidistant: 1, Euclidean: 2, Temporal: 3, Lowe: 4, Decimation: 5};

function loadDataFromString(dataString) {
    return dataString.split("#objectKey").filter((s) => {return s != "";}).map((s) => s.split("\n"));
}

function loadDataFromFile(dataFile, callback, filterPredicate = null, loadChunkMbSize = 20, maxSequencesLoad = 500) {
    let sequences = [];
    let fileLocation = 0;
    let reader = new FileReader();
    let last = "";
    reader.onload = function (textResult) {
        let text = textResult.target.result;
        let split = text.split("#objectKey");
        split[0] = last+split[0];
        last = split[split.length-1];
        split.pop();
        let seqs = split.filter((s) => {return s != "";}).map((s) => s.split("\n"));
        if (filterPredicate != null) {
            seqs = seqs.filter(filterPredicate);
        }
        sequences.push(...seqs);
        fileLocation += loadChunkMbSize*1024*1024;
        if (dataFile.size > fileLocation) {
            if (sequences.length > maxSequencesLoad) {
                callback(sequences);
                return;
            }
            reader.readAsText(dataFile.slice(fileLocation, fileLocation+loadChunkMbSize*1024*1024), "UTF-8");
        } else {
            callback(sequences);
        }
    }
    reader.onerror = function (e) {
        throw ("Loading the data file failed, most likely because of how big the file is.");
    }
    reader.readAsText(dataFile.slice(0, loadChunkMbSize*1024*1024), "UTF-8");
}

function processSequence(sequence, numKeyframes, sceneWidth, width, height, drawStyle, switchY = true) {
    let ratio = width/height;
    let processed = processSequenceToFramesAuto(sequence, numKeyframes, sceneWidth, sceneWidth/ratio, switchY);
    let frames = processed.frames;
    let figureScale = processed.figureScale;
    let bestRotation = findOptimalRotation(frames, 12);
    for (let i = 0; i < frames.length; i++) {
        frames[i] = frameRotateY(frames[i], bestRotation);
    }
    if (checkSequenceNeedsFlip(frames, drawStyle)) {
        for (let i = 0; i < frames.length; i++) {
            frames[i] = frameRotateY(frames[i], Math.PI);
        }
    }
    return {frames: frames, figureScale: figureScale};
}

function processSequenceToFramesAuto(sequence, numKeyframes, width, height, switchY = false) {
    let canvasHeight = height;
    if (switchY) {
        canvasHeight = 0;
    }
    let figureScale = 1;
    let frames = processSequenceToFrames(sequence, canvasHeight, figureScale, switchY);
    if (figureScale < 0) {
        figureScale = 1;
    }
    if (frames.length == 0) {
        frames = processSequenceToFrames2d(sequence, canvasHeight, figureScale, switchY);
        if (!switchY) {
            figureScale = figureScale*findOptimalScale(frames, width*0.99, (height-20)*0.9, numKeyframes);
        } else {
            figureScale = figureScale*findOptimalScale(frames, width*0.99, height*0.9, numKeyframes);
        }
        frames = processSequenceToFrames2d(sequence, canvasHeight, figureScale, switchY);
    } else {
        if (!switchY) {
            figureScale = figureScale*findOptimalScale(frames, width*0.99, (height-20)*0.9, numKeyframes);
        } else {
            figureScale = figureScale*findOptimalScale(frames, width*0.99, height*0.9, numKeyframes);
        }
        frames = processSequenceToFrames(sequence, canvasHeight, figureScale, switchY);
    }
    return {frames: frames, figureScale: figureScale};
}

function processSequenceToFrames(rawData, canvasHeight, figureScale, switchY = false) {
    let lines = rawData;
    let frames = lines.map((frame) => {
        return frame.replace(" ", "").split(';').map((joint) => {
            let xyz = joint.split(',');
            return {x:parseFloat(xyz[0])*figureScale, y:parseFloat(xyz[1])*-1*figureScale + canvasHeight, z:parseFloat(xyz[2])*figureScale};
        });
    });
    frames = frames.filter((f) => {return f.length > 0 && !isNaN(f[0].x) && !isNaN(f[0].y) && !isNaN(f[0].z)});
    if (frames.length == 0) {
        return frames;
    } 
    let yShift = canvasHeight-Math.max(findMaximumsFromFrame(frames[0]).y, findMaximumsFromFrame(frames[frames.length-1]).y);
    if (!switchY) {
        yShift = -20+canvasHeight-Math.max(findMaximumsFromFrame(frames[0]).y, findMaximumsFromFrame(frames[frames.length-1]).y);
    }
    for (let i = 0; i < frames.length; i++) {
        for (let j = 0; j < frames[i].length; j++) {
            if (switchY) {
                frames[i][j].y = -frames[i][j].y-yShift;
            } else {
                frames[i][j].y = frames[i][j].y+yShift;
            }
        }
    }
    return frames;
}

function processSequenceToFrames2d(rawData, canvasHeight, figureScale, switchY = false) {
    let lines = rawData;
    let frames = lines.map((frame) => {
        return frame.replace(" ", "").split(';').map((joint) => {
            let xy = joint.split(',');
            return {x:parseFloat(xy[0])*figureScale, y:parseFloat(xy[1])*figureScale + canvasHeight, z:0};
        });
    });
    frames = frames.filter((f) => {return f.length > 0 && !isNaN(f[0].x) && !isNaN(f[0].y)});
    if (frames.length == 0) {
        return frames;
    } 
    let yShift = canvasHeight-Math.max(findMaximumsFromFrame(frames[0]).y, findMaximumsFromFrame(frames[frames.length-1]).y);
    if (!switchY) {
        yShift = -20+canvasHeight-Math.max(findMaximumsFromFrame(frames[0]).y, findMaximumsFromFrame(frames[frames.length-1]).y);
    }
    for (let i = 0; i < frames.length; i++) {
        for (let j = 0; j < frames[i].length; j++) {
            if (switchY) {
                frames[i][j].y = -frames[i][j].y-yShift;
            } else {
                frames[i][j].y = frames[i][j].y+yShift;
            }
        }
    }
    return frames;
}

function getSequenceCategory(sequence) {
    let lines = sequence;
    let description = lines[0].match(/messif.objects.keys.AbstractObjectKey (.+)/);
    if (description == null) {
        return "null";
    }
    let category = description[1].match(/\d+_(\d+).+/)[1];
    return category;
}

function getSequenceLength(sequence) {
    let lines = sequence;
    let description = lines[1].match(/\d+(?=;)/);
    if (description == null) {
        return -1;
    }
    return parseInt(description);
}

function getSequenceJointsPerFrame(sequence) {
    let lines = sequence;
    let split = lines[2].split(";");
    return split.length;
}

function drawTopDownMap(canvas, frames, indexes, topLeft, bottomLeft, bottomRight, drawUntilFrame, mapScale, dmsize, clear = true, drawLength = false, fps = 120) {
    let ctx = canvas.getContext("2d");
    if (clear) {
        clearCanvas(canvas);
    }
    let shift = topLeft.x-bottomLeft.x;
    let topRight = {x: bottomRight.x+shift, y: topLeft.y, z:0};
    let width = topRight.x-topLeft.x;
    let height = bottomRight.y-topLeft.y;
    let coreX = frames[0][0].x;
    let coreZ = frames[0][0].z;
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    let dmSizeWidth = lerp(0, canvas.width, dmsize/mapScale);
    let dmSizeHeight = lerp(0, canvas.height, dmsize/mapScale);
    let dmTextLabelPos = {x: 0, y: 0};
    let i = 0;
    while (canvas.width/2 + i*dmSizeWidth < canvas.width) {
        drawRectangle(ctx, {x:topLeft.x+canvas.width/2+i*dmSizeWidth, y:topLeft.y}, {x:bottomLeft.x+canvas.width/2+i*dmSizeWidth, y:bottomLeft.y}, 0.75, 0, 0);
        i++;
    }
    i = 0;
    while (canvas.height/2 + i*dmSizeHeight < canvas.height) {
        let startShiftX = shift-inverseLerp(0, height, i*dmSizeHeight)*shift;
        drawRectangle(ctx, {x:bottomLeft.x+startShiftX, y:topLeft.y+canvas.height/2+i*dmSizeHeight}, {x:bottomRight.x+startShiftX, y:topLeft.y+canvas.height/2+i*dmSizeHeight}, 0.75, 0, 0);
        if (canvas.height/2 + (i+1)*dmSizeHeight > canvas.height) {
            dmTextLabelPos.y = topLeft.y+canvas.height/2+i*dmSizeHeight;
        }
        i++;
    }
    i = 1;
    while (canvas.width/2 - i*dmSizeWidth > 0) {
        drawRectangle(ctx, {x:topLeft.x+canvas.width/2-i*dmSizeWidth, y:topLeft.y}, {x:bottomLeft.x+canvas.width/2-i*dmSizeWidth, y:bottomLeft.y}, 0.75, 0, 0);
        if (canvas.height/2 + (i+1)*dmSizeHeight > canvas.height) {
            dmTextLabelPos.x = topLeft.x+canvas.width/2-i*dmSizeWidth;
        }
        i++;
    }
    i = 1;
    while (canvas.height/2 - i*dmSizeHeight > 0) {
        let startShiftX = shift-inverseLerp(0, height, i*dmSizeHeight)*shift;
        drawRectangle(ctx, {x:bottomLeft.x+startShiftX, y:topLeft.y+canvas.height/2-i*dmSizeHeight}, {x:bottomRight.x+startShiftX, y:topLeft.y+canvas.height/2-i*dmSizeHeight}, 0.75, 0, 0);
        i++;
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.95)";
    ctx.fillText("1 m", dmTextLabelPos.x+2, dmTextLabelPos.y-2);
    drawRectangle(ctx, {x: dmTextLabelPos.x, y: dmTextLabelPos.y}, {x: dmTextLabelPos.x+dmSizeWidth, y: dmTextLabelPos.y}, 0.75, 0, 0);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    for (let i = 0; i < drawUntilFrame; i++) {
        let x = frames[i][0].x-coreX;
        let z = frames[i][0].z-coreZ;
        let transformedX = inverseLerp(-mapScale/2, mapScale/2, x)*width;
        let transformedZ = inverseLerp(-mapScale/2, mapScale/2, z)*height;
        if (transformedX < 2 || transformedZ < 2 || transformedX >= width-2 || transformedZ >= height-2) {
            continue;
        }
        let startShiftX = shift-inverseLerp(0, height, transformedZ)*shift;
        if (indexes.includes(i)) {
            ctx.beginPath();
            ctx.fillStyle = rgbaToColorString({r: 0, g: 0, b: 0, a:1});
            ctx.rect(bottomLeft.x+transformedX+startShiftX, topLeft.y+transformedZ, 5, 5);
            ctx.closePath();
            ctx.fill();
        } else {
            let color = hslToRgb((i/frames.length)*0.95, 0.9, 0.5);
            color.a = 0.35;
            ctx.fillStyle = rgbaToColorString(color);
            ctx.beginPath();
            ctx.rect(bottomLeft.x+transformedX+startShiftX, topLeft.y+transformedZ, 3, 3);
            ctx.closePath();
            ctx.fill();
        }
    }
    if (drawLength) {
        ctx.font = '12px serif';
        ctx.textAlign = "right";
        ctx.fillStyle = 'black';
        ctx.fillText((frames.length/fps).toFixed(2) + "s", canvas.width-5, canvas.height-5);
    }
    ctx.fillStyle = 'black';
    drawRectangle(ctx, topLeft, topRight, 1, 0, 0);
    drawRectangle(ctx, topRight, bottomRight, 1, 0, 0);
    drawRectangle(ctx, bottomRight, bottomLeft, 1, 0, 0);
    drawRectangle(ctx, bottomLeft, topLeft, 1, 0, 0);
}

function findMinimumsFromFrame(frame) {
    let xyz = {x:frame[0].x, y:frame[0].y, z:frame[0].z};
    for (let i = 1; i < frame.length; i++) {
        if (frame[i].x < xyz.x) {
            xyz.x = frame[i].x;
        }
        if (frame[i].y < xyz.y) {
            xyz.y = frame[i].y;
        }
        if (frame[i].z < xyz.z) {
            xyz.z = frame[i].z;
        }
    }
    return xyz;
}

function findMaximumsFromFrame(frame) {
    let xyz = {x:frame[0].x, y:frame[0].y, z:frame[0].z};
    for (let i = 1; i < frame.length; i++) {
        if (frame[i].x > xyz.x) {
            xyz.x = frame[i].x;
        }
        if (frame[i].y > xyz.y) {
            xyz.y = frame[i].y;
        }
        if (frame[i].z > xyz.z) {
            xyz.z = frame[i].z;
        }
    }
    return xyz;
}

function findKeyframesEquidistant(frames, numKeyframes) {
    let result = [];
    if (numKeyframes == 1) {
        result.push(frames.length-1);
        return result;
    }
    for (let i = 0; i < numKeyframes; i++) {
        result.push(i*Math.floor((frames.length-1)/(numKeyframes-1)));
    }
    return result;
}

function findKeyframesEuclidean(frames, numKeyframes) {
    let result = [0, frames.length-1];
    for (let k = 0; k < numKeyframes-2; k++) {
        let dmax = 0;
        let index = 0;
        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            let dmin = Infinity;
            for (let j = 0; j < result.length; j++) {
                const keyframe = frames[result[j]];
                let d = frameDistance(frame, keyframe);
                if (d < dmin) {
                    dmin = d;
                }
            }
            if (dmin > dmax) {
                dmax = dmin;
                index = i;
            }
        }
        result.push(index);
    }
    return result.sort((a, b) => a-b);
}

function findKeyframesDot(frames, numKeyframes) {
    let result = [0, frames.length-1];
    for (let i = 0; i < numKeyframes-2; i++) {
        let maxD = -Infinity;
        let minDIndex = -1;
        let k = 1;
        for (let j = 1; j < frames.length-1; j++) {
            while (j > result[k]) {
                k++;
            }
            if (j == result[k]) {
                continue;
            }
            let d = frameDistance(frames[result[k-1]], frames[j])+frameDistance(frames[result[k]], frames[j]);
            //let dot = frameCosineSimilarity(frames[result[k-1]], frames[result[k]], frames[j]);
            if (d > maxD) {
                maxD = d;
                minDIndex = j;
            }
        }
        if (minDIndex != -1) {
            result.splice(sortedIndex(result, minDIndex), 0, minDIndex);
        }
    }
    return result;
}

function findKeyframesTemporal(frames, numKeyframes) {
    let result = [0, frames.length-1];
    for (let k = 0; k < numKeyframes-2; k++) {
        let dmax = 0;
        let index = 0;
        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            let dmin = Infinity;
            for (let j = 0; j < result.length; j++) {
                const keyframe = frames[result[j]];
                let d = frameDistanceTemporal(frame, keyframe, i, result[j]);
                if (d < dmin) {
                    dmin = d;
                }
            }
            if (dmin > dmax) {
                dmax = dmin;
                index = i;
            }
        }
        result.push(index);
    }
    return result.sort((a, b) => a-b);
}

function findKeyframesDecimation(frames, numKeyframes) {
    let result = [];
    let costs = [];
    result.push(0);
    costs.push(Infinity);
    for (let i = 1; i < frames.length-1; i++) {
        result.push(i);
        costs.push(frameDistanceTemporal(frames[i-1], frames[i+1], i-1, i+1));
    }
    result.push(frames.length-1);
    costs.push(Infinity);
    for (let i = 0; i < frames.length-numKeyframes; i++) {
        let minId = 0;
        let min = Infinity;
        for (let j = 0; j < result.length; j++) {
            let cost = costs[result[j]];
            if (cost < min) {
                min = cost;
                minId = j;
            }
        }
        result.splice(minId, 1);
        if (result[minId-1] > 0) {
            costs[result[minId-1]] = frameDistanceTemporal(frames[result[minId-2]], frames[result[minId]], result[minId-2], result[minId]);
        }
        if (result[minId] < frames.length-1) {
            costs[result[minId]] = frameDistanceTemporal(frames[result[minId-1]], frames[result[minId+1]], result[minId-1], result[minId+1]);
        }
    }
    return result;
}

function findKeyframesLowe(frames, numKeyframes) {
    let result = [0, frames.length-1];
    for (let k = 0; k < numKeyframes-2; k++) {
        let dmax = 0;
        let index = 0;
        let pos = 1;
        for (let i = 1; i < frames.length-1; i++) {
            if (result[pos] <= i) {
                pos++;
            }
            const frame = frames[i];
            let pa = frameSubtract(frame, frames[result[pos-1]]);
            let ba = frameSubtract(frames[result[pos-1]], frames[result[pos]]);
            let t = frameDot(pa, ba)/frameDot(ba, ba);
            let d = frameLength(frameSubtract(pa, frameScale(ba, t)));
            if (dmax < d) {
                dmax = d;
                index = i;
            }
        }
        result.push(index);
        result = result.sort((a, b) => a-b);
    }
    return result.sort((a, b) => a-b);
}

function getFillKeyframes(frames, keyframes, sceneWidth) {
    let numKeyframes = keyframes.length;
    let result = [];
    let helpKeyframes = keyframes.slice();
    for (let i = 1; i < helpKeyframes.length; i++) {
        let aWidth = findMaximumsFromFrame(frames[helpKeyframes[i]]).x-findMinimumsFromFrame(frames[helpKeyframes[i]]).x;
        let bWidth = findMaximumsFromFrame(frames[helpKeyframes[i-1]]).x-findMinimumsFromFrame(frames[helpKeyframes[i-1]]).x;
        let width = Math.max(aWidth, bWidth);
        let space = ((helpKeyframes[i]-helpKeyframes[i-1])/frames.length)*sceneWidth-width-sceneWidth/50;
        if (space > width) {
            let element = Math.round((helpKeyframes[i]+helpKeyframes[i-1])/2);
            helpKeyframes.splice(i, 0, element);
            result.push(element);
            i--;
        }
    }
    return result.sort((a, b) => a-b);
}

function sortedIndex(array, value) {
    let low = 0;
    let high = array.length;
    while (low < high) {
        var mid = Math.floor((low + high)/2);
        if (array[mid] < value) {
            low = mid + 1;
        }
        else {
            high = mid;
        }
    }
    return low;
}

function findMapScale(frames, numKeyframes, figureScale, mapWidth) {
    let framesMin = findSequenceMinimums(frames, numKeyframes);
    let framesMax = findSequenceMaximums(frames, numKeyframes);
    let maxWidth = Math.max(framesMax.x-framesMin.x, framesMax.z-framesMin.z);
    let mapScale = 100*figureScale;
    mapScale = Math.floor(maxWidth/5)*10+10;
    return mapScale;
}

function findOptimalRotation(frames, numSamples) {
    numSamples = numSamples-1;
    let framesMin = findMinimumsFromFrame(frames[0]);
    let framesMax = findMaximumsFromFrame(frames[0]);
    let distMax = 0;
    let distIndex = 0;
    for (let i = 1; i < numSamples+1; i++) {
        let index = Math.floor((i/numSamples)*frames.length);
        if (index == frames.length) {
            index = index-1;
        }
        let min = findMinimumsFromFrame(frames[index]);
        if (framesMin.x > min.x) {
            framesMin.x = min.x;
        }
        if (framesMin.y > min.y) {
            framesMin.y = min.y;
        }
        if (framesMin.z > min.z) {
            framesMin.z = min.z;
        }
        let max = findMaximumsFromFrame(frames[index]);
        if (framesMax.x < max.x) {
            framesMax.x = max.x;
        }
        if (framesMax.y < max.y) {
            framesMax.y = max.y;
        }
        if (framesMax.z < max.z) {
            framesMax.z = max.z;
        }
        let distance = vecXZDistance(frames[0][0], frames[index][0]);
        if (distance > distMax) {
            distIndex = index;
            distMax = distance;
        }
    }
    let vec = {x:frames[distIndex][0].x-frames[0][0].x, y: frames[distIndex][0].y-frames[0][0].y, z: frames[distIndex][0].z-frames[0][0].z};
    let a = framesMax.x-framesMin.x;
    let b = framesMax.z-framesMin.z;
    let c = Math.sqrt(a**2+b**2);
    if (distMax > (framesMax.y-framesMin.y)/2 && ((vec.x > 0 && vec.z < 0) || (vec.x < 0 && vec.z > 0))) {
        return -Math.asin(b/c);
    } else {
        return Math.asin(b/c);
    }
}

function checkSequenceNeedsFlip(frames, drawStyle) {
    let nose = calculateNoseVec3(frames[0][drawStyle.headIndex], frames[0][drawStyle.thoraxIndex], frames[0][drawStyle.leftArmIndex]);
    nose.y = 0;
    nose = normalize(nose);
    return dotProduct(nose, new Vec3(Math.sqrt(2)/2, 0, Math.sqrt(2)/2)) < 0;
}

function findSequenceMinimums(frames, numSamples) {
    let framesMin = findMinimumsFromFrame(frames[0]);
    for (let i = 1; i < numSamples+1; i++) {
        let index = Math.floor((i/numSamples)*frames.length);
        if (index == frames.length) {
            index = index-1;
        }
        let min = findMinimumsFromFrame(frames[index]);
        if (framesMin.x > min.x) {
            framesMin.x = min.x;
        }
        if (framesMin.y > min.y) {
            framesMin.y = min.y;
        }
        if (framesMin.z > min.z) {
            framesMin.z = min.z;
        }
    }
    return framesMin;
}

function findSequenceMaximums(frames, numSamples) {
    let framesMax = findMaximumsFromFrame(frames[0]);
    for (let i = 1; i < numSamples+1; i++) {
        let index = Math.floor((i/numSamples)*frames.length);
        if (index == frames.length) {
            index = index-1;
        }
        let max = findMaximumsFromFrame(frames[index]);
        if (framesMax.x < max.x) {
            framesMax.x = max.x;
        }
        if (framesMax.y < max.y) {
            framesMax.y = max.y;
        }
        if (framesMax.z < max.z) {
            framesMax.z = max.z;
        }
    }
    return framesMax;
}

function findOptimalScale(frames, width, height, numFrames) {
    let maximums = findMaximumsFromFrame(frames[0]);
    let minimums = findMinimumsFromFrame(frames[0]);
    let maxWidth = maximums.x-minimums.x;
    for (let i = 0; i < numFrames; i++) {
        let index = Math.floor(((i+1)/numFrames)*frames.length-1);
        let max = findMaximumsFromFrame(frames[index]);
        let min = findMinimumsFromFrame(frames[index]);
        maximums.y = Math.max(maximums.y, max.y);
        minimums.y = Math.min(minimums.y, min.y);
        maxWidth = Math.max(maximums.x-minimums.x, maxWidth);
    }
    let maxHeight = maximums.y-minimums.y;
    let scaleHeight = (height)/(maxHeight);
    let scaleWidth = (width/(numFrames))/(maxWidth);
    if (scaleHeight < 0 && scaleWidth < 0) {
        return 1;
    } else if (scaleHeight < 0) {
        return scaleWidth;
    } else if (scaleWidth < 0) {
        return scaleHeight;
    }
    return Math.min(scaleHeight, scaleWidth);
}

function findMeterConversion(sequences, actorHeight) {
    let heights = [];
    let maxHeight = 0;
    for (let i = 0; i < sequences.length; i++) {
        let frames = processSequenceToFrames(sequences[i], 0, 1);
        if (frames.length == 0) {
            frames = processSequenceToFrames2d(sequences[i], 0, 1);
        }
        let maximums = findMaximumsFromFrame(frames[0]);
        let minimums = findMinimumsFromFrame(frames[0]);
        let height = maximums.y-minimums.y;
        heights.push(height);
        if (maxHeight < height) {
            maxHeight = height;
        }
    }
    heights.sort((a, b) => a - b);
    console.log(heights);
    return actorHeight/heights[Math.round(heights.length/2)-1];
}

function frameSubtract(a, b) {
    let result = [];
    for (let i = 0; i < a.length; i++) {
        result[i] = {x: a[i].x-b[i].x, y: a[i].y-b[i].y, z: a[i].z-b[i].z};
    }
    return result;
}

function frameLength(a) {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result += (a[i].x*a[i].x)+(a[i].y*a[i].y)+(a[i].z*a[i].z);
    }
    return Math.sqrt(result);
}

function frameDot(a, b) {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result += (a[i].x*b[i].x)+(a[i].y*b[i].y)+(a[i].z*b[i].z);
    }
    return result;
}

function frameScale(a, scale) {
    let result = [];
    for (let i = 0; i < a.length; i++) {
        result[i] = {x: a[i].x*scale, y: a[i].y*scale, z: a[i].z*scale};
    }
    return result;
}

function frameDistance(a, b) {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result += (a[i].x-b[i].x)*(a[i].x-b[i].x)+(a[i].y-b[i].y)*(a[i].y-b[i].y)+(a[i].z-b[i].z)*(a[i].z-b[i].z);
    }
    return Math.sqrt(result);
}

function frameDistanceTemporal(a, b, aFrame, bFrame) {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result += (a[i].x-b[i].x)*(a[i].x-b[i].x)+(a[i].y-b[i].y)*(a[i].y-b[i].y)+(a[i].z-b[i].z)*(a[i].z-b[i].z);
    }
    return result + 2*Math.pow(Math.abs(aFrame-bFrame), 3);
}

function frameCosineSimilarity(a, b, c) {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result += (b[i].x-a[i].x)*(c[i].x-a[i].x)+(b[i].y-a[i].y)*(c[i].y-a[i].y)+(b[i].z-a[i].z)*(c[i].z-a[i].z);
    }
    return result/(frameDistance(a, b)*frameDistance(a, c));
}

function vecXZDistance(a, b) {
    return Math.sqrt((a.x-b.x)*(a.x-b.x)+(a.z-b.z)*(a.z-b.z));
}

function frameRotateY(frame, rad) {
    let newFrame = [];
    for (let i = 0; i < frame.length; i++) {
        newFrame[i] = {
            x: frame[i].z*Math.sin(rad) + frame[i].x*Math.cos(rad),
            y: frame[i].y,
            z: frame[i].z*Math.cos(rad) - frame[i].x*Math.sin(rad)
        };
    }
    return newFrame;
}

function moveOriginXBy(frame, xMove) {
    let newFrame = [];
    for (let i = 0; i < frame.length; i++) {
        newFrame[i] = {x:frame[i].x-xMove, y:frame[i].y, z:frame[i].z};
    }
    return newFrame;
}

function clearCanvas(canvas) {
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function clamp(a, b, value) {
    if (value < a) {
        return a;
    } else if (value > b) {
        return b;
    } else {
        return value;
    }
}

function calculateNoseVec3(headJoint, thoraxJoint, leftArmJoint, multiplyScalar = 1) {
    let vecNose = new Vec3(headJoint.x-thoraxJoint.x, 
        headJoint.y-thoraxJoint.y, 
        headJoint.z-thoraxJoint.z);
    vecNose = crossProduct(vecNose, new Vec3(leftArmJoint.x-thoraxJoint.x, 
        leftArmJoint.y-thoraxJoint.y, 
        leftArmJoint.z-thoraxJoint.z));
    vecNose = normalize(vecNose);
    vecNose = new Vec3(-vecNose.x*multiplyScalar, -vecNose.y*multiplyScalar, -vecNose.z*multiplyScalar);
    return vecNose;
} 

function lerpFrame(a, b, value) {
    let result = [];
    for (let i = 0; i < a.length; i++) {
        result[i] = {x: lerp(a[i].x, b[i].x, value), y: lerp(a[i].y, b[i].y, value), z: lerp(a[i].z, b[i].z, value)};
    }
    return result;
}

function lerp(a, b, value) {
    return (b-a)*value+a;
}

function inverseLerp(a, b, value) {
    return (value-a)/(b-a);
}

function dotProduct(a, b) {
    return a.x*b.x+a.y*b.y+a.z*b.z;
}

function crossProduct(a, b) {
    return new Vec3(a.y*b.z-a.z*b.y, -(a.x*b.z-a.z*b.x), a.x*b.y-a.y*b.x);
}

function normalize(vec) {
    let len = Math.sqrt(vec.x*vec.x+vec.y*vec.y+vec.z*vec.z);
    return new Vec3(vec.x/len, vec.y/len, vec.z/len);
}


function hue2rgb(p, q, t){
    if(t < 0) t += 1;
    if(t > 1) t -= 1;
    if(t < 1/6) return p + (q - p) * 6 * t;
    if(t < 1/2) return q;
    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
}

//h, s, and l are in <0, 1>
function hslToRgb(h, s, l){
    let r;
    let g;
    let b;
    if(s == 0){
        r = g = b = l;
    } else {
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return {r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a: 1};
}

function scaleRgbaColor(rgba, scalar) {
    let result = {r:clamp(0, 255, rgba.r*scalar), g:clamp(0, 255, rgba.g*scalar), b:clamp(0, 255, rgba.b*scalar), a:rgba.a};
    return result;
}

function rgbaToColorString(rgba) {
    return "rgba("+Math.floor(rgba.r)+","+Math.floor(rgba.g)+","+Math.floor(rgba.b)+","+rgba.a+")";
}

function drawRectangle(ctx, a, b, radius, xShift, yShift) {
    let normal = {x:a.y-b.y, y:-(a.x-b.x)};
    let magnitude = Math.sqrt(normal.x**2+normal.y**2);
    normal.x = normal.x/magnitude;
    normal.y = normal.y/magnitude;
    ctx.beginPath();
    ctx.moveTo(a.x+radius*normal.x+xShift, a.y+radius*normal.y+yShift);
    ctx.lineTo(b.x+radius*normal.x+xShift, b.y+radius*normal.y+yShift);
    ctx.lineTo(b.x-radius*normal.x+xShift, b.y-radius*normal.y+yShift);
    ctx.lineTo(a.x-radius*normal.x+xShift, a.y-radius*normal.y+yShift);
    ctx.lineTo(a.x+radius*normal.x+xShift, a.y+radius*normal.y+yShift);
    ctx.closePath();
    ctx.fill();
}

export {loadDataFromString, loadDataFromFile, getSequenceLength, getSequenceJointsPerFrame, getSequenceCategory, MocapDrawStyle, KeyframeSelectionAlgorithmEnum, processSequence, processSequenceToFramesAuto, processSequenceToFrames, processSequenceToFrames2d, drawTopDownMap, findMinimumsFromFrame, findMaximumsFromFrame, findKeyframesEquidistant, findKeyframesEuclidean, findKeyframesDot, findKeyframesTemporal, findKeyframesDecimation, findKeyframesLowe, getFillKeyframes, findMapScale, findOptimalRotation, checkSequenceNeedsFlip, findSequenceMinimums, findSequenceMaximums, findOptimalScale, findMeterConversion, frameSubtract, frameLength, frameDot, frameDistance, frameDistanceTemporal, frameCosineSimilarity, vecXZDistance, frameRotateY, moveOriginXBy, clearCanvas, clamp, lerpFrame, lerp, inverseLerp, hue2rgb, hslToRgb, scaleRgbaColor, rgbaToColorString, drawRectangle, calculateNoseVec3, Vec3};
