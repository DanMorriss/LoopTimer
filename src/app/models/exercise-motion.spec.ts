import { BUILT_IN_EXERCISE_MOTION } from './built-in-exercise-motion';
import { BUILT_IN_EXERCISES } from './built-in-exercises';
import {
    BODY,
    drawFigure,
    ExerciseMotion,
    Limb,
    loopLength,
    motionBox,
    Point,
    Pose,
    poseAt,
    Shape,
    solveLimb,
} from './exercise-motion';

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const noBar: Point = [0, 0];

const standing: Pose = {
    hips: [0, -92],
    torso: 180,
    arms: [{ angles: [0, 0] }, { angles: [0, 0] }],
    legs: [
        { reach: [0, -4], bend: 'ccw' },
        { reach: [0, -4], bend: 'ccw' },
    ],
};
const squatting: Pose = { ...standing, hips: [-20, -50], torso: 140 };
const squat: ExerciseMotion = {
    view: 'side',
    frames: [
        { label: 'Standing', pose: standing, hold: 200, ms: 1000 },
        { label: 'Bottom', pose: squatting, ms: 800 },
    ],
};

describe('solveLimb', () => {
    it('lays the parts along their angles', () => {
        const [elbow, hand] = solveLimb([0, 0], { angles: [90, 180] }, 30, 30, noBar);

        expect(elbow[0]).toBeCloseTo(30);
        expect(elbow[1]).toBeCloseTo(0);
        expect(hand[0]).toBeCloseTo(30);
        expect(hand[1]).toBeCloseTo(-30);
    });

    it('reaches where the end should be, keeping both parts their length', () => {
        const [knee, ankle] = solveLimb([0, -60], { reach: [20, 0], bend: 'ccw' }, 44, 44, noBar);

        expect(ankle[0]).toBeCloseTo(20);
        expect(ankle[1]).toBeCloseTo(0);
        expect(distance([0, -60], knee)).toBeCloseTo(44);
        expect(distance(knee, ankle)).toBeCloseTo(44);
    });

    it('bends the middle joint the way it is told', () => {
        // Hip above the ankle: anticlockwise as drawn puts the knee in front (to the right)
        const forward: Limb = { reach: [0, 0], bend: 'ccw' };
        const back: Limb = { reach: [0, 0], bend: 'cw' };

        expect(solveLimb([0, -70], forward, 44, 44, noBar)[0][0]).toBeGreaterThan(0);
        expect(solveLimb([0, -70], back, 44, 44, noBar)[0][0]).toBeLessThan(0);
    });

    it('stretches straight towards an end out of reach', () => {
        const [knee, ankle] = solveLimb([0, -200], { reach: [0, 0], bend: 'ccw' }, 44, 44, noBar);

        expect(knee[0]).toBeCloseTo(0);
        expect(knee[1]).toBeCloseTo(-156);
        expect(ankle[1]).toBeCloseTo(-112);
    });

    it("puts the hand on the bar for 'bar'", () => {
        const [, hand] = solveLimb([0, 0], { reach: 'bar', bend: 'ccw' }, 30, 30, [-10, -5]);

        expect(hand[0]).toBeCloseTo(-10);
        expect(hand[1]).toBeCloseTo(-5);
    });
});

describe('poseAt', () => {
    it('holds the first position, then eases into the next and back, in a loop', () => {
        expect(loopLength(squat)).toBe(2000);
        expect(poseAt(squat, 100)).toBe(standing);
        expect(poseAt(squat, 200).hips).toEqual(standing.hips);
        expect(poseAt(squat, 1200).hips[1]).toBeCloseTo(-50);
        // Halfway through the move, halfway between
        expect(poseAt(squat, 700).hips[1]).toBeCloseTo(-71);
        expect(poseAt(squat, 700).torso).toBeCloseTo(160);
        // Eased: slow at the start of a move
        expect(poseAt(squat, 300).hips[1]).toBeGreaterThan(-93);
        expect(poseAt(squat, 2100)).toBe(standing);
    });
});

