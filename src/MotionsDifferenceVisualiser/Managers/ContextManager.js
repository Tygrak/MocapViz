import {ContextOption} from "../Entities/ContextOption.js";
import {WrongContextTypeException} from "../Exceptions/WrongContextTypeException.js";
import {BodyParts} from "../Entities/BodyParts.js";
import {SampleManager} from "./SampleManager.js";
import {JsonContext} from "../Entities/JsonContext.js";

class ContextManager {
    static getContext(context, contextOption, contextJson, sequenceTuple, model) {
        if (ContextManager.#useContext(contextOption)) {
            context.enable();
            if (contextOption == ContextOption.SAMPLED_CONTEXT) {
                if (contextJson.length !== 0) {
                    return ContextManager.#parseContextJson(contextJson, context);
                }

                return context;
            }
            else if (contextOption == ContextOption.BUILD_CONTEXT) {
                let samples = SampleManager.countDTWsAverage([sequenceTuple], model);
                context.build();
                context.addContextToBuild(samples[0], samples[1], samples[2], samples[3], new BodyParts(
                    samples[4].torso, samples[4].leftHand, samples[4].rightHand, samples[4].leftLeg, samples[4].rightLeg));
                return context;
            }

            throw new WrongContextTypeException("Given context option is not supported");
        }

        context.disable();
        return context;
    }

    static createContextFile(distanceAverage, lowestDistanceAverage, largestDistanceAverage, dtwAverage, bodyPartsAverage) {
        let jsonData = new JsonContext(distanceAverage, lowestDistanceAverage, largestDistanceAverage, dtwAverage, bodyPartsAverage);
        return JSON.stringify(jsonData);
    }

    static #parseContextJson(contextJson, context) {
        let parsedContext = JSON.parse(contextJson);
        context.setValues(parsedContext.poseDistance, parsedContext.lowestDistance, parsedContext.largestDistance,
            parsedContext.dtwDistance, parsedContext.bodyParts);
        return context;
    }

    static #useContext(contextOption) {
        return (contextOption != ContextOption.NO_CONTEXT);
    }
}

export {ContextManager};