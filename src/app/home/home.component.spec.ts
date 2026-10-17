import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Real links, so they can be reached and followed with the keyboard
  it('links to setup from the "Create" side of the logo', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a.left-zone');

    expect(link.textContent?.trim()).toBe('Create');
    expect(link.getAttribute('href')).toBe('/setup');
  });

  it('links to the library from the "Library" side of the logo', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a.right-zone');

    expect(link.textContent?.trim()).toBe('Library');
    expect(link.getAttribute('href')).toBe('/library');
  });
});
