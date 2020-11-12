function MocapDrawStyle(bonesModel, headJointIndex, boneRadius, jointRadius, headRadius, boneStyle, leftBoneStyle, rightBoneStyle, jointStyle) {
    this.bonesModel = bonesModel;
    this.headJointIndex = headJointIndex;
    this.boneRadius = boneRadius;
    this.jointRadius = jointRadius;
    this.headRadius = headRadius;
    this.boneStyle = boneStyle;
    this.leftBoneStyle = leftBoneStyle;
    this.rightBoneStyle = rightBoneStyle;
    this.jointStyle = jointStyle;
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

function drawSequenceKeyframesBlur(canvas, frames, indexes, numBlurPositions, drawStyle, drawStyleBlur, yShift = 0, clear = true) {
    let ctx = canvas.getContext("2d");
    if (clear) {
        clearCanvas(canvas);
    }
    let firstFrame = moveOriginXBy(frames[0], frames[0][0].x);
    let minimums = findMinimumsFromFrame(firstFrame);
    let lastFrame = moveOriginXBy(frames[frames.length-1], frames[frames.length-1][0].x);
    let maximums = findMaximumsFromFrame(lastFrame);
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
    }
    ctx.fillStyle = 'black';
    drawRectangle(ctx, {x: 0, y: sequenceMaximums.y, z: 0}, {x: canvas.width, y: sequenceMaximums.y, z: 0}, 1, 0, yShift+1);
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

function processSequenceToFrames(rawData, canvasHeight, figureScale) {
    let frames = rawData.split("\n").map((frame) => {
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
    let frames = rawData.split("\n").map((frame) => {
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
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
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
        let transformedZ = height-inverseLerp(-mapScale/2, mapScale/2, z)*height;
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

function findKeyframes(frames, numKeyframes) {
    let result = [0, frames.length-1];
    for (let k = 0; k < numKeyframes-2; k++) {
        let dmax = 0;
        let index = 0;
        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            let dmin = Infinity;
            for (let j = 0; j < result.length; j++) {
                const keyframe = frames[result[j]];
                let d = frameTimeDistance(frame, keyframe, i, j);
                //let d = frameDistance(frame, keyframe);
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
    //result = result.splice(1, 1);
    //result.push(frames.length-1);
    return result.sort((a, b) => a-b);
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
    for (let i = 0; i < numFrames; i++) {
        let index = Math.floor((i/numFrames)*frames.length);
        maximums = findMaximumsFromFrame(frames[index]);
        minimums = findMinimumsFromFrame(frames[index]);
        let width = maximums.x-minimums.x;
        let height = maximums.y-minimums.y;
        if (width > maxWidth) {
            maxWidth = width;
        }
        if (height > maxHeight) {
            maxHeight = height;
        }
    }
    return Math.min((canvas.height-38)/maxHeight, (canvas.width/(numFrames-1))/maxWidth);
    //return ((canvas.height)/2-40)/maxHeight;
}

function frameDistance(a, b) {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result += (a[i].x-b[i].x)*(a[i].x-b[i].x)+(a[i].y-b[i].y)*(a[i].y-b[i].y)+(a[i].z-b[i].z)*(a[i].z-b[i].z);
    }
    return Math.sqrt(result);
}

function frameTimeDistance(a, b, aFrame, bFrame) {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result += (a[i].x-b[i].x)*(a[i].x-b[i].x)+(a[i].y-b[i].y)*(a[i].y-b[i].y)+(a[i].z-b[i].z)*(a[i].z-b[i].z);
    }
    result += (aFrame-bFrame)^2;
    return Math.sqrt(result);
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
}
