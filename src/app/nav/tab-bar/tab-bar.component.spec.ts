import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { TabBarComponent } from './tab-bar.component';

@Component({ template: '' })
class BlankPage {}

describe('TabBarComponent', () => {
    let fixture: ComponentFixture<TabBarComponent>;
    let element: HTMLElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TabBarComponent],
            providers: [provideRouter([{ path: '**', component: BlankPage }])],
        }).compileComponents();

        fixture = TestBed.createComponent(TabBarComponent);
        element = fixture.nativeElement;
        fixture.detectChanges();
    });

    const tabs = () => [...element.querySelectorAll<HTMLAnchorElement>('nav a')];
    const label = (tab: HTMLAnchorElement) =>
        tab.querySelector('.tab-bar__label')!.textContent!.trim();
    const current = () => tabs().map((tab) => [label(tab), tab.getAttribute('aria-current')]);

    async function go(url: string) {
        await TestBed.inject(Router).navigateByUrl(url);
        fixture.detectChanges();
    }

    it('is a main navigation linking to every page, labelled under its icon', () => {
        expect(element.querySelector('nav')!.getAttribute('aria-label')).toBe('Main');
        expect(tabs().map((tab) => [label(tab), tab.getAttribute('href')])).toEqual([
            ['Home', '/home'],
            ['Exercises', '/exercises'],
            ['Library', '/library'],
            ['History', '/history'],
            ['Account', '/account'],
        ]);
    });

    it('marks the page you are on, and slides the highlight to it', async () => {
        await go('/history');

        expect(current().filter(([, mark]) => mark)).toEqual([['History', 'page']]);
        expect(element.querySelector('.tab-bar__tab--chosen')!.getAttribute('href')).toBe(
            '/history'
        );
        expect(element.querySelector<HTMLElement>('nav')!.style.getPropertyValue('--chosen')).toBe(
            '3'
        );
    });

    it('marks Library while making a workout, as the place you are in', async () => {
        await go('/setup');

        expect(tabs()[2].getAttribute('aria-current')).toBe('true');
    });

    it("marks Exercises on an exercise's page, and keeps the filter's address out of it", async () => {
        await go('/exercises/builtin:squat');
        expect(tabs()[1].getAttribute('aria-current')).toBe('true');

        await go('/exercises?muscles=quads');
        expect(tabs()[1].getAttribute('aria-current')).toBe('page');
    });

    it('marks Account in Settings and the legal pages, which slide in over it', async () => {
        for (const url of ['/settings', '/privacy', '/terms']) {
            await go(url);
            expect(current().filter(([, mark]) => mark)).toEqual([['Account', 'true']]);
        }
    });

    it('is not on the workout page, which has the whole screen', async () => {
        await go('/workout');

        expect(element.querySelector('nav')).toBeNull();
    });
});
