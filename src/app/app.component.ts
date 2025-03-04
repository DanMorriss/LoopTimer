import { Component } from '@angular/core';
import { TimerLibraryComponent } from './timer-library/timer-library.component';
import { TimerSetupComponent } from './timer-setup/timer-setup.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    imports: [TimerLibraryComponent, TimerSetupComponent]
})
export class AppComponent {
  title = 'loop-timer';
}
