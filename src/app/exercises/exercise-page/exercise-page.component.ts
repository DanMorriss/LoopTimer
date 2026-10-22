import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { BodyMapComponent } from '../../shared/components/body-map/body-map.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ExerciseEditorComponent } from '../../shared/components/exercise-editor/exercise-editor.component';
import { capitalise, equipmentPhrases, isBuiltIn } from '../../models/exercise';
import { exerciseUsage } from '../../models/exercise-links';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';

/** What Delete leads to: a question to confirm, or why it can't be done. */
type DeleteStep = 'confirm-delete' | 'confirm-hide' | 'in-use' | null;

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
        BodyMapComponent,
        ConfirmDialogComponent,
        ExerciseEditorComponent,
    ],
    templateUrl: './exercise-page.component.html',
    styleUrl: './exercise-page.component.scss',
})
export class ExercisePageComponent {
    private readonly exercises = inject(ExerciseStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly history = inject(HistoryStore);
    private readonly router = inject(Router);

    private readonly param = toSignal(
        inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? '')),
        { initialValue: '' }
    );

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
    protected readonly equipment = computed(() =>
        equipmentPhrases(this.exercise()?.equipment ?? []).map(capitalise)
    );
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
    protected readonly deleteStep = signal<DeleteStep>(null);

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

    /** Deleting your own exercise: asks first, or says why it can't be deleted. */
    protected askToDelete() {
        const usage = this.usage();
        if (usage.workouts.length > 0) {
            this.deleteStep.set('in-use');
        } else {
            this.deleteStep.set(usage.inHistory ? 'confirm-hide' : 'confirm-delete');
        }
    }

    protected cancelDelete() {
        this.deleteStep.set(null);
        document.getElementById('exercise-page-delete')?.focus();
    }

    protected confirmDelete() {
        const exercise = this.exercise();
        this.deleteStep.set(null);
        if (!exercise) {
            return;
        }
        this.exercises.deleteOwn(exercise.id);
        void this.router.navigateByUrl('/exercises');
    }

    /** With history, it's hidden instead, so the history still has its name. */
    protected confirmHide() {
        const exercise = this.exercise();
        this.deleteStep.set(null);
        if (exercise) {
            this.exercises.setHidden(exercise.id, true);
        }
        document.getElementById('exercise-page-hide')?.focus();
    }
}
