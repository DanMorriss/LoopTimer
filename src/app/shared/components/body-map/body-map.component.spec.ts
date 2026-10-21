import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MuscleGroup } from '../../../models/exercise';
import { SettingsStore } from '../../state/settings-store.service';
import { BodyMapComponent } from './body-map.component';
import { BODY_FIGURES } from './body-shapes';

describe('BodyMapComponent', () => {
    let fixture: ComponentFixture<BodyMapComponent>;

    function create(main: MuscleGroup[], supporting: MuscleGroup[] = []) {
        fixture = TestBed.createComponent(BodyMapComponent);
        fixture.componentRef.setInput('main', main);
        fixture.componentRef.setInput('supporting', supporting);
        fixture.detectChanges();
    }

    beforeEach(() => localStorage.clear());
    afterEach(() => {
        fixture.destroy();
        localStorage.clear();
    });

    const el = (): HTMLElement => fixture.nativeElement;
    const labels = (kind: string) =>
        Array.from(el().querySelectorAll(`.body-map__label--${kind}`)).map((l) =>
            l.textContent!.trim()
        );
    const shaded = (kind: string) => el().querySelectorAll(`.body-map__shape--${kind}`).length;
    /** How many paths the figure has for these muscles, front and back together. */
    const pathsFor = (muscles: MuscleGroup[], figure: 'male' | 'female' = 'male') =>
        (['front', 'back'] as const)
            .flatMap((side) => BODY_FIGURES[figure][side].shapes)
            .filter((shape) => shape.muscle !== null && muscles.includes(shape.muscle))
            .reduce((total, shape) => total + shape.paths.length, 0);

    it('draws a front and a back figure', () => {
        create([]);

        const captions = Array.from(el().querySelectorAll('figcaption')).map((c) => c.textContent);
        expect(captions).toEqual(['Front', 'Back']);
        expect(el().querySelectorAll('svg')).toHaveLength(2);
    });

    it('shades the main muscles, then the supporting ones, and leaves the rest unworked', () => {
        create(['quads', 'glutes'], ['hamstrings', 'lower-back']);

        expect(shaded('main')).toBe(pathsFor(['quads', 'glutes']));
        expect(shaded('supporting')).toBe(pathsFor(['hamstrings', 'lower-back']));
        expect(shaded('main')).toBeGreaterThan(0);
        expect(shaded('supporting')).toBeGreaterThan(0);
        expect(shaded('idle')).toBeGreaterThan(0);
        // Head, hands, feet and the like are drawn but never shaded
        expect(shaded('other')).toBeGreaterThan(0);
    });

    it('lists the muscles underneath, as the key and the words for the figure', () => {
        create(['quads', 'glutes'], ['hamstrings', 'lower-back']);

        expect(labels('main')).toEqual(['Quads', 'Glutes']);
        expect(labels('supporting')).toEqual(['Hamstrings', 'Lower back']);
    });

    it('hides the drawing from screen readers, and labels each list', () => {
        create(['chest'], ['triceps']);

        expect(el().querySelector('.body-map__figures')!.getAttribute('aria-hidden')).toBe('true');
        for (const list of Array.from(el().querySelectorAll('ul'))) {
            const heading = el().querySelector(`#${list.getAttribute('aria-labelledby')}`);
            expect(['Main', 'Supporting']).toContain(heading?.textContent);
        }
    });

    it('counts a muscle listed as both main and supporting as main', () => {
        create(['quads'], ['quads', 'glutes']);

        expect(labels('main')).toEqual(['Quads']);
        expect(labels('supporting')).toEqual(['Glutes']);
        expect(shaded('main')).toBe(pathsFor(['quads']));
    });

    it('leaves out a list with nothing in it', () => {
        create(['abs']);

        expect(el().textContent).not.toContain('Supporting');
    });

    it('says so when there are no muscles to show', () => {
        create([]);

        expect(el().textContent).toContain('No muscles listed.');
        expect(shaded('main') + shaded('supporting')).toBe(0);
    });

    // The figure has no shape for them, but the list still names them
    it('still lists a muscle the figure has no shape for', () => {
        create(['obliques'], ['abductors']);

        expect(labels('supporting')).toEqual(['Abductors']);
    });

    it('draws the figure chosen in settings', () => {
        TestBed.inject(SettingsStore).update({ bodyFigure: 'female' });
        create(['chest']);

        expect(el().querySelector('svg')!.getAttribute('viewBox')).toBe(
            BODY_FIGURES.female.front.viewBox
        );
        expect(shaded('main')).toBe(pathsFor(['chest'], 'female'));
    });

    it('has a shape for every muscle group but abductors, on both figures', () => {
        const muscles = new Set(
            (['male', 'female'] as const).flatMap((figure) =>
                (['front', 'back'] as const).flatMap((side) =>
                    BODY_FIGURES[figure][side].shapes.map((shape) => shape.muscle)
                )
            )
        );

        expect([...muscles].filter((m) => m !== null).sort()).toEqual(
            [
                'abs',
                'adductors',
                'biceps',
                'calves',
                'chest',
                'forearms',
                'glutes',
                'hamstrings',
                'lower-back',
                'neck',
                'obliques',
                'quads',
                'shins',
                'shoulders',
                'traps',
                'triceps',
                'upper-back',
            ].sort()
        );
    });
});
