import { MuscleGroup } from './exercise';

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
    headRadius: 11,
    neck: 7,
    torso: 52,
    upperArm: 30,
    /** From the elbow to the middle of the hand. */
    forearm: 30,
    thigh: 44,
    shin: 44,
} as const;

/** How the figure is drawn from each view. */
const VIEWS = {
    side: {
        /** Half the torso's depth or width, at the hips and at the shoulders. */
        hipHalf: 8,
        shoulderHalf: 9,
        /** How far from the middle each hip and shoulder joint is. */
        hipSpread: 0,
        shoulderSpread: 0,
        foot: 20,
        /** How far back of the ankle the heel is. */
        heel: 5,
        footAngle: 90,
    },
    front: {
        hipHalf: 12,
        shoulderHalf: 15,
        hipSpread: 9,
        shoulderSpread: 17,
        foot: 8,
        heel: 0,
        footAngle: 0,
    },
} as const;

/** How thick each part is drawn. */
const WIDTH = {
    neck: 8,
    upperArm: 10,
    forearm: 8,
    thigh: 15,
    shin: 11,
    foot: 7,
    handRadius: 4.5,
    /** The rounding added around the torso's outline. */
    torsoRound: 8,
} as const;

/** Which muscles each part holds, to shade it when one of them is worked. */
const PART_MUSCLES = {
    torso: ['chest', 'abs', 'obliques', 'traps', 'upper-back', 'lower-back'],
    neck: ['neck'],
    upperArm: ['shoulders', 'biceps', 'triceps'],
    forearm: ['forearms'],
    thigh: ['glutes', 'quads', 'hamstrings', 'abductors', 'adductors'],
    shin: ['calves', 'shins'],
} as const satisfies Record<string, readonly MuscleGroup[]>;

/** Body (not worked), worked, the ends (head, hands, feet) that are never shaded, or kit. */
export type Tone = 'body' | 'worked' | 'end' | 'prop';

export type Shape =
    | {
          readonly type: 'line';
          readonly from: Point;
          readonly to: Point;
          readonly width: number;
          readonly tone: Tone;
      }
    | { readonly type: 'circle'; readonly at: Point; readonly r: number; readonly tone: Tone }
    | {
          readonly type: 'polygon';
          readonly points: readonly Point[];
          readonly round: number;
          readonly tone: Tone;
      };

/** The figure's shapes in drawing order: behind it (far side), its body, then in front. */
export interface FigureLayers {
    readonly far: readonly Shape[];
    readonly body: readonly Shape[];
    readonly near: readonly Shape[];
}

