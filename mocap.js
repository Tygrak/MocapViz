function MocapDrawStyle(bonesModel, boneRadius, jointRadius, headRadius, boneStyle, jointStyle) {
    this.bones = bonesModel;
    this.boneRadius = boneRadius;
    this.jointRadius = jointRadius;
    this.headRadius = headRadius;
    this.boneStyle = boneStyle;
    this.jointStyle = jointStyle;
}

function drawSequence(canvas, frames, drawStyle) {
    let ctx = canvas.ctx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let firstFrame = moveOriginXBy(frames[0], frames[0][0].x);
    let minX = firstFrame[0].x;
    for (let i = 1; i < firstFrame.length; i++) {
        if (firstFrame[i].x < minX) {
            minX = firstFrame[i].x;
        }
    }
    let lastFrame = moveOriginXBy(frames[frames.length-1], frames[frames.length-1][0].x);
    let maxX = lastFrame[0].x;
    for (let i = 1; i < lastFrame.length; i++) {
        if (lastFrame[i].x > maxX) {
            maxX = lastFrame[i].x;
        }
    }
    for (let i = 0; i < frames.length; i++) {
        if (Math.floor(i%(frames.length/(numPositions-1))) == 0 || i == frames.length-1) {
            let coreX = frames[i][0].x;
            let jointStyle = 'rgba(0,0,0,0.75)';
            let boneStyle = 'rgba(0,0,0,0.75)';
            if (i > 0) {
                jointStyle = 'rgba(0,0,0,0.10)';
                boneStyle = 'rgba(0,0,0,0.10)';
                for (let j = 1; j < numPrePositionMovement+1; j++) {
                    if (i-j < 0) {
                        continue;
                    }
                    drawFrame(canvas, moveOriginXBy(frames[i-j], coreX), (i/frames.length)*(canvas.width+minX-maxX-20)-minX+20, drawStyle);
                }
            }
            jointStyle = 'rgba(0,0,0,0.75)';
            boneStyle = 'rgba(0,0,0,0.75)';
            drawFrame(canvas, moveOriginXBy(frames[i], coreX), (i/frames.length)*(canvas.width+minX-maxX-20)-minX+20, drawStyle);
        }
    }
}

function processSequenceToFrames(rawData) {
    let frames = rawData.split("\n").map((frame) => {
        return frame.replace(" ", "").split(';').map((joint) => {
            let xyz = joint.split(',');
            return {x:parseFloat(xyz[0])*figureScale, y:parseFloat(xyz[1])*-1*figureScale + height-10, z:parseFloat(xyz[2])*figureScale};
        });
    });
    frames = frames.filter((f) => {return f.length > 0 && !isNaN(f[0].x) && !isNaN(f[0].y) && !isNaN(f[0].z)});
    return frames;
}

function moveOriginXBy(frame, moveBy) {
    let newFrame = [];
    for (let i = 0; i < frame.length; i++) {
        newFrame[i] = {x:frame[i].x-moveBy, y:frame[i].y, z:frame[i].z};
    }
    return newFrame;
}

function swapFrameXZ(frame) {
    let newFrame = [];
    for (let i = 0; i < frame.length; i++) {
        newFrame[i] = {x:frame[i].z, y:frame[i].y, z:frame[i].x};
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
        let a = frame[drawStyle.bonesModel[i].a];
        let b = frame[drawStyle.bonesModel[i].b];
        let normal = {x:a.y-b.y, y:-(a.x-b.x)};
        let magnitude = Math.sqrt(normal.x**2+normal.y**2);
        normal.x = normal.x/magnitude;
        normal.y = normal.y/magnitude;
        ctx.fillStyle = drawStyle.boneStyle;
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

function drawFrame(canvas, frame, drawStyle) {
    drawFrame(canvas, frame, 0, 0, drawStyle);
}
