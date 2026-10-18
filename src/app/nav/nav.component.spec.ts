import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { NavComponent } from './nav.component';

@Component({ template: '' })
class BlankPage {}

describe('NavComponent', () => {
    let fixture: ComponentFixture<NavComponent>;
    let element: HTMLElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NavComponent],
            providers: [provideRouter([{ path: '**', component: BlankPage }])],
        }).compileComponents();

        fixture = TestBed.createComponent(NavComponent);
        element = fixture.nativeElement;
        document.body.appendChild(element);
        fixture.detectChanges();
        await fixture.whenStable();
    });

    afterEach(() => element.remove());

    const toggle = () => element.querySelector<HTMLButtonElement>('button[aria-label="Menu"]')!;
    const menu = () => element.querySelector('#site-menu');
    const links = () => [...element.querySelectorAll<HTMLAnchorElement>('#site-menu a')];

    async function openMenu() {
        toggle().click();
        fixture.detectChanges();
        await fixture.whenStable();
    }

    it('starts with the menu closed', () => {
        expect(menu()).toBeNull();
        expect(toggle().getAttribute('aria-expanded')).toBe('false');
        expect(toggle().getAttribute('aria-controls')).toBe('site-menu');
    });

    it('opens and closes from the menu button', async () => {
        await openMenu();
        expect(menu()).not.toBeNull();
        expect(toggle().getAttribute('aria-expanded')).toBe('true');

        toggle().click();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(menu()).toBeNull();
    });

    it('links to every page', async () => {
        await openMenu();

        // The label, without the icon's ligature name
        const label = (link: HTMLAnchorElement) =>
            link.querySelector('mat-icon')!.nextSibling!.textContent!.trim();
        expect(links().map((link) => [label(link), link.getAttribute('href')])).toEqual([
            ['Home', '/home'],
            ['Create', '/setup'],
            ['Library', '/library'],
            ['History', '/history'],
            ['Settings', '/settings'],
        ]);
    });

    it('marks the page you are on', async () => {
        await TestBed.inject(Router).navigateByUrl('/library');
        await openMenu();

        const current = links().filter((link) => link.getAttribute('aria-current') === 'page');
        expect(current.map((link) => link.getAttribute('href'))).toEqual(['/library']);
    });

    it('closes after following a link', async () => {
        await openMenu();

        links()[3].click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(TestBed.inject(Router).url).toBe('/history');
        expect(menu()).toBeNull();
    });

    it('closes on Escape and gives focus back to the menu button', async () => {
        await openMenu();
        links()[0].focus();

        links()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        fixture.detectChanges();
        await fixture.whenStable();

        expect(menu()).toBeNull();
        expect(document.activeElement).toBe(toggle());
    });

    it('closes on a click outside it', async () => {
        await openMenu();

        document.body.click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(menu()).toBeNull();
    });

    it('closes when focus tabs out of it', async () => {
        const outside = document.createElement('button');
        document.body.appendChild(outside);
        await openMenu();
        links()[4].focus();

        outside.focus();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(menu()).toBeNull();
        outside.remove();
    });
});
