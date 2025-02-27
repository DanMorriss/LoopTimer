import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimerLibraryComponent } from './timer-library.component';

describe('TimerLibraryComponent', () => {
  let component: TimerLibraryComponent;
  let fixture: ComponentFixture<TimerLibraryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TimerLibraryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimerLibraryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
