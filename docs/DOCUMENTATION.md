# MocapViz Scripting Documentation

### loadDataFromString(dataString)

Loads sequences contained in a string. Returns a list of sequences contained in the string.

### loadDataFromFile(dataFile, callback, [filterPredicate, loadChunkMbSize, maxSequencesLoad])

Loads sequences contained in a data file. Invokes callback with the list of sequences contained in the file as a parameter.

If `filterPredicate` is provided, filters out sequences not matching the predicate when loading. The function loads data in chunks of size `loadChunkMbSize`, to allow loading large data files. By default the chunk size is 20 MB. The function throws an error when more than 500 sequences are loaded, to prevent slowing down the browser. To change this behaviour, increase `maxSequencesLoad`. 

### getSequenceCategory(sequence)

Returns the hdm05 motion category of a sequence. Use in conjuction with `motionCategories` or `motionCategoriesHuman` to get the string representation of a motion category.

### getSequenceLength(sequence)

Returns the length of a sequence in frames.

### VisualizationFactory

Allows creation of visualization elements. Manages the many parameters available for the creation of a visualization.

#### createVisualization(sequence, visualizationWidth, visualizationHeight, mapWidth, mapHeight)

Creates a visualization of a sequence according to the parameters set in the factory. Returns a `<div>` element containing the visualization. 

The returned `div` element has numerous child elements containing parts of the visualization. The first child is an `<img>` element containing the main visualization. If `mapWidth` and `mapHeight` are larger than 0, the second child of the returned element is a `<canvas>` element containing the map of the motion. If `labelFrames` is set to true, the returned element also contains a number of elements with text containing the frame numbers. If `createZoomable` is set to true a second larger visualization of the sequence is created, that is shown when clicking the main visualization. This second visualization is also added to the returned main element.

#### All Available Parameters

Name | Type | Description | Default Value
--- | --- | --- | --- |
`addFillingKeyframes` | bool | If true, adds filling keyframes in large enough spaces in the visualization. | true
`addTimeScale` | bool | If true, adds a time scale showing the length of the sequence and the position of the drawn keyframes in time. | false
`keyframeSelectionAlgorithm` | int (enum) | Determines the keyframe selection algorithm used when creating the visualization. See `KeyframeSelectionAlgorithmEnum` for possible values. | Decimation
`labelFrames` | bool | If true, adds the frame numbers above keyframes. | true
`useTrueTime` | bool | If true, uses the X-axis of the visualization as time. | true
`createZoomable` | bool | If true, adds a larger visualization available when clicking the main visualization. | true
`model` | SkeletonModel | The skeleton model of the sequence. See `SkeletonModel` for more information. | modelVicon 
`jointStyle` | Object {r, g, b, a} | The color used to draw the head of skeletons. | {r:0, g:0, b:0, a:1}
`boneStyle` | Object {r, g, b, a} | The color used to draw the torso and neck bones of skeletons. | {r:0, g:0, b:0, a:1}
`leftBoneStyle` | Object {r, g, b, a} | The color used to draw the left limbs of skeletons. | {r:144, g:0, b:0, a:1}
`rightBoneStyle` | Object {r, g, b, a} | The color used to draw the right limbs of skeletons. | {r:0, g:0, b:144, a:1}
`noseStyle` | Object {r, g, b, a} | The color used to draw the orientation arrow from the skeletons head. | {r: 192, g: 16, b: 128, a: 1}
`jointRadius` | float | Currently unsupported. | 0
`boneRadius` | float | Controls the width of the bones of the drawn skeletons. | 0.725
`headRadius` | float | Controls the width of the head joint of the drawn skeletons. | 1.5
`noseRadius` | float | Controls the width of the orientation arrow of the drawn skeletons. | 0.9
`opacity` | float <0, 1> | Controls the opacity of the drawn skeletons. | 1
`blurFrameOpacity` | float <0, 1> | Controls the opacity of the drawn motion blur frame skeletons. | 0.125
`numKeyframes` | int | Determines how many keyframes will be found and drawn. | 10
`numBlurFrames` | int | Determines how many motion blur frames will be drawn before each keyframe. | 10
`numZoomedKeyframes` | int | Determines how many keyframes will be found and drawn for the zoomed visualization. | 12

### KeyframeSelectionAlgorithmEnum

Enumerates the available keyframe selection algorithms.

Available values: `Equidistant`, `Euclidean`, `Temporal`, `Lowe`, `Decimation`
The recommended options are `Decimation`, `Temporal`, `Lowe` and `Equidistant`.

### SkeletonModel

Contains the needed information about a skeleton model. The available premade skeleton models are `modelVicon` (created for the HDM05 database), `modelKinect` and `modelKinect2d` (created for the PKU-MMD database).

#### constructor(bonesModel, fps, headIndex, leftArmIndex, thoraxIndex, defaultScale, unitSize)

`bonesModel` is an array of objects describing how to connect joints to create bones. `fps` contains the frame rate at which the sequences were recorded. `headIndex`, `leftArmIndex` and `thoraxIndex` are the indexes of the corresponding joints. `defaultScale` is used to scale the resulting skeleton when creating a visualization. `unitSize` is used by the maps to calculate the minimap grid size.

Example of the `bonesModel` used for `modelVicon` follows:

```javascript
const bonesVicon = [
    {a: 0, b: 1, type: BoneType.leftLeg}, {a: 1, b: 2, type: BoneType.leftLeg}, {a: 2, b: 3, type: BoneType.leftLeg}, 
    {a: 3, b: 4, type: BoneType.leftLeg}, {a: 4, b: 5, type: BoneType.leftLeg}, // leg
    {a: 0, b: 6, type: BoneType.rightLeg}, {a: 6, b: 7, type: BoneType.rightLeg}, {a: 7, b: 8, type: BoneType.rightLeg}, 
    {a: 8, b: 9, type: BoneType.rightLeg}, {a: 9, b: 10, type: BoneType.rightLeg}, // leg
    {a: 0, b: 11, type: BoneType.torso}, {a: 11, b: 12, type: BoneType.torso}, {a: 12, b: 13, type: BoneType.torso}, 
    {a: 13, b: 14, type: BoneType.torso}, {a: 14, b: 15, type: BoneType.torso}, {a: 15, b: 16, type: BoneType.torso}, // torso + head
    {a: 13, b: 17, type: BoneType.leftHand}, {a: 17, b: 18, type: BoneType.leftHand}, {a: 18, b: 19, type: BoneType.leftHand}, 
    {a: 19, b: 20, type: BoneType.leftHand}, {a: 20, b: 21, type: BoneType.leftHand}, {a: 21, b: 22, type: BoneType.leftHand}, 
    {a: 20, b: 23, type: BoneType.leftHand}, // hand
    {a: 13, b: 24, type: BoneType.rightHand}, {a: 24, b: 25, type: BoneType.rightHand}, {a: 25, b: 26, type: BoneType.rightHand}, 
    {a: 26, b: 27, type: BoneType.rightHand}, {a: 27, b: 28, type: BoneType.rightHand}, {a: 28, b: 29, type: BoneType.rightHand}, 
    {a: 27, b: 30, type: BoneType.rightHand} // hand
];
```

### motionCategories

Contains descriptions of motion categories from the HDM05 database. For example `motionCategories["22"]` returns `"turnRight"`.

### motionCategoriesHuman

Contains descriptions of motion categories from the HDM05 database, changed to be more human understandable. For example `motionCategoriesHuman["22"]` returns `"Turn Right"`.
