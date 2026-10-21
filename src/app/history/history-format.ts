import { HistoryEntry, LoggedSet } from '../models/history';
import { WeightUnit, weightIn } from '../models/weight';

/** e.g. 75 → "1:15", 3725 → "1:02:05" */
export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** e.g. "3 rounds", "2 of 5 rounds · stopped", "12 rounds · until stopped" */
export function describeRounds(entry: HistoryEntry): string {
    const rounds = (n: number) => `${n} ${n === 1 ? 'round' : 'rounds'}`;
    if (entry.totalRounds === 0) {
        return `${rounds(entry.roundsCompleted)} · until stopped`;
    }
    if (entry.outcome === 'stopped') {
        return `${entry.roundsCompleted} of ${rounds(entry.totalRounds)} · stopped`;
    }
    return rounds(entry.roundsCompleted);
}

/** The timer's title as it ran, or "Untitled timer". */
export function entryName(entry: HistoryEntry): string {
    return entry.title.trim() || 'Untitled timer';
}

/** One rep step's sets, summed up: e.g. "3 × 10 @ 60 kg", with what screen readers say. */
export interface SetsSummary {
    /** The step's name, or "Reps". */
    name: string;
    text: string;
    spoken: string;
}

/**
 * A workout's sets, one line per rep step, in the order the steps first came:
 *
 * - "3 × 10 @ 60 kg": the same reps and weight every set
 * - "10, 10, 8 @ 60 kg": the reps changed, the weight didn't
 * - "10 @ 60, 8 @ 62.5 kg": the weight changed
 * - "3 × 20": no weight
 */
export function describeSets(sets: readonly LoggedSet[], unit: WeightUnit): SetsSummary[] {
    const byStep = new Map<number, LoggedSet[]>();
    for (const set of sets) {
        byStep.set(set.step, [...(byStep.get(set.step) ?? []), set]);
    }
    return Array.from(byStep.values(), (stepSets) => {
        const weights = stepSets.map((set) => (set.weight ? weightIn(set.weight, unit) : 0));
        const reps = stepSets.map((set) => set.reps);
        const sameWeight = weights.every((w) => w === weights[0]);
        const sameReps = reps.every((r) => r === reps[0]);
        return {
            name: stepSets.at(-1)!.name || 'Reps',
            text: sameWeight
                ? `${repsText(reps, sameReps)}${weights[0] ? ` @ ${weights[0]} ${unit}` : ''}`
                : `${stepSets.map((_, i) => setText(reps[i], weights[i])).join(', ')} ${unit}`,
            spoken: sameWeight
                ? `${spokenReps(reps, sameReps)}${weights[0] ? ` at ${weights[0]} ${unit}` : ''}`
                : stepSets
                      .map(
                          (_, i) =>
                              `${reps[i]} reps${weights[i] ? ` at ${weights[i]} ${unit}` : ''}`
                      )
                      .join(', '),
        };
    });
}

// e.g. "3 × 10", "10, 10, 8" or just "10 reps" for one set
function repsText(reps: number[], same: boolean): string {
    if (reps.length === 1) {
        return `${reps[0]} reps`;
    }
    return same ? `${reps.length} × ${reps[0]}` : reps.join(', ');
}

function spokenReps(reps: number[], same: boolean): string {
    if (reps.length === 1) {
        return `${reps[0]} reps`;
    }
    return same ? `${reps.length} sets of ${reps[0]} reps` : `sets of ${reps.join(', ')} reps`;
}

// One set where the weight changed, e.g. "10 @ 60", or "10" with none
function setText(reps: number, weight: number): string {
    return weight ? `${reps} @ ${weight}` : String(reps);
}
