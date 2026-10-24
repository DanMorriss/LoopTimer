import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ExerciseDetailsComponent } from '../../shared/components/exercise-details/exercise-details.component';
import { ExerciseEditorComponent } from '../../shared/components/exercise-editor/exercise-editor.component';
import { ExerciseProgressComponent } from './exercise-progress/exercise-progress.component';
import { Exercise, exercisePath, isBuiltIn } from '../../models/exercise';
import { exerciseUsage } from '../../models/exercise-links';
import { parseMusclesParam, serialiseMusclesParam } from '../muscle-filter-query';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { UndoService } from '../../shared/undo/undo.service';

/**
 * One exercise (EXR-7, EXR-8): what it needs, its description and your note on it, the
 * muscles it works on the body map, then how to do it and tips. A built-in one takes a note;
 * your own can be edited. Either can be hidden from the picker, and your own deleted unless a
 * workout uses it (one with history is hidden instead, so its history keeps its name).
 *
 * Built-in exercises are at /exercises/<name>, e.g. /exercises/back-squat, and your own at
 * /exercises/<id>.
 */
@Component({
    selector: 'app-exercise-page',
    imports: [
        MatIconModule,
        RouterLink,
        ExerciseDetailsComponent,
        ExerciseEditorComponent,
        ExerciseProgressComponent,
    ],
    templateUrl: './exercise-page.component.html',
    styleUrl: './exercise-page.component.scss',
})
export class ExercisePageComponent {
    private readonly exercises = inject(ExerciseStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly history = inject(HistoryStore);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    private readonly param = toSignal(
        this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
        { initialValue: '' }
    );
    /** The Exercises list's muscle filter, from the link here, to go back to. */
    private readonly musclesQuery = serialiseMusclesParam(
        parseMusclesParam(this.route.snapshot.queryParamMap.get('muscles'))
    );
    protected readonly backQueryParams = this.musclesQuery ? { muscles: this.musclesQuery } : {};

    protected readonly exercise = computed(
        () =>
            this.exercises.byId(`builtin:${this.param()}`) ??
            // Not a built-in one's own id, so a link can't skip the /exercises/<name> form
            (this.param().startsWith('builtin:') ? undefined : this.exercises.byId(this.param()))
    );
    protected readonly builtIn = computed(() => {
        const exercise = this.exercise();
        return exercise !== undefined && isBuiltIn(exercise);
    });
    protected readonly note = computed(() => {
        const exercise = this.exercise();
        return exercise ? this.exercises.noteFor(exercise.id) : undefined;
    });
    protected readonly hidden = computed(() => {
        const exercise = this.exercise();
        return exercise !== undefined && this.exercises.isHidden(exercise.id);
    });
    protected readonly usage = computed(() =>
        exerciseUsage(
            this.exercise()?.id ?? '',
            this.workouts.workouts(),
            this.history.entries(),
            this.workouts.activeWorkout()
        )
    );
    /** The workouts that use it, by name, e.g. "Leg day and an untitled workout". */
    protected readonly usedIn = computed(() => {
        const names = this.usage().workouts.map((w) => w.title.trim() || 'an untitled workout');
        return names.length <= 2
            ? names.join(' and ')
            : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
    });

    protected readonly editing = signal(false);
    /** Delete was pressed while a workout uses it, so it says why it can't be deleted. */
    protected readonly inUse = signal(false);
    private readonly undo = inject(UndoService);

    protected openEditor() {
        this.editing.set(true);
    }

    protected closeEditor() {
        this.editing.set(false);
        document.getElementById('exercise-page-edit')?.focus();
    }

    protected toggleHidden() {
        const exercise = this.exercise();
        if (exercise) {
            this.exercises.setHidden(exercise.id, !this.hidden());
        }
    }

    /**
     * Deletes your own exercise straight away and offers to put it back (UndoService), rather
     * than asking first; or says why it can't be deleted, if a workout uses it. One with
     * history is hidden instead, so the history still has its name.
     */
    protected delete() {
        const exercise = this.exercise();
        if (!exercise || isBuiltIn(exercise)) {
            return;
        }
        const usage = this.usage();
        this.inUse.set(usage.workouts.length > 0);
        if (this.inUse()) {
            return;
        }
        if (usage.inHistory) {
            this.hideInstead(exercise);
            return;
        }
        // As it was, to put back on Undo: your note on it, and whether it was hidden
        const note = this.note();
        const hidden = this.hidden();
        this.exercises.deleteOwn(exercise.id);
        void this.router.navigate(['/exercises'], { queryParams: this.backQueryParams }).then(() =>
            this.undo.offerUndo({
                message: `Deleted ${exercise.name}`,
                // Back as it was, and back on its page, where it was deleted from
                undo: () => {
                    this.exercises.restoreOwn(exercise, note, hidden);
                    void this.router.navigateByUrl(exercisePath(exercise));
                },
            })
        );
    }

    /** It's in the history: hidden from the picker instead, with Undo. */
    private hideInstead(exercise: Exercise) {
        const wasHidden = this.hidden();
        this.exercises.setHidden(exercise.id, true);
        this.undo.offerUndo({
            message: `${exercise.name} is in your history, so it's hidden from the picker instead`,
            undo: () => {
                this.exercises.setHidden(exercise.id, wasHidden);
                document.getElementById('exercise-page-delete')?.focus();
            },
            dismissed: () => document.getElementById('exercise-page-hide')?.focus(),
        });
    }
}
