import { Component } from '@angular/core';
import { TimerSetupComponent } from './timer-setup/timer-setup.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    imports: [TimerSetupComponent]
})
export class AppComponent {
  title = 'loop-timer';
}
