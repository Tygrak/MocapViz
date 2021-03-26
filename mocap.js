function MocapDrawStyle(bonesModel, headJointIndex, leftArmIndex, thoraxIndex, boneRadius, jointRadius, headRadius, boneStyle, leftBoneStyle, rightBoneStyle, jointStyle, figureScale) {
    this.bonesModel = bonesModel;
    this.headJointIndex = headJointIndex;
    this.leftArmIndex = leftArmIndex;
    this.thoraxIndex = thoraxIndex;
    this.boneRadius = boneRadius;
    this.jointRadius = jointRadius;
    this.headRadius = headRadius;
    this.boneStyle = boneStyle;
    this.leftBoneStyle = leftBoneStyle;
    this.rightBoneStyle = rightBoneStyle;
    this.jointStyle = jointStyle;
    this.figureScale = figureScale;
}

function Vec3(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
}

const BoneType = {
    leftLeg: 0,
    rightLeg: 1,
    leftHand: 2,
    rightHand: 3,
    torso: 4
};

function drawSequence(canvas, frames, numPositions, drawStyle) {
    drawSequenceBlur(canvas, frames, numPositions, 0, drawStyle, drawStyle);
}

function drawSequenceKeyframes(canvas, frames, indexes, drawStyle, yShift = 0, clear = true) {
    drawSequenceKeyframesBlur(canvas, frames, indexes, 0, drawStyle, drawStyle, yShift, clear);
}

function drawSequenceKeyframesBlur(canvas, frames, indexes, numBlurPositions, drawStyle, drawStyleBlur, yShift = 0, clear = true, trueTime = true, labelFrames = true) {
    let ctx = canvas.getContext("2d");
    if (clear) {
        clearCanvas(canvas);
    }
    let firstFrame = moveOriginXBy(frames[0], frames[0][0].x);
    let minimumsFirst = findMinimumsFromFrame(firstFrame);
    let maximumsFirst = findMaximumsFromFrame(firstFrame);
    let lastFrame = moveOriginXBy(frames[frames.length-1], frames[frames.length-1][0].x);
    let maximums = findMaximumsFromFrame(lastFrame);
    let sequenceMaximums = findSequenceMaximums(frames, indexes.length);
    sequenceMaximums.y = sequenceMaximums.y-3;
    for (let i = 0; i < indexes.length; i++) {
        let coreX = frames[indexes[i]][0].x;
        let xShift = (i/indexes.length)*(canvas.width+minimumsFirst.x+maximums.x/2-20)-minimumsFirst.x+30;
        if (trueTime) {
            xShift = (indexes[i]/frames.length)*(canvas.width-(maximumsFirst.x-minimumsFirst.x)-20)+(maximumsFirst.x-minimumsFirst.x)/2+10;
        }
        for (let j = 1; j < numBlurPositions+1; j++) {
            if (indexes[i]-j < 0) {
                continue;
            }
            drawFrame(canvas, moveOriginXBy(frames[indexes[i]-j], coreX), xShift, yShift, drawStyleBlur);
        }
        drawFrame(canvas, moveOriginXBy(frames[indexes[i]], coreX), xShift, yShift, drawStyle);
        if (labelFrames) {
            ctx.font = '12px serif';
            ctx.fillStyle = 'black';
            ctx.fillText(indexes[i], xShift, sequenceMaximums.y+yShift+14);
        }
    }
    ctx.fillStyle = 'black';
    if (labelFrames) {
        drawRectangle(ctx, {x: 0, y: sequenceMaximums.y, z: 0}, {x: canvas.width, y: sequenceMaximums.y, z: 0}, 1, 0, yShift+1);
    }
}

