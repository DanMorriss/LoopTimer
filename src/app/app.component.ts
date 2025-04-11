import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TimerSetupComponent } from './timer-setup/timer-setup.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    imports: [TimerSetupComponent, RouterLink, RouterLinkActive, RouterOutlet]
})
export class AppComponent {
  title = 'loop-timer';
}
