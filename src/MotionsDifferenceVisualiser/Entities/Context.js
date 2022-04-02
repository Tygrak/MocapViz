import {BodyParts} from "./BodyParts.js"
import {SampleManager} from "../Managers/SampleManager.js";

class Context {
    useContext = false;

    poseDistanceAverage = 0;
    lowestDistanceAverage = 0;
    largestDistanceAverage = 0;
    dtwDistanceAverage = 0;
    bodyPartsDistanceAverage = new BodyParts(null, null, null, null, null);

    #buildingPose = [];
    #buildingLowest = [];
    #buildingLargest = [];
    #buildingDtw = [];
    #buildingBodyParts = [];

    constructor(useContext = true) {
        this.useContext = useContext;
    }

    setValues(poseDistanceAverage, lowestDistanceAverage, largestDistanceAverage, dtwDistanceAverage, bodyPartsDistanceAverage) {
        this.poseDistanceAverage = poseDistanceAverage;
        this.lowestDistanceAverage = lowestDistanceAverage;
        this.largestDistanceAverage = largestDistanceAverage;
        this.dtwDistanceAverage = dtwDistanceAverage;
        this.bodyPartsDistanceAverage = bodyPartsDistanceAverage;
    }

    disable() {
        this.useContext = false;
    }

    enable() {
        this.useContext = true;
    }

    clearBuiltContext() {
        this.#buildingPose = [];
        this.#buildingLowest = [];
        this.#buildingLargest = [];
        this.#buildingDtw = [];
        this.#buildingBodyParts = [];
    }

    addContextToBuild(poseDistance, lowestDistance, largestDistance, dtwDistance, bodyPartsDistance) {
        this.#buildingPose.push(poseDistance);
        this.#buildingLowest.push(lowestDistance);
        this.#buildingLargest.push(largestDistance);
        this.#buildingDtw.push(dtwDistance);
        this.#buildingBodyParts.push(bodyPartsDistance);
    }

    build() {
        if (this.#buildingPose.length === 0 ||
            this.#buildingDtw.length === 0 ||
            this.#buildingBodyParts.length === 0) {
            this.useContext = false;
        } else {
            this.poseDistanceAverage = SampleManager.arrayAverage(this.#buildingPose);
            this.lowestDistanceAverage = SampleManager.arrayAverage(this.#buildingLowest);
            this.largestDistanceAverage = SampleManager.arrayAverage(this.#buildingLargest);
            this.dtwDistanceAverage = SampleManager.arrayAverage(this.#buildingDtw);
            this.bodyPartsDistanceAverage = SampleManager.calculateBodyPartsAverage(
                this.#buildingBodyParts.map(bp => bp.torso),
                this.#buildingBodyParts.map(bp => bp.leftHand),
                this.#buildingBodyParts.map(bp => bp.rightHand),
                this.#buildingBodyParts.map(bp => bp.leftLeg),
                this.#buildingBodyParts.map(bp => bp.rightLeg)
            );
        }
    }
}

export {Context};