function drawSequenceKeyframesBlurWithMaps(canvas, frames, indexes, numBlurPositions, drawStyle, drawStyleBlur, mapScale, yShift = 0, clear = true) {
    let ctx = canvas.getContext("2d");
    if (clear) {
        clearCanvas(canvas);
    }
    let firstFrame = moveOriginXBy(frames[0], frames[0][0].x);
    let minimums = findMinimumsFromFrame(firstFrame);
    let lastFrame = moveOriginXBy(frames[frames.length-1], frames[frames.length-1][0].x);
    let maximums = findMaximumsFromFrame(lastFrame);
    let sequenceMinimums = findSequenceMinimums(frames, indexes.length);
    let sequenceMaximums = findSequenceMaximums(frames, indexes.length);
    sequenceMaximums.y = sequenceMaximums.y-3;
    for (let i = 0; i < indexes.length; i++) {
        let coreX = frames[indexes[i]][0].x;
        let xShift = (i/indexes.length)*(canvas.width+minimums.x+maximums.x/2-20)-minimums.x+30;
        for (let j = 1; j < numBlurPositions+1; j++) {
            if (indexes[i]-j < 0) {
                continue;
            }
            drawFrame(canvas, moveOriginXBy(frames[indexes[i]-j], coreX), xShift, yShift, drawStyleBlur);
        }
        drawFrame(canvas, moveOriginXBy(frames[indexes[i]], coreX), xShift, yShift, drawStyle);
        ctx.font = '12px serif';
        ctx.fillStyle = 'black';
        ctx.fillText(indexes[i], xShift, sequenceMaximums.y+yShift+14);
        drawTopDownMapParallelogram(canvas, frames, indexes, 
            {x:xShift-1.5*figureScale*canvas.height/24, y:sequenceMinimums.y-10-4*figureScale*canvas.height/24, z:0}, 
            {x:xShift-2.5*figureScale*canvas.height/24, y:sequenceMinimums.y-10-1*figureScale*canvas.height/24, z:0}, 
            {x:xShift+1.5*figureScale*canvas.height/24, y:sequenceMinimums.y-10-1*figureScale*canvas.height/24, z:0}, indexes[i]+1, mapScale, false);
    }
    ctx.fillStyle = 'black';
    drawRectangle(ctx, {x: 0, y: sequenceMaximums.y, z: 0}, {x: canvas.width, y: sequenceMaximums.y, z: 0}, 1, 0, yShift+1);
    drawMapScale(canvas, mapScale/10);
}

function drawSequenceKeyframesBlurTrueTime(canvas, frames, indexes, numBlurPositions, drawStyle, drawStyleBlur, yShift = 0, clear = true) {
    let ctx = canvas.getContext("2d");
    if (clear) {
        clearCanvas(canvas);
    }
    let firstFrame = moveOriginXBy(frames[0], frames[0][0].x);
    let minX = findMinimumsFromFrame(firstFrame).x;
    let lastFrame = moveOriginXBy(frames[frames.length-1], frames[frames.length-1][0].x);
    let maxX = findMaximumsFromFrame(lastFrame).x;
    for (let i = 0; i < indexes.length; i++) {
        let coreX = frames[indexes[i]][0].x;
        for (let j = 1; j < numBlurPositions+1; j++) {
            if (indexes[i]-j < 0) {
                continue;
            }
            drawFrame(canvas, moveOriginXBy(frames[indexes[i]-j], coreX), (indexes[i]/frames.length)*(canvas.width+minX-maxX-20)-minX+20, yShift, drawStyleBlur);
        }
        drawFrame(canvas, moveOriginXBy(frames[indexes[i]], coreX), (indexes[i]/frames.length)*(canvas.width+minX-maxX-20)-minX+20, yShift, drawStyle);
    }
}

function drawSequenceBlur(canvas, frames, numPositions, numBlurPositions, drawStyle, drawStyleBlur) {
    let indexes = [];
    for (let i = 0; i < frames.length; i++) {
        if (Math.floor(i%(frames.length/(numPositions-1))) == 0 || i == frames.length-1) {
            indexes.push(i);
        }
    }
    drawSequenceKeyframesBlur(canvas, frames, indexes, numBlurPositions, drawStyle, drawStyleBlur, 0, false);
}

function loadDataFromString(dataString) {
    return dataString.split("#objectKey").filter((s) => {return s != "";}).map((s) => s.split("\n"));
}

