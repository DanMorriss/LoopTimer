import { inject } from '@angular/core';
import { CanActivateFn, Routes } from '@angular/router';
import { HistoryStore } from './shared/state/history-store.service';

// Pages that read the history wait for it to load, so they don't show it empty at first
const historyLoaded: CanActivateFn = () => inject(HistoryStore).ready.then(() => true);

export const routes: Routes = [
    {
        path: 'home',
        loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
    },
    { path: '', pathMatch: 'full', redirectTo: 'home' },
    {
        path: 'setup',
        loadComponent: () =>
            import('./workout-setup/workout-setup.component').then((m) => m.WorkoutSetupComponent),
    },
    {
        path: 'library',
        loadComponent: () =>
            import('./workout-library/workout-library.component').then(
                (m) => m.WorkoutLibraryComponent
            ),
    },
    {
        path: 'exercises',
        canActivate: [historyLoaded],
        loadComponent: () =>
            import('./exercises/exercise-list.component').then((m) => m.ExerciseListComponent),
    },
    {
        path: 'exercises/:id',
        canActivate: [historyLoaded],
        loadComponent: () =>
            import('./exercises/exercise-page/exercise-page.component').then(
                (m) => m.ExercisePageComponent
            ),
    },
    {
        path: 'history',
        canActivate: [historyLoaded],
        loadComponent: () => import('./history/history.component').then((m) => m.HistoryComponent),
    },
    {
        path: 'settings',
        loadComponent: () =>
            import('./settings/settings.component').then((m) => m.SettingsComponent),
    },
    {
        path: 'workout',
        loadComponent: () => import('./workout/workout.component').then((m) => m.WorkoutComponent),
    },
    // The workout page was /timer until October 2026, so links and bookmarks to it still work
    { path: 'timer', redirectTo: 'workout' },
];
