import {CategoryManager} from "../Managers/CategoryManager.js";
import {descriptionBoxSize} from "../Config/Config.js";

class TextDescriptionRenderer {
    static render(textElement, longerSequence, shorterSequence, dtwDistance, drawStyle, dtwDistanceAverage = 0) {
        let category1 = CategoryManager.getSequenceCategory(longerSequence);
        let category2 = CategoryManager.getSequenceCategory(shorterSequence);

        TextDescriptionRenderer.#addText(textElement, "DTW value: " + dtwDistance);
        TextDescriptionRenderer.#addText(textElement, "Longer sequence category: " + category1);
        TextDescriptionRenderer.#addText(textElement, "Shorter sequence category: " + category2);

        if (dtwDistanceAverage !== 0) {
            textElement.appendChild(document.createTextNode("Average of DTW distance: " + dtwDistanceAverage));
        }

        TextDescriptionRenderer.#addBodyDescription(textElement, "Nose", drawStyle.noseStyle);
        TextDescriptionRenderer.#addBodyDescription(textElement, "Torso", drawStyle.boneStyle);
        TextDescriptionRenderer.#addBodyDescription(textElement, "Left bones", drawStyle.leftBoneStyle);
        TextDescriptionRenderer.#addBodyDescription(textElement, "Right bones", drawStyle.rightBoneStyle);
    }

    static #addText(textElement, text) {
        textElement.appendChild(document.createTextNode(text));
        textElement.appendChild(document.createElement("br"));
    }

    static #addBodyDescription(textElement, bodyPartName, color) {
        let description = document.createElement('div');
        let box = TextDescriptionRenderer.#createBox(color);

        description.appendChild(document.createTextNode(`${bodyPartName} color: `))
        description.appendChild(box);

        textElement.appendChild(description);
        textElement.appendChild(document.createElement("br"));
    }

    static #createBox(color) {
        let box = document.createElement('div');
        box.style.height = descriptionBoxSize;
        box.style.float = "right";
        box.style.width = descriptionBoxSize;
        box.style.border = "1px solid black";
        box.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
        return box;
    }
}

export {TextDescriptionRenderer};