import {CategoryManager} from "../Managers/CategoryManager.js";

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
    }

    static #addText(textElement, text) {
        textElement.appendChild(document.createTextNode(text));
        textElement.appendChild(document.createElement("br"));
    }
}

export {TextDescriptionRenderer};