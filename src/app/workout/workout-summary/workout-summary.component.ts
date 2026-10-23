import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, computed, inject, linkedSignal, output, signal } from '@angular/core';
import { form, FormField, maxLength } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { isBuiltIn } from '../../models/exercise';
import { MAX_NOTE_LENGTH, RepSet } from '../../models/history';
import { exerciseBests, sessionsByExercise } from '../../models/progress';
import { MAX_REPS } from '../../models/workout';
import { weightIn, weightOptions, weightToKg } from '../../models/weight';
import { WheelPickerComponent } from '../../shared/components/wheel-picker/wheel-picker.component';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import {
    describeRounds,
    describeSets,
    entryName,
    formatDuration,
} from '../../history/history-format';
import { bestLines } from '../../exercises/progress-format';

/** One rep step's sets, for correcting them one by one. */
interface SetGroup {
    name: string;
    /** Each set, with where it is in the run's list of sets. */
    sets: { index: number; set: RepSet }[];
}

/**
 * How the workout went, once it's finished or ended with End workout: the time, rounds and
 * sets, which can be corrected, and a note. A workout ended early (or one that runs until
 * stopped) can be taken up again with Back to workout; the run waits, paused, until then.
 * Focus starts on the heading and is trapped inside while it's open.
 */
@Component({
    selector: 'app-workout-summary',
    imports: [CdkTrapFocus, FormField, MatIconModule, WheelPickerComponent],
    templateUrl: './workout-summary.component.html',
    styleUrl: './workout-summary.component.scss',
})
export class WorkoutSummaryComponent {
    private readonly run = inject(ActiveRunService);
    private readonly store = inject(WorkoutStore);
    private readonly history = inject(HistoryStore);
    private readonly settings = inject(SettingsStore);
    private readonly exercises = inject(ExerciseStore);

    /** Back to workout: the run carries on from where it was ended. */
    readonly back = output<void>();
    /** Done: the run is over, on to the library. */
    readonly done = output<void>();
    /** View history: the run is over, on to it in the history. */
    readonly viewHistory = output<void>();

    protected readonly finished = this.run.isComplete;
    /** This run in the history; missing when it ended before its first step was done. */
    protected readonly entry = computed(() => {
        const id = this.run.runId();
        return this.history.entries().find((entry) => entry.id === id);
    });
    protected readonly title = computed(() => {
        const entry = this.entry();
        return entry ? entryName(entry) : (this.run.workout()?.title.trim() ?? '');
    });
    protected readonly duration = computed(() => formatDuration(this.entry()?.activeSeconds ?? 0));
    protected readonly rounds = computed(() => {
        const entry = this.entry();
        return entry ? describeRounds(entry) : '';
    });

    protected readonly weightUnit = this.settings.weightUnit;
    private readonly exerciseName = (id: string) => {
        // Built-in names never change, so a set keeps the name it ran with, e.g. "Squats"
        const exercise = this.exercises.byId(id);
        return exercise && !isBuiltIn(exercise) ? exercise.name : undefined;
    };
    /** Its sets, one line per step, e.g. "Squats: 10, 10, 8 @ 60 kg" or "Plank: 3 × 0:45". */
    protected readonly setLines = computed(() =>
        describeSets(this.run.sets(), this.weightUnit(), this.exerciseName)
    );
    protected readonly personalBests = computed(() => {
        const entry = this.entry();
        if (!entry || !entry.sets?.length) {
            return [] as string[];
        }
        const previous = this.history
            .entries()
            .filter((other) => other.id !== entry.id)
            .map((other) => ({ ...other, sets: other.sets ?? [] }));
        const byExercise = sessionsByExercise(previous);
        const exerciseIds = new Set(
            entry.sets.filter((set) => set.exerciseId !== undefined).map((set) => set.exerciseId!)
        );
        const lines: string[] = [];

        for (const exerciseId of exerciseIds) {
            const before = byExercise.get(exerciseId) ?? [];
            const after = [
                ...before,
                {
                    entryId: entry.id,
                    startedAt: entry.startedAt,
                    title: entry.title,
                    sets: entry.sets.filter((set) => set.exerciseId === exerciseId),
                },
            ];
            const current = bestLines(exerciseBests(after), this.weightUnit());
            for (const line of current) {
                if (line.at === entry.startedAt) {
                    lines.push(`${line.label}: ${line.text}`);
                }
            }
        }

        return lines;
    });

    // Correcting the rep sets, e.g. the last one was 8 reps, not 10. Timed ones ran as set.
    protected readonly changingSets = signal(false);
    protected readonly setGroups = computed((): SetGroup[] => {
        const groups = new Map<number, SetGroup>();
        this.store.activeSets().forEach((set, index) => {
            const group = groups.get(set.step) ?? { name: '', sets: [] };
            group.sets.push({ index, set });
            groups.set(set.step, group);
        });
        // Named as its line is
        return Array.from(groups.values(), (group) => ({
            ...group,
            name: describeSets(
                group.sets.map((item) => item.set),
                this.weightUnit(),
                this.exerciseName
            )[0].name,
        }));
    });
    protected readonly repOptions = Array.from({ length: MAX_REPS }, (_, i) => ({
        value: i + 1,
        label: String(i + 1),
    }));
    protected readonly weightOptions = computed(() => weightOptions(this.weightUnit()));
    protected weightValue(set: RepSet): number {
        return set.weight ? weightIn(set.weight, this.weightUnit()) : 0;
    }

    /** null until a set is changed; then asks whether to start from them next time. */
    protected readonly nextTime = signal<'asking' | 'yes' | 'no' | null>(null);

    // The note box starts from the saved note
    private readonly noteModel = linkedSignal(() => ({ note: this.entry()?.note ?? '' }));
    protected readonly noteForm = form(this.noteModel, (note) =>
        maxLength(note.note, MAX_NOTE_LENGTH)
    );

    protected setReps(index: number, reps: number) {
        if (this.store.activeSets()[index]?.reps === reps) {
            return;
        }
        this.run.changeSet(index, { reps });
        this.nextTime.set('asking');
    }

    protected setWeight(index: number, value: number) {
        const weight = value > 0 ? weightToKg(value, this.weightUnit()) : undefined;
        if (this.store.activeSets()[index]?.weight === weight) {
            return;
        }
        this.run.changeSet(index, { weight });
        this.nextTime.set('asking');
    }

    protected answerNextTime(use: boolean) {
        if (use) {
            this.run.useSetsNextTime();
        }
        this.nextTime.set(use ? 'yes' : 'no');
    }

    /** Saves the note as it is, e.g. on leaving the box or the summary. */
    protected saveNote() {
        const id = this.entry()?.id;
        const note = this.noteModel().note;
        if (id && !this.noteForm().invalid() && note.trim() !== (this.entry()?.note ?? '')) {
            this.history.setNote(id, note);
        }
    }

    protected leave(to: 'back' | 'done' | 'viewHistory') {
        this.saveNote();
        this[to].emit();
    }

    /** Escape goes back to the workout, where there's one to go back to. */
    protected onEscape(event: Event) {
        event.stopPropagation();
        if (!this.finished()) {
            this.leave('back');
        }
    }
}