function createVisualizationElement(sequence, model, numKeyframes, numBlurFrames, mapWidth, mapHeight, visualizationWidth, visualizationHeight, addTimeScale = false, addFillingKeyframes = true, keyframeSelectionAlgorithm = 4) {
    let div = document.createElement("div");
    div.className = "drawItem-"+motionCategories[getSequenceCategory(sequence)];
    let map = document.createElement("canvas");
    map.className = "drawItemMap";
    map.width = mapWidth;
    map.height = mapHeight;
    div.appendChild(map);
    let canvas = document.createElement("canvas");
    canvas.className = "drawItemVisualization";
    canvas.width = visualizationWidth;
    canvas.height = visualizationHeight;
    div.appendChild(canvas);
    let figureScale = model.defaultScale;
    let frames = processSequenceToFrames(sequence, canvas.height, figureScale*model.defaultScale);
    if (figureScale < 0) {
        figureScale = 1;
    }
    if (frames.length == 0) {
        frames = processSequenceToFrames2d(sequence, canvas.height, figureScale*model.defaultScale);
        figureScale = figureScale*findOptimalScale(frames, canvas, numKeyframes);
        frames = processSequenceToFrames2d(sequence, canvas.height, figureScale*model.defaultScale);
    } else {
        figureScale = figureScale*findOptimalScale(frames, canvas, numKeyframes);
        frames = processSequenceToFrames(sequence, canvas.height, figureScale*model.defaultScale);
    }
    let drawStyle = new MocapDrawStyle(model.bonesModel, model.headJointIndex, model.leftArmIndex, model.thoraxIndex, model.boneRadius, model.jointRadius,
                                       model.headRadius, boneStyleDefault, leftBoneStyleDefault, rightBoneStyleDefault, jointStyleDefault, figureScale);
    let drawStyleBlur = new MocapDrawStyle(model.bonesModel, model.headJointIndex, model.leftArmIndex, model.thoraxIndex, model.boneRadius, model.jointRadius,
                                       model.headRadius, blurStyleDefault, blurStyleDefault, blurStyleDefault, blurStyleDefault, figureScale);
    drawStyle.figureScale = figureScale;
    drawStyleBlur.figureScale = figureScale;
    drawStyle.boneRadius = model.boneRadius*figureScale;
    drawStyleBlur.boneRadius = model.boneRadius*figureScale;
    drawStyle.jointRadius = model.jointRadius;
    drawStyleBlur.jointRadius = model.jointRadius;
    if (model.jointRadius < 0.1) {
        if (figureScale < 0.5) {
            drawStyle.headRadius = model.headRadius*figureScale*0.75;
            drawStyleBlur.headRadius = model.headRadius*figureScale*0.75;
        } else {
            drawStyle.headRadius = model.headRadius*figureScale;
            drawStyleBlur.headRadius = model.headRadius*figureScale;
        }
    } else {
        drawStyle.headRadius = model.headRadius;
        drawStyleBlur.headRadius = model.headRadius;
    }
    let bestRotation = findBestRotation(frames, numKeyframes);
    for (let i = 0; i < frames.length; i++) {
        frames[i] = frameRotateY(frames[i], bestRotation);
    }
    let keyframes;
    if (keyframeSelectionAlgorithm == KeyframeSelectionAlgorithmEnum.Decimation) {
        keyframes = findKeyframesDecimation(frames, numKeyframes);
    } else if (keyframeSelectionAlgorithm == KeyframeSelectionAlgorithmEnum.Lowe) {
        keyframes = findKeyframesLowe(frames, numKeyframes);
    } else if (keyframeSelectionAlgorithm == KeyframeSelectionAlgorithmEnum.Euclidean) {
        keyframes = findKeyframesEuclidean(frames, numKeyframes);
    } else if (keyframeSelectionAlgorithm == KeyframeSelectionAlgorithmEnum.Equidistant) {
        keyframes = findKeyframesEquidistant(frames, numKeyframes);
    } else {
        keyframes = findKeyframesTemporal(frames, numKeyframes);
    }
    let ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fill();
    ctx = map.getContext("2d");
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.rect(0, 0, map.width, map.height);
    ctx.fill();
    if (addFillingKeyframes) {
        let fillKeyframes = getFillKeyframes(frames, keyframes);
        let fillStyle = Object.assign({}, drawStyle);
        fillStyle.boneStyle = {r: fillStyle.boneStyle.r, g: fillStyle.boneStyle.g, b: fillStyle.boneStyle.b, a: fillStyle.boneStyle.a*0.55};
        fillStyle.leftBoneStyle = {r: fillStyle.leftBoneStyle.r, g: fillStyle.leftBoneStyle.g, b: fillStyle.leftBoneStyle.b, a: fillStyle.leftBoneStyle.a*0.55};
        fillStyle.rightBoneStyle = {r: fillStyle.rightBoneStyle.r, g: fillStyle.rightBoneStyle.g, b: fillStyle.rightBoneStyle.b, a: fillStyle.rightBoneStyle.a*0.55};
        drawSequenceKeyframesBlur(canvas, frames, fillKeyframes, 0, fillStyle, drawStyleBlur, 0, false, true, false);
    }
    drawSequenceKeyframesBlur(canvas, frames, keyframes, numBlurFrames, drawStyle, drawStyleBlur, 0, false, true);
    let framesMin = findSequenceMinimums(frames, numKeyframes);
    let framesMax = findSequenceMaximums(frames, numKeyframes);
    let maxWidth = Math.max(framesMax.x-framesMin.x, framesMax.z-framesMin.z);
    let mapScale = 100*figureScale*model.defaultScale;
    if (maxWidth > canvas.width) {
        mapScale = canvas.width*1.5;
    } else {
        mapScale = Math.floor(maxWidth/12.5)*25+25;
    }
    if (addTimeScale) {
        drawTimeScale(canvas, model.fps, frames.length, keyframes);
    }
    drawTopDownMapParallelogramUnitGrid(map, frames, keyframes, 
        {x:-1, y:-1, z:0}, 
        {x:-1, y:map.height+1, z:0}, 
        {x:map.width+1, y:map.height+1, z:0}, frames.length, mapScale, (model.unitSize*figureScale)*10, false);
    return div;
}

