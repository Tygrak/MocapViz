import {ContextOption} from "../Entities/ContextOption.js";
import {WrongContextTypeException} from "../Exceptions/WrongContextTypeException.js";
import {BodyParts} from "../Entities/BodyParts.js";
import {SampleManager} from "./SampleManager.js";

class ContextManager {
    static getContext(context, contextOption, contextJson, samples, model) {
        if (ContextManager.#useContext(contextOption)) {
            context.enableContext();
            if (contextOption == ContextOption.SAMPLED_CONTEXT) {
                if (contextJson.length !== 0) {
                    return ContextManager.#parseContextJson(contextJson, context);
                }

                return context;
            }
            else if (contextOption == ContextOption.BUILD_CONTEXT) {
                let sample = SampleManager.countDTWsAverage(samples, model);
                context.buildContext();
                context.addContextToBuild(sample[1], sample[0], new BodyParts(
                    sample[2][0], sample[2][1], sample[2][2], sample[2][3], sample[2][4]));
                console.log(context);
                return context;
            }

            throw new WrongContextTypeException("Given context option is not supported");
        }

        context.disableContext();
        return context;
    }

    static createContextFile(distanceA, dtwA, torso, leftHand, rightHand, leftFoot, rightFoot) {
        return "{\n  \"distanceA\": " + distanceA.toString() + ",\n  " +
            "\"dtwA\": " + dtwA.toString() + ",\n  " +
            "\"bodyParts\": " + "{\"torso\": " + torso.toString() + ", " +
            "\"leftHand\": " + leftHand.toString() + ", " +
            "\"rightHand\": " + rightHand.toString() + ", " +
            "\"leftFoot\": " + leftFoot.toString() + ", " +
            "\"rightFoot\": " + rightFoot.toString() + "}\n" +"}";
    }

    static #parseContextJson(contextJson, context) {
        let parsedContext = JSON.parse(contextJson);
        let poseDistanceAverage = parsedContext.distanceA;
        let dtwDistanceAverage = parsedContext.dtwA;
        let bodyPartsDistanceAverage = new BodyParts(parsedContext.bodyParts["torso"], parsedContext.bodyParts["leftHand"],
            parsedContext.bodyParts["rightHand"], parsedContext.bodyParts["leftFoot"], parsedContext.bodyParts["rightFoot"]);

        context.setValues(poseDistanceAverage, dtwDistanceAverage, bodyPartsDistanceAverage);
        return context;
    }

    static #useContext(contextOption) {
        return (contextOption != ContextOption.NO_CONTEXT);
    }
}

export {ContextManager};