import { BUILT_IN_EXERCISES } from '../../models/built-in-exercises';
import { BACKUP_VERSION, readBackup } from './backup-file';
import { planPrompt } from './plan-prompt';

describe('planPrompt', () => {
    const prompt = planPrompt();

    it('asks for a file of the version this app reads', () => {
        expect(prompt).toContain(`"version": always ${BACKUP_VERSION}`);
    });

    it('lists every built-in exercise by name', () => {
        for (const exercise of BUILT_IN_EXERCISES) {
            expect(prompt).toContain(exercise.name);
        }
    });

    it('gives an example that imports cleanly', () => {
        const example = prompt.slice(
            prompt.indexOf('AN EXAMPLE\n') + 'AN EXAMPLE\n'.length,
            prompt.indexOf('\n\nIf anything')
        );

        const result = readBackup(example);

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.newWorkouts).toHaveLength(1);
        // Sets as groups: 3 × 8 squats with 90 seconds between
        expect(result.newWorkouts[0].blocks[1]).toEqual(
            expect.objectContaining({ kind: 'group', rounds: 3, restSeconds: 90 })
        );
        expect(result.exercises).toHaveLength(1);
        expect(result.skipped).toBe(0);
    });

    it('ends ready for the plan to be pasted after it', () => {
        expect(prompt.endsWith('MY PLAN\n')).toBe(true);
    });
});