function processSequenceToFrames(rawData, canvasHeight, figureScale) {
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
    let yShift = -20+canvasHeight-Math.max(findMaximumsFromFrame(frames[0]).y, findMaximumsFromFrame(frames[frames.length-1]).y);
    for (let i = 0; i < frames.length; i++) {
        for (let j = 0; j < frames[i].length; j++) {
            frames[i][j].y += yShift; 
        }
    }
    return frames;
}

function processSequenceToFrames2d(rawData, canvasHeight, figureScale) {
    let lines = rawData;
    let frames = lines.map((frame) => {
        return frame.replace(" ", "").split(';').map((joint) => {
            let xy = joint.split(',');
            return {x:parseFloat(xy[0])*figureScale, y:parseFloat(xy[1])*figureScale + canvasHeight-10, z:0};
        });
    });
    frames = frames.filter((f) => {return f.length > 0 && !isNaN(f[0].x) && !isNaN(f[0].y)});
    if (frames.length == 0) {
        return frames;
    } 
    let yShift = -20+canvasHeight-Math.max(findMaximumsFromFrame(frames[0]).y, findMaximumsFromFrame(frames[frames.length-1]).y);
    for (let i = 0; i < frames.length; i++) {
        for (let j = 0; j < frames[i].length; j++) {
            frames[i][j].y += yShift; 
        }
    }
    return frames;
}

function getSequenceCategory(rawData) {
    let lines = rawData;
    let description = lines[0].match(/messif.objects.keys.AbstractObjectKey (.+)/);
    if (description == null) {
        return "null";
    }
    let category = description[1].match(/\d+_(\d+).+/)[1];
    return category;
}

function drawMapScale(canvas, markerDistance) {
    let ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    for (let i = 1; i < 10; i++) {
        ctx.beginPath();
        ctx.rect(i*markerDistance, canvas.height-5, 3, 5);
        ctx.closePath();
        ctx.fill();
    }
}

function drawMapMeterScale(canvas, meterSize, mapSize) {
    let ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    let meterPosition = lerp(0, canvas.width, meterSize/mapSize);
    ctx.font = '10px serif';
    meterPosition = lerp(0, canvas.width, (meterSize/10)/mapSize);
    drawRectangle(ctx, {x:canvas.width/10, y:canvas.height-5, z:0}, {x:meterPosition+canvas.width/10, y:canvas.height-5, z:0}, 2, 0, 0);
    ctx.fillText("1 dm", canvas.width/10+3, canvas.height-8);
}

