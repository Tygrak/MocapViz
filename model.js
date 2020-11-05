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
]; //head = 16, origin = 0

const bonesKinect = [
    {a: 0, b: 1, type: BoneType.torso}, {a: 1, b: 20, type: BoneType.torso}, {a: 20, b: 2, type: BoneType.torso}, {a: 2, b: 3, type: BoneType.torso},
    {a: 20, b: 4, type: BoneType.leftHand}, {a: 4, b: 5, type: BoneType.leftHand}, {a: 5, b: 6, type: BoneType.leftHand}, {a: 6, b: 7, type: BoneType.leftHand},
    {a: 20, b: 8, type: BoneType.rightHand}, {a: 8, b: 9, type: BoneType.rightHand}, {a: 9, b: 10, type: BoneType.rightHand}, {a: 10, b: 11, type: BoneType.rightHand},
    {a: 0, b: 12, type: BoneType.leftLeg}, {a: 12, b: 13, type: BoneType.leftLeg}, {a: 13, b: 14, type: BoneType.leftLeg}, {a: 14, b: 15, type: BoneType.leftLeg},
    {a: 0, b: 16, type: BoneType.rightLeg}, {a: 16, b: 17, type: BoneType.rightLeg}, {a: 17, b: 18, type: BoneType.rightLeg}, {a: 18, b: 19, type: BoneType.rightLeg},
    {a: 7, b: 21, type: BoneType.leftHand}, {a: 7, b: 22, type: BoneType.leftHand}, 
    {a: 11, b: 23, type: BoneType.rightHand}, {a: 11, b: 24, type: BoneType.rightHand},
]; //head = 3, origin = 0

const bonesKinect2d = [
    {a: 0, b: 1, type: BoneType.leftLeg}, {a: 1, b: 2, type: BoneType.leftLeg}, {a: 2, b: 6, type: BoneType.leftLeg},  // leg
    {a: 3, b: 4, type: BoneType.rightLeg}, {a: 4, b: 5, type: BoneType.rightLeg}, {a: 3, b: 6, type: BoneType.rightLeg}, // leg
    {a: 6, b: 7, type: BoneType.torso}, {a: 7, b: 8, type: BoneType.torso}, {a: 8, b: 9, type: BoneType.torso}, // torso + head
    {a: 7, b: 12, type: BoneType.leftHand}, {a: 12, b: 11, type: BoneType.leftHand}, {a: 11, b: 10, type: BoneType.leftHand}, // hand
    {a: 7, b: 13, type: BoneType.rightHand}, {a: 13, b: 14, type: BoneType.rightHand}, {a: 14, b: 15, type: BoneType.rightHand} // hand
]; //head = 9, origin = 6

const modelVicon = {bonesModel: bonesVicon, fps: 120, headJointIndex: 16, defaultScale: 8};
const modelKinect = {bonesModel: bonesKinect, fps: 30, headJointIndex: 3, defaultScale: 180};
const modelKinect2d = {bonesModel: bonesKinect2d, fps: 30, headJointIndex: 9, defaultScale: 0.6};
