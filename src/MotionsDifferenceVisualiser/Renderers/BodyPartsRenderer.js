import {ColorManager} from "../Managers/ColorManager.js";

class BodyPartsRenderer {
    static render(canvas, dtwBodyParts, sequenceLength, visualisationWidth, textSpace, textHeight) {
        canvas.width = visualisationWidth + textSpace;
        let oneBarPieceWidth = (visualisationWidth - visualisationWidth / 35) / sequenceLength;
        const ctx = canvas.getContext('2d');
        ctx.font = `${textHeight}px Arial`;

        for (let j = 0; j < dtwBodyParts.length; j++) {
            ctx.fillStyle = "black";
            ctx.fillText(dtwBodyParts[j][1], 0, j * textHeight + textHeight, textSpace);
            for (let i = 0; i < sequenceLength; i++) {
                let color = ColorManager.getColorForSequenceIndex(i, dtwBodyParts[j][0]);
                ctx.fillStyle = ColorManager.getRGBFromColor(color);
                ctx.fillRect(textSpace + i * oneBarPieceWidth, j * textHeight, oneBarPieceWidth, textHeight);
            }
        }
    }
}

export {BodyPartsRenderer};