function MocapDrawStyle(bonesModel, boneRadius, jointRadius, headRadius, boneStyle, leftBoneStyle, rightBoneStyle, jointStyle) {
    this.bonesModel = bonesModel;
    this.boneRadius = boneRadius;
    this.jointRadius = jointRadius;
    this.headRadius = headRadius;
    this.boneStyle = boneStyle;
    this.leftBoneStyle = leftBoneStyle;
    this.rightBoneStyle = rightBoneStyle;
    this.jointStyle = jointStyle;
}

let BoneType = {
    rightLeg: 0,
    leftLeg: 1,
    rightHand: 2,
    leftHand: 3,
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    let firstFrame = moveOriginXBy(frames[0], frames[0][0].x);
    let minX = findMinimumsFromFrame(firstFrame).x;
    //let lastFrame = moveOriginXBy(frames[frames.length-1], frames[frames.length-1][0].x);
    //let maxX = findMaximumsFromFrame(lastFrame).x;
    for (let i = 0; i < indexes.length; i++) {
        let coreX = frames[indexes[i]][0].x;
        for (let j = 1; j < numBlurPositions+1; j++) {
            if (indexes[i]-j < 0) {
                continue;
            }
            drawFrame(canvas, moveOriginXBy(frames[indexes[i]-j], coreX), (i/indexes.length)*(canvas.width+minX-20)-minX+20, yShift, drawStyleBlur);
        }
        drawFrame(canvas, moveOriginXBy(frames[indexes[i]], coreX), (i/indexes.length)*(canvas.width+minX-20)-minX+20, yShift, drawStyle);
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
    //result = result.splice(1, 1);
    //result.push(frames.length-1);
    return result.sort((a, b) => a-b);
}

function findBestRotation(frames, samples) {
    samples = samples-1;
    let framesMin = findMinimumsFromFrame(frames[0]);
    let framesMax = findMaximumsFromFrame(frames[0]);
    for (let i = 1; i < samples+1; i++) {
        let index = Math.floor((i/samples)*frames.length);
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
    }
    let a = framesMax.x-framesMin.x;
    let b = framesMax.z-framesMin.z;
    let c = Math.sqrt(a**2+b**2);
    return Math.asin(b/c);
}

function frameDistance(a, b) {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result += (a[i].x-b[i].x)*(a[i].x-b[i].x)+(a[i].y-b[i].y)*(a[i].y-b[i].y)+(a[i].z-b[i].z)*(a[i].z-b[i].z);
    }
    return Math.sqrt(result);
}

function distance(a, b) {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result += (a[i]-b[i])*(a[i]-b[i]);
    }
    return Math.sqrt(result);
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

function drawFrame(canvas, frame, xShift, yShift, drawStyle) {
    let ctx = canvas.getContext("2d");
    for (let i = 0; i < frame.length; i++) {
        ctx.beginPath();
        ctx.fillStyle = drawStyle.jointStyle;
        let radius = drawStyle.jointRadius;
        if (i == 16) {
            radius = drawStyle.headRadius;
        }
        ctx.arc(frame[i].x+xShift, frame[i].y+yShift, radius, 0, 2 * Math.PI);
        ctx.fill();
    }
    for (let i = 0; i < drawStyle.bonesModel.length; i++) {
        if (drawStyle.bonesModel[i].a >= frame.length || drawStyle.bonesModel[i].b >= frame.length) {
            continue;
        }
        let a = frame[drawStyle.bonesModel[i].a];
        let b = frame[drawStyle.bonesModel[i].b];
        let normal = {x:a.y-b.y, y:-(a.x-b.x)};
        let magnitude = Math.sqrt(normal.x**2+normal.y**2);
        normal.x = normal.x/magnitude;
        normal.y = normal.y/magnitude;
        if (drawStyle.bonesModel[i].type == BoneType.leftHand || drawStyle.bonesModel[i].type == BoneType.leftLeg) {
            ctx.fillStyle = drawStyle.leftBoneStyle;
        } else if (drawStyle.bonesModel[i].type == BoneType.rightHand || drawStyle.bonesModel[i].type == BoneType.rightLeg) {
            ctx.fillStyle = drawStyle.rightBoneStyle;
        } else {
            ctx.fillStyle = drawStyle.boneStyle;
        }
        ctx.beginPath();
        ctx.moveTo(a.x+drawStyle.boneRadius*normal.x+xShift, a.y+drawStyle.boneRadius*normal.y+yShift);
        ctx.lineTo(b.x+drawStyle.boneRadius*normal.x+xShift, b.y+drawStyle.boneRadius*normal.y+yShift);
        ctx.lineTo(b.x-drawStyle.boneRadius*normal.x+xShift, b.y-drawStyle.boneRadius*normal.y+yShift);
        ctx.lineTo(a.x-drawStyle.boneRadius*normal.x+xShift, a.y-drawStyle.boneRadius*normal.y+yShift);
        ctx.lineTo(a.x+drawStyle.boneRadius*normal.x+xShift, a.y+drawStyle.boneRadius*normal.y+yShift);
        ctx.closePath();
        ctx.fill();
    }
}
