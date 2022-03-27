import {BodyParts} from "./BodyParts.js"
import {SampleManager} from "../Managers/SampleManager.js";

class Context {
    useContext = false;

    poseDistanceAverage = 0;
    dtwDistanceAverage = 0;
    bodyPartsDistanceAverage = new BodyParts(null, null, null, null, null);

    #buildingPoseDistanceAverage = [];
    #buildingDtwDistanceAverage = [];
    #buildingBodyPartsDistanceAverage = [];

    constructor(useContext = true) {
        this.useContext = useContext;
    }

    setValues(poseDistanceAverage, dtwDistanceAverage, bodyPartsDistanceAverage) {
        this.poseDistanceAverage = poseDistanceAverage;
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
        this.#buildingPoseDistanceAverage = [];
        this.#buildingDtwDistanceAverage = [];
        this.#buildingBodyPartsDistanceAverage = [];
    }

    addContextToBuild(poseDistance, dtwDistance, bodyPartsDistance) {
        this.#buildingPoseDistanceAverage.push(poseDistance);
        this.#buildingDtwDistanceAverage.push(dtwDistance);
        this.#buildingBodyPartsDistanceAverage.push(bodyPartsDistance);
    }

    build() {
        if (this.#buildingPoseDistanceAverage.length === 0 ||
            this.#buildingDtwDistanceAverage.length === 0 ||
            this.#buildingBodyPartsDistanceAverage.length === 0) {
            this.useContext = false;
        } else {
            this.poseDistanceAverage = SampleManager.arrayAverage(this.#buildingPoseDistanceAverage);
            this.dtwDistanceAverage = SampleManager.arrayAverage(this.#buildingDtwDistanceAverage);


            let torso = [];
            let leftHand = [];
            let rightHand = [];
            let leftLeg = [];
            let rightLeg = [];
            this.#buildingBodyPartsDistanceAverage.forEach(
                bp => {
                    torso.push(bp.torso);
                    leftHand.push(bp.leftHand);
                    rightHand.push(bp.rightHand);
                    leftLeg.push(bp.leftLeg);
                    rightLeg.push(bp.rightLeg);
                }
            );

            this.bodyPartsDistanceAverage = new BodyParts(
                SampleManager.arrayAverage(torso),
                SampleManager.arrayAverage(leftHand),
                SampleManager.arrayAverage(rightHand),
                SampleManager.arrayAverage(leftLeg),
                SampleManager.arrayAverage(rightLeg)
            )
        }
    }
}

export {Context};