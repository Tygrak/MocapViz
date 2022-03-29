import {ContextOption} from "../Entities/ContextOption.js";
import {WrongContextTypeException} from "../Exceptions/WrongContextTypeException.js";
import {BodyParts} from "../Entities/BodyParts.js";
import {SampleManager} from "./SampleManager.js";

class ContextManager {
    static getContext(context, contextOption, contextJson, samples, model) {
        if (ContextManager.#useContext(contextOption)) {
            context.enable();
            if (contextOption == ContextOption.SAMPLED_CONTEXT) {
                if (contextJson.length !== 0) {
                    return ContextManager.#parseContextJson(contextJson, context);
                }

                return context;
            }
            else if (contextOption == ContextOption.BUILD_CONTEXT) {
                let sample = SampleManager.countDTWsAverage(samples, model);
                context.build();
                context.addContextToBuild(sample[0], sample[1], sample[2], sample[3], new BodyParts(
                    sample[2][0], sample[2][1], sample[2][2], sample[2][3], sample[2][4]));
                return context;
            }

            throw new WrongContextTypeException("Given context option is not supported");
        }

        context.disable();
        return context;
    }

    static createContextFile(distanceA, lowestDistanceA, largestDistanceA, dtwA, bodyParts) {
        return "{\n  \"distanceA\": " + distanceA.toString() + ",\n  " +
            "\"lowestDistanceA\": " + lowestDistanceA.toString() + ",\n  " +
            "\"largestDistanceA\": " + largestDistanceA.toString() + ",\n  " +
            "\"dtwA\": " + dtwA.toString() + ",\n  " +
            "\"bodyParts\": " + "{\"torso\": " + bodyParts.torso.toString() + ", " +
            "\"leftHand\": " + bodyParts.leftHand.toString() + ", " +
            "\"rightHand\": " + bodyParts.rightHand.toString() + ", " +
            "\"leftFoot\": " + bodyParts.leftLeg.toString() + ", " +
            "\"rightFoot\": " + bodyParts.rightLeg.toString() + "}\n" +"}";
    }

    static #parseContextJson(contextJson, context) {
        let parsedContext = JSON.parse(contextJson);
        let poseDistanceAverage = parsedContext.distanceA;
        let lowestDistanceAverage = parsedContext.lowestDistanceA;
        let largestDistanceAverage = parsedContext.largestDistanceA;
        let dtwDistanceAverage = parsedContext.dtwA;
        let bodyPartsDistanceAverage = new BodyParts(parsedContext.bodyParts["torso"], parsedContext.bodyParts["leftHand"],
            parsedContext.bodyParts["rightHand"], parsedContext.bodyParts["leftFoot"], parsedContext.bodyParts["rightFoot"]);

        context.setValues(poseDistanceAverage, lowestDistanceAverage, largestDistanceAverage, dtwDistanceAverage, bodyPartsDistanceAverage);
        return context;
    }

    static #useContext(contextOption) {
        return (contextOption != ContextOption.NO_CONTEXT);
    }
}

export {ContextManager};