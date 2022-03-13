import {ColorManager} from "../Managers/ColorManager.js";

class BodyPartsRenderer {
    static renderBodyPartBars(canvas, dtwBodyParts, visualisationWidth, textSpace, textHeight) {
        let bodyPart = dtwBodyParts[0][0];
        let oneBarPieceWidth = visualisationWidth / bodyPart.warpingPath.length;
        canvas.width = bodyPart.warpingPath.length * oneBarPieceWidth + textSpace;
        canvas.height = 20 * dtwBodyParts.length;
        const ctx = canvas.getContext('2d');
        ctx.font = `${textHeight}px Arial`;

        for (let j = 0; j < dtwBodyParts.length; j++) {
            ctx.fillStyle = "black";
            ctx.fillText(dtwBodyParts[j][1], 0, j * textHeight + textHeight, textSpace);
            for (let i = 0; i < dtwBodyParts[j][0].warpingPath.length; i++) {
                let color = ColorManager.getColorForWarpingPathIndex(i, dtwBodyParts[j][0]);
                ctx.fillStyle = ColorManager.getRGBFromColor(color);
                ctx.fillRect(textSpace + i * oneBarPieceWidth, j * textHeight, oneBarPieceWidth, textHeight);
            }
        }
    }
}

export {BodyPartsRenderer};