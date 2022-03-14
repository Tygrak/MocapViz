import {CategoryManager} from "../Managers/CategoryManager.js";

class TextDescriptionRenderer {
    static render(textElement, longerSequence, shorterSequence, dtwDistance, dtwDistanceAverage = 0) {
        let category1 = CategoryManager.getSequenceCategory(longerSequence);
        let category2 = CategoryManager.getSequenceCategory(shorterSequence);

        textElement.appendChild(document.createTextNode("DTW value: " + dtwDistance));
        textElement.appendChild(document.createElement("br"));
        textElement.appendChild(document.createTextNode("Longer sequence category: " + category1));
        textElement.appendChild(document.createElement("br"));
        textElement.appendChild(document.createTextNode("Shorter sequence category: " + category2));
        textElement.appendChild(document.createElement("br"));

        if (dtwDistanceAverage !== 0) {
            textElement.appendChild(document.createTextNode("Average of DTW distance: " + dtwDistanceAverage));
        }
    }
}

export {TextDescriptionRenderer};