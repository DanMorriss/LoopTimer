import {
    afterNextRender,
    Component,
    computed,
    ElementRef,
    inject,
    Injector,
    signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Workout } from '../models/workout';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';
import { WorkoutCardComponent } from './workout-card/workout-card.component';
import { ActiveRunService } from '../shared/run/active-run.service';
import { WorkoutStore } from '../shared/state/workout-store.service';

@Component({
    selector: 'app-workout-library',
    templateUrl: './workout-library.component.html',
    styleUrl: './workout-library.component.scss',
    imports: [ConfirmDialogComponent, WorkoutCardComponent, MatIconModule],
})
export class WorkoutLibraryComponent {
    workoutStore = inject(WorkoutStore);
    router = inject(Router);
    private readonly run = inject(ActiveRunService);
    private host = inject<ElementRef<HTMLElement>>(ElementRef);
    private injector = inject(Injector);
    protected workoutPendingDelete = signal<Workout | null>(null);
    protected activeWorkoutCardId = signal<string | null>(null);
    protected openWorkoutMenuId = signal<string | null>(null);

    protected isExistingWorkouts = computed(() => this.workoutStore.workouts().length > 0);

    requestDelete(workout: Workout) {
        this.activeWorkoutCardId.set(null);
        this.openWorkoutMenuId.set(null);
        this.workoutPendingDelete.set(workout);
    }

    cancelDelete() {
        const workout = this.workoutPendingDelete();
        this.workoutPendingDelete.set(null);
        if (workout) {
            this.focusAfterRender(`[data-menu-for="${workout.id}"]`);
        }
    }

    confirmDelete() {
        const workout = this.workoutPendingDelete();
        if (!workout) {
            return;
        }

        this.workoutStore.deleteWorkout(workout.id);
        this.workoutPendingDelete.set(null);
        this.activeWorkoutCardId.set(null);
        this.openWorkoutMenuId.set(null);
        // "Add workout" goes once the library is empty, and "Create a workout" takes its place
        this.focusAfterRender(
            this.workoutStore.workouts().length ? '.library-add-button' : '.library-create-button'
        );
    }

    setActiveWorkoutCard(workoutId: string) {
        this.activeWorkoutCardId.set(workoutId);
    }

    clearActiveWorkoutCard() {
        this.activeWorkoutCardId.set(null);
        this.openWorkoutMenuId.set(null);
    }

    toggleWorkoutMenu(workoutId: string) {
        this.activeWorkoutCardId.set(workoutId);
        this.openWorkoutMenuId.update((currentMenuId) =>
            currentMenuId === workoutId ? null : workoutId
        );
    }

    closeWorkoutMenu(workoutId: string) {
        if (this.openWorkoutMenuId() !== workoutId) {
            return;
        }
        this.openWorkoutMenuId.set(null);
        this.focusAfterRender(`[data-menu-for="${workoutId}"]`);
    }

    // The element that had focus is removed when a menu or dialog closes,
    // so move focus somewhere sensible instead of losing it to the page
    private focusAfterRender(selector: string) {
        afterNextRender(
            () => {
                this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
            },
            { injector: this.injector }
        );
    }

    startWorkout(workout: Workout) {
        this.run.start(workout);
        this.router.navigate(['/workout']);
    }

    navigateToCreateWorkout() {
        this.router.navigate(['/setup']);
    }

    navigateToEditWorkout(workoutId: string) {
        this.openWorkoutMenuId.set(null);
        this.activeWorkoutCardId.set(null);
        this.router.navigate(['/setup'], { queryParams: { editId: workoutId } });
    }
}
