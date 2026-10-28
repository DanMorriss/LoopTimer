import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MusclesThisWeekComponent } from '../history/muscles-this-week/muscles-this-week.component';
import { SuggestedWorkoutComponent } from '../history/suggested-workout/suggested-workout.component';
import { LoopLogoComponent } from '../shared/components/loop-logo/loop-logo.component';
import { HistoryStore } from '../shared/state/history-store.service';

/**
 * Where the app opens: the ∞ logo, the workout to do next (PRG-9) and the muscles worked this
 * week (PRG-6, PRG-8), the same cards as the history page's. Before any workout, a way to the
 * library instead.
 */
@Component({
    selector: 'app-home',
    imports: [LoopLogoComponent, MusclesThisWeekComponent, RouterLink, SuggestedWorkoutComponent],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss',
})
export class HomeComponent {
    private readonly history = inject(HistoryStore);

    protected readonly hasHistory = computed(() => this.history.entries().length > 0);
}
