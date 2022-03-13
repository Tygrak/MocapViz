import {motionCategories} from "../../model.js";

class CategoryManager {
    static getSequenceCategory(sequence) {
        let sequenceInfo = sequence[0];
        let splitSequenceInfo = sequenceInfo.split(' ');
        let splitNumInfo = splitSequenceInfo[splitSequenceInfo.length - 1].split('_');
        let categoryNumber = splitNumInfo[1];
        return motionCategories[categoryNumber];
    }
}

export {CategoryManager};