export interface Box {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

const dir = (angle: number): Point => {
    const radians = (angle * Math.PI) / 180;
    return [Math.sin(radians), Math.cos(radians)];
};
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const scale = (a: Point, by: number): Point => [a[0] * by, a[1] * by];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPoint = (a: Point, b: Point, t: number): Point => [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
];

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

const worked = (part: keyof typeof PART_MUSCLES, muscles: readonly MuscleGroup[]): Tone =>
    PART_MUSCLES[part].some((muscle) => muscles.includes(muscle)) ? 'worked' : 'body';

/** The figure in `pose`, as shapes to draw, with the parts holding `muscles` shaded. */
export function drawFigure(
    pose: Pose,
    motion: ExerciseMotion,
    muscles: readonly MuscleGroup[]
): FigureLayers {
    const view = VIEWS[motion.view];
    const props = motion.props ?? [];
    const up = dir(pose.torso);
    // Square to the torso: forwards from the side, to your right from the front
    const across: Point = [-up[1], up[0]];
    const shoulders = add(pose.hips, scale(up, BODY.torso));
    const sideOf = (point: Point, by: number): Point => add(point, scale(across, by));
    const bar =
        motion.view === 'side'
            ? add(sideOf(shoulders, -11), scale(up, -2))
            : add(shoulders, scale(up, -2));

    const far: Shape[] = [];
    const body: Shape[] = [];
    const near: Shape[] = [];
    // From the front nothing is behind, but the legs go under the torso and the arms over it
    const legLayer = motion.view === 'side' ? [near, far] : [body, body];
    const armLayer = motion.view === 'side' ? [near, far] : [near, near];

    const drawLeg = (index: 0 | 1, into: Shape[]) => {
        const hip = sideOf(pose.hips, view.hipSpread * (index === 0 ? -1 : 1));
        const [knee, ankle] = solveLimb(hip, pose.legs[index], BODY.thigh, BODY.shin, bar);
        const foot = dir(pose.feet?.[index] ?? view.footAngle);
        into.push(
            {
                type: 'line',
                from: hip,
                to: knee,
                width: WIDTH.thigh,
                tone: worked('thigh', muscles),
            },
            {
                type: 'line',
                from: knee,
                to: ankle,
                width: WIDTH.shin,
                tone: worked('shin', muscles),
            },
            {
                type: 'line',
                from: add(ankle, scale(foot, -view.heel)),
                to: add(ankle, scale(foot, view.foot - view.heel)),
                width: WIDTH.foot,
                tone: 'end',
            }
        );
    };
    const drawArm = (index: 0 | 1, into: Shape[]) => {
        const root = add(
            sideOf(shoulders, view.shoulderSpread * (index === 0 ? -1 : 1)),
            scale(up, -4)
        );
        const [elbow, hand] = solveLimb(root, pose.arms[index], BODY.upperArm, BODY.forearm, bar);
        into.push(
            {
                type: 'line',
                from: root,
                to: elbow,
                width: WIDTH.upperArm,
                tone: worked('upperArm', muscles),
            },
            {
                type: 'line',
                from: elbow,
                to: hand,
                width: WIDTH.forearm,
                tone: worked('forearm', muscles),
            }
        );
        if (props.includes('dumbbells')) {
            // Seen end on, from the side or the front
            into.push({ type: 'circle', at: hand, r: 7, tone: 'prop' });
        }
        into.push({ type: 'circle', at: hand, r: WIDTH.handRadius, tone: 'end' });
    };
    const barbell = props.includes('barbell-on-back');
    // From the side, the plate goes behind the body (in front it would hide the head), with
    // the bar's end in front
    const drawPlate = () => body.push({ type: 'circle', at: bar, r: 17, tone: 'prop' });
    const drawBarEnd = () => near.push({ type: 'circle', at: bar, r: 3, tone: 'end' });
    // From the front, the bar across the shoulders with a plate at each end
    const drawFrontBarbell = () => {
        const plate = (by: number): Shape => ({
            type: 'line',
            from: add(sideOf(bar, by), scale(up, 17)),
            to: add(sideOf(bar, by), scale(up, -17)),
            width: 7,
            tone: 'prop',
        });
        body.push(
            { type: 'line', from: sideOf(bar, -62), to: sideOf(bar, 62), width: 3.5, tone: 'end' },
            plate(-52),
            plate(52)
        );
    };

    drawLeg(1, legLayer[1]);
    drawArm(1, armLayer[1]);
    drawLeg(0, legLayer[0]);
    if (barbell && motion.view === 'side') {
        drawPlate();
    }

    const head = dir(pose.head ?? pose.torso);
    body.push(
        {
            type: 'polygon',
            points: [
                sideOf(pose.hips, -view.hipHalf),
                sideOf(pose.hips, view.hipHalf),
                sideOf(shoulders, view.shoulderHalf),
                sideOf(shoulders, -view.shoulderHalf),
            ],
            round: WIDTH.torsoRound,
            tone: worked('torso', muscles),
        },
        {
            type: 'line',
            from: add(shoulders, scale(up, -2)),
            to: add(shoulders, scale(head, BODY.neck)),
            width: WIDTH.neck,
            tone: worked('neck', muscles),
        },
        {
            type: 'circle',
            at: add(shoulders, scale(head, BODY.neck + BODY.headRadius - 2)),
            r: BODY.headRadius,
            tone: 'end',
        }
    );

    if (barbell && motion.view === 'front') {
        drawFrontBarbell();
    }
    drawArm(0, armLayer[0]);
    if (barbell && motion.view === 'side') {
        drawBarEnd();
    }
    return { far, body, near };
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
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = 0;
    const grow = ([x, y]: Point, by: number) => {
        minX = Math.min(minX, x - by);
        maxX = Math.max(maxX, x + by);
        minY = Math.min(minY, y - by);
        maxY = Math.max(maxY, y + by);
    };
    // The key positions, and halfway between each, which an IK limb can swing out past
    const poses = motion.frames.flatMap((frame, i) => [
        frame.pose,
        lerpPose(frame.pose, motion.frames[(i + 1) % motion.frames.length].pose, 0.5, motion.view),
    ]);
    for (const pose of poses) {
        const layers = drawFigure(pose, motion, []);
        for (const shape of [...layers.far, ...layers.body, ...layers.near]) {
            if (shape.type === 'line') {
                grow(shape.from, shape.width / 2);
                grow(shape.to, shape.width / 2);
            } else if (shape.type === 'circle') {
                grow(shape.at, shape.r);
            } else {
                shape.points.forEach((point) => grow(point, shape.round / 2));
            }
        }
    }
    const pad = 8;
    return {
        x: minX - pad,
        y: minY - pad,
        width: maxX - minX + 2 * pad,
        height: Math.max(maxY, 0) - minY + 2 * pad,
    };
}
