import {ContextOption} from "../Entities/ContextOption.js";
import {WrongContextTypeException} from "../Exceptions/WrongContextTypeException.js";
import {BodyParts} from "../Entities/BodyParts.js";

class ContextManager {
    static getContext(context, contextOption, contextJson) {
        if (ContextManager.#useContext(contextOption)) {
            context.enableContext();
            if (contextOption == ContextOption.SAMPLED_CONTEXT) {
                if (contextJson.length !== 0) {
                    return ContextManager.#parseContextJson(contextJson, context);
                }

                return context;
            }
            else if (contextOption == ContextOption.BUILT_CONTEXT) {
                //TODO implement built context;
            }

            throw new WrongContextTypeException("Given context option is not supported");
        }

        context.disableContext();
        return context;
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