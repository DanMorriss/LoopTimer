import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimerSetupComponent } from './timer-setup.component';

describe('TimerSetupComponent', () => {
  let component: TimerSetupComponent;
  let fixture: ComponentFixture<TimerSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TimerSetupComponent]
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