describe('drawFigure', () => {
    const tonesOf = (shapes: readonly Shape[]) => shapes.map((shape) => shape.tone);

    it('shades the parts holding the worked muscles, and never the head, hands and feet', () => {
        const layers = drawFigure(standing, squat, ['quads']);
        const all = [...layers.far, ...layers.body, ...layers.near];

        // A thigh each side
        expect(tonesOf(all).filter((tone) => tone === 'worked')).toHaveLength(2);
        expect(tonesOf(all)).toContain('end');
        expect(tonesOf(drawFigure(standing, squat, []).near)).not.toContain('worked');
    });

    it('puts the far arm and leg behind the body from the side, and nothing from the front', () => {
        expect(drawFigure(standing, squat, []).far.length).toBeGreaterThan(0);
        expect(drawFigure(standing, { ...squat, view: 'front' }, []).far).toHaveLength(0);
    });

    it('draws its props', () => {
        const props = (motion: ExerciseMotion) => {
            const layers = drawFigure(standing, motion, []);
            return tonesOf([...layers.far, ...layers.body, ...layers.near]).filter(
                (tone) => tone === 'prop'
            ).length;
        };

        expect(props(squat)).toBe(0);
        expect(props({ ...squat, props: ['dumbbells'] })).toBe(2);
        expect(props({ ...squat, props: ['barbell-on-back'] })).toBe(1);
    });
});

describe('motionBox', () => {
    it('holds the figure in every position, and the floor', () => {
        const box = motionBox(squat);
        const head = BODY.torso + BODY.neck + 2 * BODY.headRadius;

        expect(box.y).toBeLessThan(standing.hips[1] - head);
        expect(box.y + box.height).toBeGreaterThan(0);
    });
});

describe('BUILT_IN_EXERCISE_MOTION', () => {
    const motions = Object.entries(BUILT_IN_EXERCISE_MOTION) as [string, ExerciseMotion][];
    const kindOf = (limb: Limb) =>
        'angles' in limb ? 'angles' : limb.reach === 'bar' ? 'bar' : `reach ${limb.bend}`;

    it.each(motions)('%s is a built-in exercise', (id) => {
        expect(BUILT_IN_EXERCISES.some((exercise) => exercise.id === id)).toBe(true);
    });

    it.each(motions)('%s moves between labelled positions', (_, motion) => {
        expect(motion.frames.length).toBeGreaterThanOrEqual(2);
        for (const frame of motion.frames) {
            expect(frame.label.trim()).not.toBe('');
            expect(frame.ms).toBeGreaterThan(0);
        }
    });

    it.each(motions)(
        '%s gives each limb the same way in every position, so it moves smoothly',
        (_, motion) => {
            const first = motion.frames[0].pose;
            for (const { pose } of motion.frames) {
                for (const limbs of ['arms', 'legs'] as const) {
                    expect(pose[limbs].map(kindOf)).toEqual(first[limbs].map(kindOf));
                }
                expect(pose.feet === undefined).toBe(first.feet === undefined);
            }
        }
    );

    it.each(motions)('%s keeps the figure on the floor, not through it', (_, motion) => {
        const steps = 40;
        for (let i = 0; i < steps; i++) {
            const pose = poseAt(motion, (loopLength(motion) * i) / steps);
            const layers = drawFigure(pose, motion, []);
            for (const shape of [...layers.far, ...layers.body, ...layers.near]) {
                const lowest =
                    shape.type === 'line'
                        ? Math.max(shape.from[1], shape.to[1]) + shape.width / 2
                        : shape.type === 'circle'
                          ? shape.at[1] + shape.r
                          : Math.max(...shape.points.map(([, y]) => y)) + shape.round / 2;
                // A shin's rounded end can tuck a little under the floor, behind the foot
                expect(lowest).toBeLessThan(2);
            }
        }
    });
});
