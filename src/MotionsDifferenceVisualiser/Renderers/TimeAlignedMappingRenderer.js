import {Vec3} from "../../mocapCore.js";

class TimeAlignedMappingRenderer {
    static drawTimeAlignedBars(warpingPath, sequenceLength, canvasWidth, canvasHeight) {
        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        const xShift = (canvasWidth - canvasWidth / 35) / sequenceLength;

        const ctx = canvas.getContext('2d');
        let yPosition = canvasHeight / 3;
        let lastIteration = new Vec3(-1,-1,0);
        for (let i = 0; i < warpingPath.length; i ++) {
            let x1 = warpingPath[i].index1;
            let x2 = warpingPath[i].index2;

            ctx.beginPath();
            ctx.moveTo(x1 * xShift, 0);
            ctx.lineTo(x2 * xShift, yPosition);

            if (lastIteration.x + 1 === x1 && lastIteration.y + 1 === x2) {
                ctx.strokeStyle = 'rgb(200, 200, 10)';
            } else if (lastIteration.x + 1 === x1 && lastIteration.y === x2) {
                ctx.strokeStyle = 'rgb(200, 20, 30)';
            } else if (lastIteration.x === x1 && lastIteration.y + 1 === x2) {
                ctx.strokeStyle = 'rgb(40, 50, 130)';
            } else {
                ctx.strokeStyle = 'black';
            }
            ctx.stroke();

            lastIteration.x = x1;
            lastIteration.y = x2;
        }

        return canvas;
    }
}

export {TimeAlignedMappingRenderer};