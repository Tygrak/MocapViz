let bonesVicon = [
    {a: 0, b: 1}, {a: 1, b: 2}, {a: 2, b: 3}, {a: 3, b: 4}, {a: 4, b: 5}, // leg
    {a: 0, b: 6}, {a: 6, b: 7}, {a: 7, b: 8}, {a: 8, b: 9}, {a: 9, b: 10}, // leg
    {a: 0, b: 11}, {a: 11, b: 12}, {a: 12, b: 13}, {a: 13, b: 14}, {a: 14, b: 15}, {a: 15, b: 16}, // torso + head
    {a: 13, b: 17}, {a: 17, b: 18}, {a: 18, b: 19}, {a: 19, b: 20}, {a: 20, b: 21}, {a: 21, b: 22}, {a: 20, b: 23}, // hand
    {a: 13, b: 24}, {a: 24, b: 25}, {a: 25, b: 26}, {a: 26, b: 27}, {a: 27, b: 28}, {a: 28, b: 29}, {a: 27, b: 30}]; // hand
let bonesKinect = [
    {a: 0, b: 1}, {a: 1, b: 2}, {a: 2, b: 3}, {a: 3, b: 4}, // leg
    {a: 0, b: 6}, {a: 6, b: 7}, {a: 7, b: 8}, {a: 8, b: 9}, // leg
    {a: 0, b: 11}, {a: 11, b: 13}, {a: 13, b: 14}, {a: 14, b: 16}, // torso + head
    {a: 13, b: 17}, {a: 17, b: 18}, {a: 18, b: 19}, {a: 19, b: 21}, {a: 21, b: 22}, {a: 21, b: 23}, // hand
    {a: 13, b: 24}, {a: 24, b: 25}, {a: 25, b: 26}, {a: 26, b: 28}, {a: 28, b: 29}, {a: 28, b: 30}]; // hand
let figureScale = 15;
let height = 600;
let width = 900;
let frame = 0;
let headRadius = 30;
let jointRadius = 4;
let boneRadius = 2;
let jointStyle = 'rgba(0,0,0,0.01)';
let boneStyle = 'rgba(0,0,0,0.01)';


let canvas = document.getElementById("drawBox");
canvas.width = width;
canvas.height = height;
let ctx = canvas.getContext("2d");

let frames = processDataToFrames();
console.debug(frames);
for (let i = 0; i < frames.length; i++) {
    if (i%30 == 0) {
        jointStyle = 'rgba(0,0,0,0.75)';
        boneStyle = 'rgba(0,0,0,0.75)';
    } else {
        continue;
        jointStyle = 'rgba(0,0,0,0.15)';
        boneStyle = 'rgba(0,0,0,0.15)';
    }
    drawFrame(frames[i], (i/frames.length)*700);
}

function processDataToFrames() {
    let rawData = document.getElementById('currentData').innerHTML;
    let frames = rawData.split("\n").map((frame) => {
        return frame.replace(" ", "").split(';').map((joint) => {
            let xyz = joint.split(',');
            return {x:parseFloat(xyz[0])*figureScale + 10 * figureScale, y:parseFloat(xyz[1])*-1*figureScale + height-10, z:parseFloat(xyz[2])*figureScale};
        });
    });
    frames.splice(0, 3);
    console.debug(frames);
    return frames;
}

function drawFrame(frame, xShift) {
    console.debug(frame);
    //ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < frame.length; i++) {
        ctx.beginPath();
        ctx.fillStyle = jointStyle;
        let radius = jointRadius;
        if (i == 16) {
            radius = headRadius;
        }
        ctx.arc(frame[i].x+xShift, frame[i].y, radius, 0, 2 * Math.PI);
        ctx.fill();
    }
    for (let i = 0; i < bonesVicon.length; i++) {
        let a = frame[bonesVicon[i].a];
        let b = frame[bonesVicon[i].b];
        let normal = {x:a.y-b.y, y:-(a.x-b.x)};
        let magnitude = Math.sqrt(normal.x**2+normal.y**2);
        normal.x = normal.x/magnitude;
        normal.y = normal.y/magnitude;
        ctx.fillStyle = boneStyle;
        ctx.beginPath();
        ctx.moveTo(a.x+boneRadius*normal.x+xShift, a.y+boneRadius*normal.y);
        ctx.lineTo(b.x+boneRadius*normal.x+xShift, b.y+boneRadius*normal.y);
        ctx.lineTo(b.x-boneRadius*normal.x+xShift, b.y-boneRadius*normal.y);
        ctx.lineTo(a.x-boneRadius*normal.x+xShift, a.y-boneRadius*normal.y);
        ctx.lineTo(a.x+boneRadius*normal.x+xShift, a.y+boneRadius*normal.y);
        ctx.closePath();
        ctx.fill();
    }
}
//setInterval(draw, 20);
