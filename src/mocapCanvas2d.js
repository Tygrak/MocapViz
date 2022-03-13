import * as Model from './model.js';
import * as Core from './mocapCore.js';

function drawSequence(canvas, frames, indexes, numBlurPositions, drawStyle, drawStyleBlur, yShift = 0, clear = true, trueTime = true, labelFrames = true) {
    let ctx = canvas.getContext("2d");
    if (clear) {
        Core.clearCanvas(canvas);
    }
    let firstFrame = Core.moveOriginXBy(frames[0], frames[0][0].x);
    let minimumsFirst = Core.findMinimumsFromFrame(firstFrame);
    let maximumsFirst = Core.findMaximumsFromFrame(firstFrame);
    let lastFrame = Core.moveOriginXBy(frames[frames.length-1], frames[frames.length-1][0].x);
    let maximums = Core.findMaximumsFromFrame(lastFrame);
    let sequenceMaximums = Core.findSequenceMaximums(frames, indexes.length);
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
            drawFrame(canvas, Core.moveOriginXBy(frames[indexes[i]-j], coreX), xShift, yShift, drawStyleBlur);
        }
        drawFrame(canvas, Core.moveOriginXBy(frames[indexes[i]], coreX), xShift, yShift, drawStyle);
        if (labelFrames) {
            ctx.font = '12px serif';
            ctx.fillStyle = 'black';
            ctx.fillText(indexes[i], xShift, sequenceMaximums.y+yShift+14);
        }
    }
    ctx.fillStyle = 'black';
    if (labelFrames) {
        Core.drawRectangle(ctx, {x: 0, y: sequenceMaximums.y, z: 0}, {x: canvas.width, y: sequenceMaximums.y, z: 0}, 1, 0, yShift+1);
    }
}

function createZoomableVisualizationElement(sequence, model, numKeyframes, zoomedNumKeyframes, numBlurFrames, mapWidth, mapHeight, visualizationWidth, visualizationHeight, addTimeScale = false, addFillingKeyframes = true, keyframeSelectionAlgorithm = 4, labelFrames = true) {
    let main = createVisualizationElement(sequence, model, numKeyframes, numBlurFrames, mapWidth, mapHeight, visualizationWidth, visualizationHeight, addTimeScale, addFillingKeyframes, keyframeSelectionAlgorithm);
    let zoomWidth = Math.floor(document.body.clientWidth-document.body.clientWidth/24);
    let zoomHeight = Math.floor(document.body.clientHeight*0.6-document.body.clientWidth/16);
    let bg = document.createElement("div");
    let zoomed = createVisualizationElement(sequence, model, zoomedNumKeyframes, numBlurFrames, 0, 0, zoomWidth, zoomHeight, addTimeScale, addFillingKeyframes, keyframeSelectionAlgorithm);
    zoomed.style = "z-index: 9999; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; border: 2px solid black; display: block;";
    bg.style = "display: none;";
    let fun = () => {
        let hide = main.classList.toggle("hidden");
        if (!hide) {
            bg.style = "display: none;";
        } else {
            bg.style = "z-index: 9998; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.9); display: block;";
        }
    };
    bg.onclick = fun;
    main.children[0].onclick = fun;
    main.children[1].onclick = fun;
    bg.appendChild(zoomed);
    main.appendChild(bg);
    return main;
}

