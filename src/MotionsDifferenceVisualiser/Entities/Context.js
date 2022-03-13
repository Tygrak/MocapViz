import {BodyParts} from "../Entities/BodyParts.js"

class Context {
    useContext = false;

    poseDistanceAverage = 0;
    dtwDistanceAverage = 0;
    bodyPartsDistanceAverage = new BodyParts(null, null, null, null, null);

    constructor(useContext = true) {
        this.useContext = useContext;
    }

    setValues(poseDistanceAverage, dtwDistanceAverage, bodyPartsDistanceAverage) {
        this.poseDistanceAverage = poseDistanceAverage;
        this.dtwDistanceAverage = dtwDistanceAverage;
        this.bodyPartsDistanceAverage = bodyPartsDistanceAverage;
    }

    disableContext() {
        this.useContext = false;
    }

    enableContext() {
        this.useContext = true;
    }
}

export {Context};