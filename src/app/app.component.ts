import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './nav/nav.component';
import { RunBarComponent } from './nav/run-bar/run-bar.component';
import { TabBarComponent } from './nav/tab-bar/tab-bar.component';
import { UndoBarComponent } from './nav/undo-bar/undo-bar.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    imports: [RouterOutlet, NavComponent, RunBarComponent, TabBarComponent, UndoBarComponent],
})
export class AppComponent {
    title = 'loop-timer';
}
