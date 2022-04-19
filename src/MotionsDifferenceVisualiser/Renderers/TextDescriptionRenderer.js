import {CategoryManager} from "../Managers/CategoryManager.js";

class TextDescriptionRenderer {
    static render(textElement, longerSequence, shorterSequence, dtw) {
        let category1 = CategoryManager.getSequenceCategory(longerSequence);
        let category2 = CategoryManager.getSequenceCategory(shorterSequence);

        TextDescriptionRenderer.#addText(textElement, "DTW distance: " + dtw.distance);
        TextDescriptionRenderer.#addText(textElement, "DTW distance / DTW warping path length: " + dtw.distance / dtw.warpingPath.length);
        TextDescriptionRenderer.#addText(textElement, "Longer sequence category: " + category1);
        TextDescriptionRenderer.#addText(textElement, "Shorter sequence category: " + category2);

        if (dtw.context.dtwDistanceAverage !== 0) {
            textElement.appendChild(document.createTextNode("Average of DTW distance: " + dtw.context.dtwDistanceAverage));
        }
    }

    static #addText(textElement, text) {
        textElement.appendChild(document.createTextNode(text));
        textElement.appendChild(document.createElement("br"));
    }
}

export {TextDescriptionRenderer};