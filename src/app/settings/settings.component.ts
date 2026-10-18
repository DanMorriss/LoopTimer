import { Component, inject } from '@angular/core';
import { AlarmService } from '../shared/alarms/alarm.service';
import { ToggleSwitchComponent } from '../shared/components/toggle-switch/toggle-switch.component';
import { SettingsStore } from '../shared/state/settings-store.service';
import { AlarmKind } from '../timer/alarm-schedule';

interface AlarmPreview {
    kind: AlarmKind;
    name: string;
    description: string;
}

@Component({
    selector: 'app-settings',
    imports: [ToggleSwitchComponent],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.scss',
})
export class SettingsComponent {
    protected readonly settings = inject(SettingsStore);
    protected readonly alarms = inject(AlarmService);

    protected readonly previews: AlarmPreview[] = [
        { kind: 'work', name: 'Work', description: 'Two short high beeps' },
        { kind: 'rest', name: 'Rest', description: 'One long low tone' },
        { kind: 'finish', name: 'Finish', description: 'Three rising notes' },
    ];
}
