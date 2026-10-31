import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DueTodayComponent } from './due-today/due-today.component';
import { MusclesThisWeekComponent } from '../history/muscles-this-week/muscles-this-week.component';
import { SuggestedWorkoutComponent } from '../history/suggested-workout/suggested-workout.component';
import { HistoryStore } from '../shared/state/history-store.service';

/**
 * Where the app opens: the weekly plan's workouts due today (PLN-2), the workout to do next
 * (PRG-9) once none are, and the muscles worked this week (PRG-6, PRG-8), the same cards as the
 * history page's. Before any workout, a way to the library instead.
 */
@Component({
    selector: 'app-home',
    imports: [DueTodayComponent, MusclesThisWeekComponent, RouterLink, SuggestedWorkoutComponent],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss',
})
export class HomeComponent {
    private readonly history = inject(HistoryStore);

    protected readonly hasHistory = computed(() => this.history.entries().length > 0);
}
