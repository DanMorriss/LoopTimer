import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeviceDataService } from '../../state/device-data.service';
import { ClearDeviceComponent } from './clear-device.component';

describe('ClearDeviceComponent', () => {
    let fixture: ComponentFixture<ClearDeviceComponent>;
    let element: HTMLElement;
    let clear: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        clear = vi.fn(() => new Promise<void>(() => {}));
        TestBed.configureTestingModule({
            providers: [{ provide: DeviceDataService, useValue: { clear } }],
        });
        fixture = TestBed.createComponent(ClearDeviceComponent);
        element = fixture.nativeElement;
        document.body.appendChild(element);
        await fixture.whenStable();
    });
    afterEach(() => {
        fixture.destroy();
        element.remove();
    });

    const buttons = () => [...element.querySelectorAll('button')];
    const button = (text: string) => buttons().find((b) => b.textContent!.trim() === text)!;
    const press = async (text: string) => {
        button(text).click();
        await fixture.whenStable();
    };

    it('asks first, with a warning that is read out, rather than clearing at once', async () => {
        await press('Clear this device');

        expect(clear).not.toHaveBeenCalled();
        const warning = element.querySelector('#clear-device-warning')!;
        expect(warning.textContent).toContain("can't be undone");
        expect(document.activeElement).toBe(warning);
        expect(element.querySelector('[role="group"]')!.getAttribute('aria-labelledby')).toBe(
            'clear-device-warning'
        );
        expect(buttons().map((b) => b.textContent!.trim())).toEqual(['Clear everything', 'Cancel']);
    });

    it('clears the device on Clear everything, and stops it being pressed twice', async () => {
        await press('Clear this device');
        await press('Clear everything');

        expect(clear).toHaveBeenCalledTimes(1);
        expect(button('Clear everything').disabled).toBe(true);
    });

    it('goes back to the button on Cancel, with focus on it', async () => {
        await press('Clear this device');
        await press('Cancel');

        expect(clear).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(button('Clear this device'));
    });
});