function drawTimeScale(canvas, fps, length, keyframes) {
    let ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(64, 64, 64, 1)";
    drawRectangle(ctx, {x: 0, y: 3}, {x: canvas.width*length/(fps*10), y: 1}, 3, 0, 0);
    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    for (let i = 1; i < 10 && i*fps < length; i++) {
        ctx.beginPath();
        ctx.rect(canvas.width*i/10, 0, 3, 11);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = "rgba(64, 0, 192, 1)";
    for (let i = 0; i < keyframes.length; i++) {
        ctx.beginPath();
        ctx.rect(canvas.width*keyframes[i]/(fps*10), 0, 3, 7);
        ctx.closePath();
        ctx.fill();
    }
}

function drawTopDownMapParallelogram(canvas, frames, indexes, topLeft, bottomLeft, bottomRight, drawUntilFrame, mapScale, clear = true) {
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
    for (let i = 1; i < 10; i++) {
        drawRectangle(ctx, {x:topLeft.x+i*width/10, y:topLeft.y}, {x:bottomLeft.x+i*width/10, y:bottomLeft.y}, 0.75, 0, 0);
    }
    for (let i = 1; i < 10; i++) {
        let startShiftX = shift-inverseLerp(0, height, i*height/10)*shift;
        drawRectangle(ctx, {x:bottomLeft.x+startShiftX, y:topLeft.y+i*height/10}, {x:bottomRight.x+startShiftX, y:topLeft.y+i*height/10}, 0.75, 0, 0);
    }
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
            ctx.fillStyle = rgbaToColorString({r: (i/frames.length)*255, g: 0, b: 128, a:0.3});
            ctx.beginPath();
            ctx.rect(bottomLeft.x+transformedX+startShiftX, topLeft.y+transformedZ, 3, 3);
            ctx.closePath();
            ctx.fill();
        }
    }
    ctx.fillStyle = 'black';
    drawRectangle(ctx, topLeft, topRight, 1, 0, 0);
    drawRectangle(ctx, topRight, bottomRight, 1, 0, 0);
    drawRectangle(ctx, bottomRight, bottomLeft, 1, 0, 0);
    drawRectangle(ctx, bottomLeft, topLeft, 1, 0, 0);
}

function drawTopDownMapParallelogramUnitGrid(canvas, frames, indexes, topLeft, bottomLeft, bottomRight, drawUntilFrame, mapScale, dmsize, clear = true) {
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
    ctx.fillText("1 dm", dmTextLabelPos.x+2, dmTextLabelPos.y-2);
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
            ctx.fillStyle = rgbaToColorString({r: (i/frames.length)*255, g: 0, b: 128, a:0.3});
            ctx.beginPath();
            ctx.rect(bottomLeft.x+transformedX+startShiftX, topLeft.y+transformedZ, 3, 3);
            ctx.closePath();
            ctx.fill();
        }
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
    /*n_vector pa = P - A
    n_vector ba = B - A
    double t = dot(pa, ba)/dot(ba, ba)
    double d = length(pa - t * ba)*/
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

