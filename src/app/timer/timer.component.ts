import { Component, Input } from '@angular/core';
import { Timer } from '../models/timer';

@Component({
  selector: 'app-timer',
  imports: [],
  templateUrl: './timer.component.html',
  styleUrl: './timer.component.scss'
})
export class TimerComponent {
  @Input() timer: Timer | null = null;

}
