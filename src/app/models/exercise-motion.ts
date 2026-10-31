import { MuscleGroup } from './exercise';
import { FIGURE_ART, PartArt, PartName } from './exercise-figure-art';

/**
 * How an exercise moves, for its animated demo (EXR-13): a figure posed at a few key
 * positions, which the demo moves between in a loop. See docs/features/exercises.md.
 *
 * The figure is drawn in units of about a centimetre, on a floor at y = 0 (so up is
 * negative, as in SVG). Angles are absolute, in degrees, each the way a body part points
 * from the joint it hangs from: 0 is straight down, 90 to the right, 180 straight up and
 * -90 to the left. From the side the figure faces right.
 */

/** From the side, facing right, or from the front. */
export type MotionView = 'side' | 'front';

export type Point = readonly [x: number, y: number];

/**
 * An arm or a leg: by the angles of its two parts (upper arm and forearm, thigh and shin),
 * or by where its end (the hand or the ankle) should be, with the elbow or knee bent
 * clockwise or anticlockwise as drawn. An end that stays put, such as a foot on the floor,
 * is best given by where it is, so it doesn't slide as the figure moves. `'bar'` puts the
 * hand on the barbell.
 */
export type Limb =
    | { readonly angles: readonly [upper: number, lower: number] }
    | { readonly reach: Point | 'bar'; readonly bend: 'cw' | 'ccw' };

/**
 * One position of the figure. From the side, near is the side facing you and far the
 * side behind; from the front, near is on your left.
 */
export interface Pose {
    /** Where the hips are. */
    readonly hips: Point;
    /** The angle of the back, from the hips to the shoulders (180 is upright). */
    readonly torso: number;
    /** The angle of the neck; the torso's if not given. */
    readonly head?: number;
    readonly arms: readonly [near: Limb, far: Limb];
    readonly legs: readonly [near: Limb, far: Limb];
    /** The angle of each foot, from the ankle to the toes; flat on the floor if not given. */
    readonly feet?: readonly [near: number, far: number];
}

/** Equipment drawn with the figure. */
export type Prop = 'barbell-on-back' | 'dumbbells';

export interface MotionFrame {
    /** What the position is called, under its still when motion is reduced, e.g. "Bottom". */
    readonly label: string;
    readonly pose: Pose;
    /** How long it stays in this position, in milliseconds, before moving on. */
    readonly hold?: number;
    /** How long it takes to move from this position to the next (or back to the first). */
    readonly ms: number;
}

export interface ExerciseMotion {
    readonly view: MotionView;
    readonly props?: readonly Prop[];
    readonly frames: readonly MotionFrame[];
}

/** The figure's proportions, about a 175 cm person's. */
export const BODY = {
    torso: 52,
    upperArm: 30,
    /** From the elbow to the middle of the hand. */
    forearm: 30,
    thigh: 44,
    shin: 44,
} as const;

/** How the figure is put together from each view. */
const VIEWS = {
    side: {
        /** How far from the middle each hip and shoulder joint is. */
        hipSpread: 0,
        shoulderSpread: 0,
        /** The angle of a foot flat on the floor. */
        footAngle: 90,
    },
    front: {
        hipSpread: 9,
        shoulderSpread: 17,
        footAngle: 0,
    },
} as const;

/** One of the figure's parts, drawn as in `FIGURE_ART`, placed with its joint at `at`. */
export interface PlacedPart {
    readonly type: 'part';
    readonly name: PartName;
    readonly art: PartArt;
    readonly at: Point;
    /** The way it points from its joint, as the pose's angles are given. */
    readonly angle: number;
    /** Flipped across its length: the near limbs from the front, and the head from the side. */
    readonly mirror: boolean;
}

/** Kit drawn with the figure: a circle (a plate or dumbbell end on), or a bar. */
export type PlacedProp =
    | { readonly type: 'circle'; readonly at: Point; readonly r: number; readonly tone: PropTone }
    | {
          readonly type: 'line';
          readonly from: Point;
          readonly to: Point;
          readonly width: number;
          readonly tone: PropTone;
      };

