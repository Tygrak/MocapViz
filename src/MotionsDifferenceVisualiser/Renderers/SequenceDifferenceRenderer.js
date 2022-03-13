import {drawSequence, findKeyframes, resizeSkeleton} from "../../mocap.js";
import * as Core from "../../mocapCore.js";
import {Vec3} from "../../mocapCore.js";
import * as THREE from "../../lib/three.module.js";
import {ColorManager} from "../Managers/ColorManager.js";

class SequenceDifferenceRenderer {
    static drawSequence(processedSequence, renderer, numKeyframes, sceneWidth, drawStyle, drawStyleBlur, yShift, xCoefficient = 1) {
        let figureScale = processedSequence.figureScale;
        let frames = processedSequence.frames;
        resizeSkeleton(renderer.skeleton, drawStyle, figureScale);
        let keyframes = findKeyframes(frames, numKeyframes, Core.KeyframeSelectionAlgorithmEnum.Decimation);

        let fillKeyframes = Core.getFillKeyframes(frames, keyframes, sceneWidth);
        let fillStyle = new Core.MocapDrawStyle(drawStyle.skeletonModel, drawStyle.boneRadius, drawStyle.jointRadius,
            drawStyle.headRadius, drawStyle.boneStyle, drawStyle.leftBoneStyle, drawStyle.rightBoneStyle,
            drawStyle.jointStyle, drawStyle.figureScale, drawStyle.noseStyle, drawStyle.noseRadius, 0.4);
        drawSequence(renderer, frames, fillKeyframes, 0, fillStyle, drawStyleBlur, figureScale, yShift, false, true, xCoefficient);

        return drawSequence(renderer, frames, keyframes, 0, drawStyle, drawStyleBlur, figureScale, yShift, false, true, xCoefficient);
    }

    static drawDots(renderer, dotYShift, positions, frames, dtw, startXDotPosition, circleRadius, isShorterSequence = false) {
        let shift = positions[positions.length - 1] / frames.length;
        let xPosition = startXDotPosition;
        let dots = [];
        for (let i = 0; i < frames.length; i++) {
            let color = ColorManager.getColorForSequenceIndex(i, dtw, isShorterSequence);
            SequenceDifferenceRenderer.drawDotFrame(renderer, xPosition, dotYShift, circleRadius, color);
            dots.push(new Vec3(xPosition, dotYShift, 0));
            xPosition += shift;
        }
        return dots;
    }

    static drawLines(renderer, dots1, dots2, lineCoefficient, dtw) {
        for (let i = 0; i < dtw.warpingPath.length; i += lineCoefficient) {
            let color = ColorManager.getColorForWarpingPathIndex(i, dtw);
            SequenceDifferenceRenderer.#drawLine(renderer, dots1[dtw.warpingPath[i].index1], dots2[dtw.warpingPath[i].index2], color);
        }
    }

    static drawDotFrame(renderer, xPosition, yPosition, circleRadius, color) {
        let scene = new THREE.Scene();
        const geometry = new THREE.CircleGeometry(circleRadius, 32);

        let rgb;
        if (typeof color === "string" || color instanceof String) {
            rgb = color;
        } else {
            rgb = ColorManager.getRGBFromColor(color);
        }

        const material = new THREE.MeshBasicMaterial({color: rgb});
        const circle = new THREE.Mesh(geometry, material);

        circle.position.set(xPosition, yPosition, 0);
        scene.add(circle);

        renderer.renderer.render(scene, renderer.camera);
    }

    static #drawLine(renderer, coordination1, coordination2, color) {
        let scene = new THREE.Scene();
        let rgb = ColorManager.getRGBFromColor(color);
        const material = new THREE.LineBasicMaterial({color: rgb});

        const points = [];
        points.push(new THREE.Vector3(coordination1.x, coordination1.y, coordination1.z));
        points.push(new THREE.Vector3(coordination2.x, coordination2.y, coordination2.z));

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        renderer.renderer.render(scene, renderer.camera);
    }
}

export {SequenceDifferenceRenderer};