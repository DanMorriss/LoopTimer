import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { TimerSetupComponent } from './timer-setup.component';

describe('TimerSetupComponent', () => {
  let component: TimerSetupComponent;
  let fixture: ComponentFixture<TimerSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [TimerSetupComponent],
    providers: [provideNoopAnimations()]
})
    .compileComponents();

    fixture = TestBed.createComponent(TimerSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
