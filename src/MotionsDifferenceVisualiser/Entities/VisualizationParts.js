class VisualizationParts {
    description;
    maps;
    bodyParts;
    sequenceDifference;
    poseDetail;
    timeAlignedSequenceDifference;

    constructor(description = true, maps = true, bodyParts = true, sequenceDifference = true,
                poseDetail = true, timeAlignedSequenceDifference = true, timeAlignedMapping = true) {
        this.description = description;
        this.maps = maps;
        this.bodyParts = bodyParts;
        this.sequenceDifference = sequenceDifference;
        this.poseDetail = poseDetail;
        this.timeAlignedSequenceDifference = timeAlignedSequenceDifference;
        this.timeAlignedMapping = timeAlignedMapping;
    }
}

export {VisualizationParts}