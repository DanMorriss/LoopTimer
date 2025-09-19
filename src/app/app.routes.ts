import { Routes } from "@angular/router";

export const routes: Routes = [
    { path: 'home', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)},
    { path: '', pathMatch: 'full', redirectTo: 'home' },
    { path: 'setup',   loadComponent: () => import('./timer-setup/timer-setup.component').then(m => m.TimerSetupComponent) },
    { path: 'library', loadComponent: () => import('./timer-library/timer-library.component').then(m => m.TimerLibraryComponent) },
    { path: 'timer',   loadComponent: () => import('./timer/timer.component').then(m => m.TimerComponent) },

]