function createVisualizationElement(sequence, model, numKeyframes, numBlurFrames, mapWidth, mapHeight, visualizationWidth, visualizationHeight, addTimeScale = false, addFillingKeyframes = true, keyframeSelectionAlgorithm = 4) {
    let drawStyle = new Core.MocapDrawStyle(model, 2, 0,
        10, Model.boneStyleDefault, Model.leftBoneStyleDefault, Model.rightBoneStyleDefault, Model.jointStyleDefault, 1);
    let drawStyleBlur = new Core.MocapDrawStyle(model, 2, 0,
        10, Model.blurStyleDefault, Model.blurStyleDefault, Model.blurStyleDefault, Model.blurStyleDefault, 1);
    let div = document.createElement("div");
    div.className = "drawItem-"+Model.motionCategories[Core.getSequenceCategory(sequence)];
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
    let processResult = Core.processSequence(sequence, numKeyframes, canvas.width, canvas.width, canvas.height, drawStyle, false);
    let frames = processResult.frames;
    let figureScale = processResult.figureScale/model.defaultScale;
    drawStyle.figureScale = figureScale;
    drawStyleBlur.figureScale = figureScale;
    drawStyle.boneRadius = drawStyle.boneRadius*figureScale;
    drawStyleBlur.boneRadius = drawStyleBlur.boneRadius*figureScale;
    if (drawStyle.jointRadius < 0.1) {
        if (figureScale < 0.5) {
            drawStyle.headRadius = drawStyle.headRadius*figureScale*0.75;
            drawStyleBlur.headRadius = drawStyle.headRadius*figureScale*0.75;
        } else {
            drawStyle.headRadius = drawStyle.headRadius*figureScale;
            drawStyleBlur.headRadius = drawStyle.headRadius*figureScale;
        }
    } else {
        drawStyle.headRadius = drawStyle.headRadius;
        drawStyleBlur.headRadius = drawStyle.headRadius;
    }
    let keyframes;
    if (keyframeSelectionAlgorithm == Core.KeyframeSelectionAlgorithmEnum.Decimation) {
        keyframes = Core.findKeyframesDecimation(frames, numKeyframes);
    } else if (keyframeSelectionAlgorithm == Core.KeyframeSelectionAlgorithmEnum.Lowe) {
        keyframes = Core.findKeyframesLowe(frames, numKeyframes);
    } else if (keyframeSelectionAlgorithm == Core.KeyframeSelectionAlgorithmEnum.Euclidean) {
        keyframes = Core.findKeyframesEuclidean(frames, numKeyframes);
    } else if (keyframeSelectionAlgorithm == Core.KeyframeSelectionAlgorithmEnum.Equidistant) {
        keyframes = Core.findKeyframesEquidistant(frames, numKeyframes);
    } else {
        keyframes = Core.findKeyframesTemporal(frames, numKeyframes);
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
        let fillKeyframes = Core.getFillKeyframes(frames, keyframes, canvas.width);
        let fillStyle = new Core.MocapDrawStyle(drawStyle.skeletonModel,  drawStyle.boneRadius, drawStyle.jointRadius,
            drawStyle.headRadius, drawStyle.boneStyle, drawStyle.leftBoneStyle, drawStyle.rightBoneStyle, 
            drawStyle.jointStyle, drawStyle.figureScale, drawStyle.noseStyle, drawStyle.noseRadius, 0.4);
        fillStyle.boneStyle = {r: fillStyle.boneStyle.r, g: fillStyle.boneStyle.g, b: fillStyle.boneStyle.b, a: fillStyle.boneStyle.a*0.55};
        fillStyle.leftBoneStyle = {r: fillStyle.leftBoneStyle.r, g: fillStyle.leftBoneStyle.g, b: fillStyle.leftBoneStyle.b, a: fillStyle.leftBoneStyle.a*0.55};
        fillStyle.rightBoneStyle = {r: fillStyle.rightBoneStyle.r, g: fillStyle.rightBoneStyle.g, b: fillStyle.rightBoneStyle.b, a: fillStyle.rightBoneStyle.a*0.55};
        drawSequence(canvas, frames, fillKeyframes, 0, fillStyle, drawStyleBlur, 0, false, true, false);
    }
    drawSequence(canvas, frames, keyframes, numBlurFrames, drawStyle, drawStyleBlur, 0, false, true);
    if (addTimeScale) {
        drawTimeScale(canvas, model.fps, frames.length, keyframes);
    }
    let mapScale = Core.findMapScale(frames, numKeyframes, figureScale, map.width);
    let mSize = canvas.width/(model.unitSize/figureScale);
    if (mapScale < mSize*2.5) {
        mapScale = mSize*2.5;
    }
    Core.drawTopDownMap(map, frames, keyframes, 
        {x:-1, y:-1, z:0}, 
        {x:-1, y:map.height+1, z:0}, 
        {x:map.width+1, y:map.height+1, z:0}, frames.length, mapScale, canvas.width/(model.unitSize/figureScale), false, true, model.fps);
    return div;
}

function drawTimeScale(canvas, fps, length, keyframes) {
    let ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(64, 64, 64, 1)";
    Core.drawRectangle(ctx, {x: 0, y: 3}, {x: canvas.width*length/(fps*10), y: 1}, 3, 0, 0);
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

function drawFrame(canvas, frame, xShift, yShift, drawStyle) {
    let ctx = canvas.getContext("2d");
    let bones = drawStyle.bonesModel.slice();
    bones.sort((a, b) => (frame[a.a].z+frame[a.b].z)/2-(frame[b.a].z+frame[b.b].z)/2);
    //ctx.fillStyle = rgbaToColorString(drawStyle.leftBoneStyle);
    let vecNose = Core.calculateNoseVec3(frame[drawStyle.headIndex], frame[drawStyle.thoraxIndex], frame[drawStyle.leftArmIndex], -15);
    let nosePos = new Core.Vec3(frame[drawStyle.headIndex].x+vecNose.x, frame[drawStyle.headIndex].y+vecNose.y, frame[drawStyle.headIndex].z+vecNose.z);
    if (nosePos.z < frame[drawStyle.headIndex].z) {
        ctx.fillStyle = Core.rgbaToColorString({r: 192, g: 16, b:128, a: drawStyle.boneStyle.a});
        Core.drawRectangle(ctx, nosePos, frame[drawStyle.headIndex], drawStyle.boneRadius, xShift, yShift);
    }
    for (let i = 0; i < frame.length; i++) {
        ctx.beginPath();
        ctx.fillStyle = Core.rgbaToColorString(drawStyle.jointStyle);
        let radius = drawStyle.jointRadius;
        if (i == drawStyle.headIndex) {
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
        if (bones[i].type == Model.BoneType.rightHand || bones[i].type == Model.BoneType.rightLeg) {
            ctx.fillStyle = Core.rgbaToColorString(Core.scaleRgbaColor(drawStyle.rightBoneStyle, 0.65+0.35*(i/bones.length)));
        } else if (bones[i].type == Model.BoneType.leftHand || bones[i].type == Model.BoneType.leftLeg) {
            ctx.fillStyle = Core.rgbaToColorString(Core.scaleRgbaColor(drawStyle.leftBoneStyle, 0.65+0.35*(i/bones.length)));
        } else {
            ctx.fillStyle = Core.rgbaToColorString(drawStyle.boneStyle);
        }
        Core.drawRectangle(ctx, a, b, drawStyle.boneRadius+1*(i/bones.length), xShift, yShift);
    }
    if (nosePos.z >= frame[drawStyle.headIndex].z) {
        ctx.fillStyle = Core.rgbaToColorString({r: 192, g: 16, b:128, a: drawStyle.boneStyle.a});
        Core.drawRectangle(ctx, nosePos, frame[drawStyle.headIndex], drawStyle.boneRadius, xShift, yShift);
    }
}

export {createVisualizationElement, createZoomableVisualizationElement};
export {loadDataFromString, loadDataFromFile, getSequenceLength, getSequenceCategory, getSequenceJointsPerFrame, KeyframeSelectionAlgorithmEnum} from './mocapCore.js';
export * from './model.js';
export * from './asfAmcParser.js';