/** A plate or a dumbbell, or the bar (the end of a bar seen from the side). */
export type PropTone = 'plate' | 'bar';

export type FigureItem = PlacedPart | PlacedProp;

/** What's drawn in drawing order: behind the figure (its far side), its body, then in front. */
export interface FigureLayers {
    readonly far: readonly FigureItem[];
    readonly body: readonly FigureItem[];
    readonly near: readonly FigureItem[];
}

export interface Box {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

/** How a muscle is shaded, as on the body map; null for a part that's never shaded. */
export type MuscleTone = 'main' | 'supporting' | 'idle' | 'other';

export function muscleTone(
    muscle: MuscleGroup | null,
    main: readonly MuscleGroup[],
    supporting: readonly MuscleGroup[]
): MuscleTone {
    if (muscle === null) {
        return 'other';
    }
    return main.includes(muscle) ? 'main' : supporting.includes(muscle) ? 'supporting' : 'idle';
}

const dir = (angle: number): Point => {
    const radians = (angle * Math.PI) / 180;
    return [Math.sin(radians), Math.cos(radians)];
};
/** The angle a line points, as `dir()` takes it. */
const angleOf = (from: Point, to: Point) =>
    (Math.atan2(to[0] - from[0], to[1] - from[1]) * 180) / Math.PI;
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const scale = (a: Point, by: number): Point => [a[0] * by, a[1] * by];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPoint = (a: Point, b: Point, t: number): Point => [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
];

/**
 * Where a point of a part's drawing lands on the figure: mirrored if the part is, then turned
 * so its +y runs along `angle` (SVG's `translate() rotate(-angle) scale(-1, 1)`).
 */
export function placePoint(part: PlacedPart, [x, y]: Point): Point {
    const radians = (-part.angle * Math.PI) / 180;
    const across = part.mirror ? -x : x;
    return [
        part.at[0] + across * Math.cos(radians) - y * Math.sin(radians),
        part.at[1] + across * Math.sin(radians) + y * Math.cos(radians),
    ];
}

/**
 * The elbow or knee and the hand or ankle of a limb from `root`, by its angles, or by two-joint
 * IK to reach where it should end. Out of reach, it stretches straight towards it.
 */
export function solveLimb(
    root: Point,
    limb: Limb,
    upper: number,
    lower: number,
    bar: Point
): readonly [mid: Point, end: Point] {
    if ('angles' in limb) {
        const mid = add(root, scale(dir(limb.angles[0]), upper));
        return [mid, add(mid, scale(dir(limb.angles[1]), lower))];
    }
    const target = limb.reach === 'bar' ? bar : limb.reach;
    const toTarget = sub(target, root);
    const length = Math.hypot(toTarget[0], toTarget[1]) || 1e-6;
    const reach = Math.min(Math.max(length, Math.abs(upper - lower) + 1e-6), upper + lower);
    const along = scale(toTarget, 1 / length);
    // The angle at the root between the line to the end and the upper part (law of cosines),
    // turned clockwise as drawn (y is down) for 'cw'
    const cos = (upper * upper + reach * reach - lower * lower) / (2 * upper * reach);
    const turn = Math.acos(Math.min(1, Math.max(-1, cos))) * (limb.bend === 'cw' ? 1 : -1);
    const turned: Point = [
        along[0] * Math.cos(turn) - along[1] * Math.sin(turn),
        along[0] * Math.sin(turn) + along[1] * Math.cos(turn),
    ];
    return [add(root, scale(turned, upper)), add(root, scale(along, reach))];
}

/** The figure in `pose`: its parts placed, and its kit, in drawing order. */
export function drawFigure(pose: Pose, motion: ExerciseMotion): FigureLayers {
    const view = VIEWS[motion.view];
    const art = FIGURE_ART[motion.view];
    const side = motion.view === 'side';
    const props = motion.props ?? [];
    const up = dir(pose.torso);
    // Square to the torso: forwards from the side, to your right from the front
    const across: Point = [-up[1], up[0]];
    const shoulders = add(pose.hips, scale(up, BODY.torso));
    const sideOf = (point: Point, by: number): Point => add(point, scale(across, by));
    const bar = side ? add(sideOf(shoulders, -11), scale(up, -2)) : add(shoulders, scale(up, -2));
    const place = (name: PartName, at: Point, angle: number, mirror = false): PlacedPart => ({
        type: 'part',
        name,
        art: art[name],
        at,
        angle,
        mirror,
    });

    const far: FigureItem[] = [];
    const body: FigureItem[] = [];
    const near: FigureItem[] = [];
    // From the front nothing is behind, but the legs go under the torso and the arms over it
    const legLayer = side ? [near, far] : [body, body];
    const armLayer = side ? [near, far] : [near, near];
    // From the front the near limbs (on your left) are the far ones flipped, outer side out
    const flip = (index: 0 | 1) => !side && index === 0;

    // The lower part of each limb first, so the knee or elbow sits over it
    const drawLeg = (index: 0 | 1, into: FigureItem[]) => {
        const hip = sideOf(pose.hips, view.hipSpread * (index === 0 ? -1 : 1));
        const [knee, ankle] = solveLimb(hip, pose.legs[index], BODY.thigh, BODY.shin, bar);
        into.push(
            place('shin', knee, angleOf(knee, ankle), flip(index)),
            place('foot', ankle, pose.feet?.[index] ?? view.footAngle, flip(index)),
            place('thigh', hip, angleOf(hip, knee), flip(index))
        );
    };
    const drawArm = (index: 0 | 1, into: FigureItem[]) => {
        const root = add(
            sideOf(shoulders, view.shoulderSpread * (index === 0 ? -1 : 1)),
            scale(up, -4)
        );
        const [elbow, hand] = solveLimb(root, pose.arms[index], BODY.upperArm, BODY.forearm, bar);
        if (props.includes('dumbbells')) {
            // Seen end on, from the side or the front, in the hand
            into.push({ type: 'circle', at: hand, r: 7.5, tone: 'plate' });
        }
        into.push(
            place('forearm', elbow, angleOf(elbow, hand), flip(index)),
            place('upperArm', root, angleOf(root, elbow), flip(index))
        );
    };
    const barbell = props.includes('barbell-on-back');

    drawLeg(1, legLayer[1]);
    drawArm(1, armLayer[1]);
    drawLeg(0, legLayer[0]);
    if (barbell && side) {
        // Behind the body, as in front it would hide the head; the bar's end goes in front
        body.push({ type: 'circle', at: bar, r: 17, tone: 'plate' });
    }
    body.push(
        // Hanging from the shoulders, so the torso's drawing is the right way up
        place('torso', shoulders, pose.torso + 180),
        // Its drawing faces +x; from the side, flipped to face forwards
        place('head', add(shoulders, scale(up, -1)), pose.head ?? pose.torso, side)
    );
    if (barbell && !side) {
        // Across the shoulders, a plate at each end
        const plate = (by: number): PlacedProp => ({
            type: 'line',
            from: add(sideOf(bar, by), scale(up, 17)),
            to: add(sideOf(bar, by), scale(up, -17)),
            width: 7,
            tone: 'plate',
        });
        body.push(
            { type: 'line', from: sideOf(bar, -62), to: sideOf(bar, 62), width: 3.5, tone: 'bar' },
            plate(-52),
            plate(52)
        );
    }
    drawArm(0, armLayer[0]);
    if (barbell && side) {
        near.push({ type: 'circle', at: bar, r: 3, tone: 'bar' });
    }
    return { far, body, near };
}

/** The box around an item as drawn: [left, top, right, bottom]. */
export function itemBounds(item: FigureItem): readonly [number, number, number, number] {
    if (item.type === 'circle') {
        return [item.at[0] - item.r, item.at[1] - item.r, item.at[0] + item.r, item.at[1] + item.r];
    }
    if (item.type === 'line') {
        const half = item.width / 2;
        return [
            Math.min(item.from[0], item.to[0]) - half,
            Math.min(item.from[1], item.to[1]) - half,
            Math.max(item.from[0], item.to[0]) + half,
            Math.max(item.from[1], item.to[1]) + half,
        ];
    }
    const [left, top, right, bottom] = item.art.bounds;
    const corners = (
        [
            [left, top],
            [right, top],
            [right, bottom],
            [left, bottom],
        ] as const
    ).map((corner) => placePoint(item, corner));
    const xs = corners.map(([x]) => x);
    const ys = corners.map(([, y]) => y);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function lerpLimb(a: Limb, b: Limb, t: number): Limb {
    if ('angles' in a && 'angles' in b) {
        return { angles: [lerp(a.angles[0], b.angles[0], t), lerp(a.angles[1], b.angles[1], t)] };
    }
    if ('reach' in a && 'reach' in b) {
        if (a.reach === 'bar' || b.reach === 'bar') {
            return t < 0.5 ? a : b;
        }
        return { reach: lerpPoint(a.reach, b.reach, t), bend: a.bend };
    }
    // Given differently in the two positions, so it can't move smoothly between them
    return t < 0.5 ? a : b;
}

/** The pose `t` of the way (0 to 1) from `a` to `b`. */
export function lerpPose(a: Pose, b: Pose, t: number, view: MotionView): Pose {
    const footAngle = VIEWS[view].footAngle;
    const feetA = a.feet ?? [footAngle, footAngle];
    const feetB = b.feet ?? [footAngle, footAngle];
    return {
        hips: lerpPoint(a.hips, b.hips, t),
        torso: lerp(a.torso, b.torso, t),
        head: lerp(a.head ?? a.torso, b.head ?? b.torso, t),
        arms: [lerpLimb(a.arms[0], b.arms[0], t), lerpLimb(a.arms[1], b.arms[1], t)],
        legs: [lerpLimb(a.legs[0], b.legs[0], t), lerpLimb(a.legs[1], b.legs[1], t)],
        feet: [lerp(feetA[0], feetB[0], t), lerp(feetA[1], feetB[1], t)],
    };
}

/** How long one loop of the motion takes, in milliseconds. */
export const loopLength = (motion: ExerciseMotion) =>
    motion.frames.reduce((total, frame) => total + (frame.hold ?? 0) + frame.ms, 0);

/**
 * Where the figure is `elapsed` milliseconds into the loop: holding a position, or easing
 * in and out between two (as a body slows into each end of a rep).
 */
export function poseAt(motion: ExerciseMotion, elapsed: number): Pose {
    const frames = motion.frames;
    let time = elapsed % loopLength(motion);
    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const hold = frame.hold ?? 0;
        if (time < hold) {
            return frame.pose;
        }
        time -= hold;
        if (time < frame.ms) {
            const eased = (1 - Math.cos((Math.PI * time) / frame.ms)) / 2;
            return lerpPose(frame.pose, frames[(i + 1) % frames.length].pose, eased, motion.view);
        }
        time -= frame.ms;
    }
    return frames[0].pose;
}

/** The box around everything the motion draws, in all its positions, and the floor under it. */
export function motionBox(motion: ExerciseMotion): Box {
    let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, 0];
    // The key positions, and halfway between each, which an IK limb can swing out past
    const poses = motion.frames.flatMap((frame, i) => [
        frame.pose,
        lerpPose(frame.pose, motion.frames[(i + 1) % motion.frames.length].pose, 0.5, motion.view),
    ]);
    for (const pose of poses) {
        const layers = drawFigure(pose, motion);
        for (const item of [...layers.far, ...layers.body, ...layers.near]) {
            const [left, top, right, bottom] = itemBounds(item);
            minX = Math.min(minX, left);
            minY = Math.min(minY, top);
            maxX = Math.max(maxX, right);
            maxY = Math.max(maxY, bottom);
        }
    }
    const pad = 6;
    return {
        x: minX - pad,
        y: minY - pad,
        width: maxX - minX + 2 * pad,
        height: maxY - minY + 2 * pad,
    };
}
