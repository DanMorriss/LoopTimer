import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])]
    })
    .compileComponents();

    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('goes to setup from the "Create" side of the logo', () => {
    fixture.nativeElement.querySelector('.left-zone').click();

    expect(navigate).toHaveBeenCalledWith(['/setup']);
  });

  it('goes to the library from the "Library" side of the logo', () => {
    fixture.nativeElement.querySelector('.right-zone').click();

    expect(navigate).toHaveBeenCalledWith(['/library']);
  });
});