function getFillKeyframes(frames, keyframes) {
    numKeyframes = keyframes.length;
    result = [];
    let helpKeyframes = keyframes.slice();
    for (let i = 1; i < helpKeyframes.length; i++) {
        if (helpKeyframes[i]-helpKeyframes[i-1] > frames.length/numKeyframes) {
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

function findBestRotation(frames, numSamples) {
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

function findOptimalScale(frames, canvas, numFrames) {
    let maximums = findMaximumsFromFrame(frames[0]);
    let minimums = findMinimumsFromFrame(frames[0]);
    let maxWidth = maximums.x-minimums.x;
    let maxHeight = maximums.y-minimums.y;
    let maxY = maximums.y;
    let minY = minimums.y;
    for (let i = 0; i < numFrames; i++) {
        let index = Math.floor((i/numFrames)*frames.length);
        maximums = findMaximumsFromFrame(frames[index]);
        minimums = findMinimumsFromFrame(frames[index]);
        let width = maximums.x-minimums.x;
        let height = maximums.y-minimums.y;
        maxWidth = Math.max(maxWidth, width);
        maxHeight = Math.max(maxHeight, height);
        maxY = Math.max(maxY, maximums.y);
        minY = Math.min(minY, minimums.y);
    }
    return Math.min((canvas.height-28)/(maxY-minY), (canvas.width/(numFrames-1))/(maxWidth-20));
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

function crossProduct(a, b) {
    return new Vec3(a.y*b.z-a.z*b.y, -(a.x*b.z-a.z*b.x), a.x*b.y-a.y*b.x);
}

function normalize(vec) {
    let len = Math.sqrt(vec.x*vec.x+vec.y*vec.y+vec.z*vec.z);
    return new Vec3(vec.x/len, vec.y/len, vec.z/len);
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

function scaleRgbaColor(rgba, scalar) {
    let result = {r:clamp(0, 255, rgba.r*scalar), g:clamp(0, 255, rgba.g*scalar), b:clamp(0, 255, rgba.b*scalar), a:rgba.a};
    return result;
}

function rgbaToColorString(rgba) {
    return "rgba("+rgba.r+","+rgba.g+","+rgba.b+","+rgba.a+")";
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

function drawFrame(canvas, frame, xShift, yShift, drawStyle) {
    let ctx = canvas.getContext("2d");
    let bones = drawStyle.bonesModel.slice();
    bones.sort((a, b) => (frame[a.a].z+frame[a.b].z)/2-(frame[b.a].z+frame[b.b].z)/2);
    //ctx.fillStyle = rgbaToColorString(drawStyle.leftBoneStyle);
    let vecNose = crossProduct(new Vec3(frame[drawStyle.headJointIndex].x-frame[drawStyle.thoraxIndex].x, frame[drawStyle.headJointIndex].y-frame[drawStyle.thoraxIndex].y, frame[drawStyle.headJointIndex].z-frame[drawStyle.thoraxIndex].z),
                               new Vec3(frame[drawStyle.leftArmIndex].x-frame[drawStyle.thoraxIndex].x, frame[drawStyle.leftArmIndex].y-frame[drawStyle.thoraxIndex].y, frame[drawStyle.leftArmIndex].z-frame[drawStyle.thoraxIndex].z));
    vecNose = normalize(vecNose);
    vecNose = new Vec3(vecNose.x*35*drawStyle.figureScale, vecNose.y*35*drawStyle.figureScale, vecNose.z*35*drawStyle.figureScale);
    let nosePos = new Vec3(frame[drawStyle.headJointIndex].x+vecNose.x, frame[drawStyle.headJointIndex].y+vecNose.y, frame[drawStyle.headJointIndex].z+vecNose.z);
    if (nosePos.z < frame[drawStyle.headJointIndex].z) {
        ctx.fillStyle = rgbaToColorString({r: 192, g: 16, b:128, a: drawStyle.boneStyle.a});
        drawRectangle(ctx, nosePos, frame[drawStyle.headJointIndex], drawStyle.boneRadius, xShift, yShift);
    }
    for (let i = 0; i < frame.length; i++) {
        ctx.beginPath();
        ctx.fillStyle = rgbaToColorString(drawStyle.jointStyle);
        let radius = drawStyle.jointRadius;
        if (i == drawStyle.headJointIndex) {
            radius = drawStyle.headRadius;
        }
        ctx.arc(frame[i].x+xShift, frame[i].y+yShift, radius, 0, 2 * Math.PI);
        ctx.fill();
    }
    for (let i = 0; i < bones.length; i++) {
        if (bones[i].a >= frame.length || bones[i].b >= frame.length) {
            continue;
        }
        let a = frame[bones[i].a];
        let b = frame[bones[i].b];
        if (bones[i].type == BoneType.rightHand || bones[i].type == BoneType.rightLeg) {
            //ctx.fillStyle = rgbaToColorString(drawStyle.leftBoneStyle);
            ctx.fillStyle = rgbaToColorString(scaleRgbaColor(drawStyle.rightBoneStyle, 0.35+0.65*(i/bones.length)));
        } else if (bones[i].type == BoneType.leftHand || bones[i].type == BoneType.leftLeg) {
            //ctx.fillStyle = rgbaToColorString(drawStyle.rightBoneStyle);
            ctx.fillStyle = rgbaToColorString(scaleRgbaColor(drawStyle.leftBoneStyle, 0.35+0.65*(i/bones.length)));
        } else {
            ctx.fillStyle = rgbaToColorString(drawStyle.boneStyle);
        }
        drawRectangle(ctx, a, b, drawStyle.boneRadius+1*(i/bones.length), xShift, yShift);
    }
    if (nosePos.z >= frame[drawStyle.headJointIndex].z) {
        ctx.fillStyle = rgbaToColorString({r: 192, g: 16, b:128, a: drawStyle.boneStyle.a});
        drawRectangle(ctx, nosePos, frame[drawStyle.headJointIndex], drawStyle.boneRadius, xShift, yShift);
    }
}
