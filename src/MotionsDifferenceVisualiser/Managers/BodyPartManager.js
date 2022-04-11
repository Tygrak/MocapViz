import * as Model from "../../model.js";
import {DTWManager} from "./DTWManager.js";
import {Context} from "../Entities/Context.js";

class BodyPartManager {
    static getIndexesPerBodyPart(bodyPart, model) {
        if (model === Model.modelVicon) {
            return BodyPartManager.#getIndexesPerBodyPartModel(bodyPart, Model.bonesVicon);
        } else if (model === Model.modelKinect) {
            return BodyPartManager.#getIndexesPerBodyPartModel(bodyPart, Model.bonesKinect);
        } else if (model === Model.modelKinect2d) {
            return  BodyPartManager.#getIndexesPerBodyPartModel(bodyPart, Model.bonesKinect2d);
        }

        return null;
    }

    static getBodyPartsPerModel(longerSeq, shorterSeq, dtw, model) {
        let dtwBodyParts = [];
        dtwBodyParts.push(BodyPartManager.#calculateDtwPerBodyPart(
            longerSeq, shorterSeq, dtw, model, Model.BoneType.torso, "Torso"));
        dtwBodyParts.push(BodyPartManager.#calculateDtwPerBodyPart(
            longerSeq, shorterSeq, dtw, model, Model.BoneType.leftHand, "Left hand"));
        dtwBodyParts.push(BodyPartManager.#calculateDtwPerBodyPart(
            longerSeq, shorterSeq, dtw, model, Model.BoneType.rightHand, "Right hand"));
        dtwBodyParts.push(BodyPartManager.#calculateDtwPerBodyPart(
            longerSeq, shorterSeq, dtw, model, Model.BoneType.leftLeg, "Left leg"));
        dtwBodyParts.push(BodyPartManager.#calculateDtwPerBodyPart(
            longerSeq, shorterSeq, dtw, model, Model.BoneType.rightLeg, "Right leg"));

        return dtwBodyParts;
    }

    static #calculateDtwPerBodyPart(longerSeq, shorterSeq, dtw, model, bodyPart, text) {
        let context = BodyPartManager.#getBodyPartContext(dtw.context, bodyPart);
        return [DTWManager.calculateDtwPerBodyPart(longerSeq, shorterSeq, dtw, bodyPart, model, context), text];
    }

    static #getBodyPartContext(dtwContext, bodyPart) {
        if (!dtwContext.useContext) {
            return new Context(false);
        }

        let context = new Context(true);
        let bodyPartContext;
        switch (bodyPart) {
            case Model.BoneType.torso:
                bodyPartContext = dtwContext.bodyPartsDistanceAverage.torso;
                break;
            case Model.BoneType.leftHand:
                bodyPartContext = dtwContext.bodyPartsDistanceAverage.leftHand;
                break;
            case Model.BoneType.rightHand:
                bodyPartContext = dtwContext.bodyPartsDistanceAverage.rightHand;
                break;
            case Model.BoneType.leftLeg:
                bodyPartContext = dtwContext.bodyPartsDistanceAverage.leftLeg;
                break;
            case Model.BoneType.rightLeg:
                bodyPartContext = dtwContext.bodyPartsDistanceAverage.rightLeg;
                break;
        }

        context.setValues(bodyPartContext.poseDistance, bodyPartContext.lowestDistance, bodyPartContext.largestDistance, null, null);
        return context
    }

    static #getIndexesPerBodyPartModel(bodyPart, model) {
        let filteredBones = model.filter(function(b) {
            return b.type === bodyPart
        });

        return new Set(filteredBones.map(fb => fb.b));
    }
}

export {BodyPartManager};