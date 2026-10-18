import {
    afterNextRender,
    Component,
    computed,
    effect,
    inject,
    Injector,
    signal,
} from '@angular/core';
import { applyEach, form, FormField, FormRoot, maxLength, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import {
    CdkDrag,
    CdkDragDrop,
    CdkDragHandle,
    CdkDragPlaceholder,
    CdkDragPreview,
    CdkDropList,
    moveItemInArray,
} from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router } from '@angular/router';
import { hasWork, Step, StepKind, Timer, UNTIL_STOPPED } from '../models/timer';
import { InfinitySwitchComponent } from '../shared/components/infinity-switch/infinity-switch.component';
import {
    WheelPickerComponent,
    WheelPickerOption,
} from '../shared/components/wheel-picker/wheel-picker.component';
import { TimerStore } from '../shared/state/timer-store.service';

/** One step as the form holds it: minutes and seconds for the two wheels. */
interface StepModel {
    /** Stays with the step as it moves, for tracking and element ids. */
    key: number;
    kind: StepKind;
    name: string;
    minutes: number;
    seconds: number;
}

/** The form's values. */
interface TimerSetupModel {
    title: string;
    steps: StepModel[];
    repeats: number;
}

/** Enough for a long circuit, while keeping the page manageable. */
export const MAX_STEPS = 20;
const MAX_NAME_LENGTH = 40;

function pickerOptions(
    from: number,
    to: number,
    label: (n: number) => string
): WheelPickerOption[] {
    return Array.from({ length: to - from + 1 }, (_, i) => ({
        value: from + i,
        label: label(from + i),
    }));
}

const padded = (n: number) => n.toString().padStart(2, '0');
const kindName = (kind: StepKind) => (kind === 'work' ? 'Work' : 'Rest');

@Component({
    selector: 'app-timer-setup',
    templateUrl: './timer-setup.component.html',
    styleUrl: './timer-setup.component.scss',
    imports: [
        CdkDropList,
        CdkDrag,
        CdkDragHandle,
        CdkDragPreview,
        CdkDragPlaceholder,
        FormRoot,
        FormField,
        WheelPickerComponent,
        InfinitySwitchComponent,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
    ],
})
export class TimerSetupComponent {
    private readonly timerStore = inject(TimerStore);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly injector = inject(Injector);

    protected readonly maxSteps = MAX_STEPS;
    protected readonly kindName = kindName;
    protected readonly editingTimerId = signal<number | null>(null);
    protected readonly minuteOptions = pickerOptions(0, 99, padded);
    protected readonly secondOptions = pickerOptions(0, 59, padded);
    // 1-30, then ∞ at the end of the wheel
    protected readonly repeatOptions: WheelPickerOption[] = [
        ...pickerOptions(1, 30, String),
        { value: UNTIL_STOPPED, label: '∞', spokenLabel: 'until stopped' },
    ];

    private nextKey = 1;
    private readonly model = signal<TimerSetupModel>(this.emptySetup());

    protected readonly timerForm = form(
        this.model,
        (setup) => {
            // Long enough for a name, short enough to fit on the timer
            applyEach(setup.steps, (step) => maxLength(step.name, MAX_NAME_LENGTH));
            // The wheels only offer valid times, so the one rule is that there's some work
            validate(setup, ({ value }) =>
                hasWork(toSteps(value().steps))
                    ? undefined
                    : { kind: 'noTime', message: 'Timer must have some work time' }
            );
        },
        {
            submission: {
                action: async () => {
                    await this.saveAndStart();
                    return undefined;
                },
            },
        }
    );

    protected readonly stepCount = computed(() => this.model().steps.length);
    protected readonly untilStopped = computed(() => this.model().repeats === UNTIL_STOPPED);
    // The last number of rounds picked, so turning the switch off goes back to it
    private lastRounds = 1;

    /** Read out by screen readers after a step is added, moved or deleted. */
    protected readonly stepAnnouncement = signal('');

    protected readonly noTimeError = computed(() =>
        this.timerForm()
            .errors()
            .find((error) => error.kind === 'noTime')
    );

    constructor() {
        // An effect rather than a derived signal, so the number is caught even when nothing
        // reads it before the wheel moves on to ∞
        effect(() => {
            const repeats = this.model().repeats;
            if (repeats !== UNTIL_STOPPED) {
                this.lastRounds = repeats;
            }
        });

        const timerToEdit = this.findTimerToEdit();
        if (timerToEdit) {
            this.editingTimerId.set(timerToEdit.id);
            this.model.set({
                title: timerToEdit.title,
                steps: timerToEdit.steps.map((step) => this.stepModel(step)),
                repeats: timerToEdit.repeats,
            });
        }
    }

    protected setUntilStopped(on: boolean) {
        const repeats = on ? UNTIL_STOPPED : this.lastRounds;
        this.model.update((setup) => ({ ...setup, repeats }));
    }

    /** How a step is named to screen readers, e.g. "Step 2, rest" or "Step 1, Squats". */
    protected stepTitle(index: number): string {
        const step = this.model().steps[index];
        return `Step ${index + 1}, ${step.name.trim() || kindName(step.kind).toLowerCase()}`;
    }

    protected addStep(kind: StepKind) {
        if (this.stepCount() >= MAX_STEPS) {
            return;
        }
        const step = this.stepModel({ kind, seconds: 0, name: '' });
        this.updateSteps((steps) => [...steps, step]);
        this.stepAnnouncement.set(`Added a ${kind} step, step ${this.stepCount()}`);
        this.focusAfterRender(`step-${step.key}-name`);
    }

    /** The up and down buttons, for keyboard and screen reader users (and anyone else). */
    protected moveStep(index: number, by: -1 | 1) {
        const target = index + by;
        const moved = this.moveStepTo(index, target);
        if (!moved) {
            return;
        }
        // Focus follows the step to its new place: the same button, or the other move
        // button if that one has just been disabled (at the top or bottom)
        const atEnd = by === -1 ? target === 0 : target === this.stepCount() - 1;
        const button = by === -1 ? (atEnd ? 'down' : 'up') : atEnd ? 'up' : 'down';
        this.focusAfterRender(`step-${moved.key}-${button}`);
    }

    /** A step dragged by its handle and dropped in a new place. */
    protected dropStep(event: CdkDragDrop<unknown>) {
        this.moveStepTo(event.previousIndex, event.currentIndex);
    }

    /** Moves a step to a new position and says so. Returns the step, or null if it can't move. */
    private moveStepTo(from: number, to: number): StepModel | null {
        const steps = [...this.model().steps];
        if (from === to || to < 0 || to >= steps.length) {
            return null;
        }
        moveItemInArray(steps, from, to);
        this.updateSteps(() => steps);
        const moved = steps[to];
        this.stepAnnouncement.set(
            `Moved ${moved.name.trim() || kindName(moved.kind).toLowerCase()} to step ${to + 1}`
        );
        return moved;
    }

    protected deleteStep(index: number) {
        const steps = this.model().steps;
        if (steps.length <= 1) {
            return;
        }
        const deleted = steps[index];
        this.updateSteps((all) => all.filter((step) => step.key !== deleted.key));
        this.stepAnnouncement.set(`Deleted step ${index + 1}`);
        // Focus the step that took its place, or the one before if it was last
        const remaining = this.model().steps;
        const next = remaining[Math.min(index, remaining.length - 1)];
        this.focusAfterRender(`step-${next.key}-delete`);
    }

    private updateSteps(change: (steps: StepModel[]) => StepModel[]) {
        this.model.update((setup) => ({ ...setup, steps: change(setup.steps) }));
    }

    private focusAfterRender(id: string) {
        afterNextRender(() => document.getElementById(id)?.focus(), { injector: this.injector });
    }

    private stepModel(step: Step): StepModel {
        return {
            key: this.nextKey++,
            kind: step.kind,
            name: step.name,
            minutes: Math.floor(step.seconds / 60),
            seconds: step.seconds % 60,
        };
    }

    // A new timer starts with a work step and a rest step, as timers always have
    private emptySetup(): TimerSetupModel {
        return {
            title: '',
            steps: [
                this.stepModel({ kind: 'work', seconds: 0, name: '' }),
                this.stepModel({ kind: 'rest', seconds: 0, name: '' }),
            ],
            repeats: 1,
        };
    }

    private findTimerToEdit(): Timer | null {
        const rawEditId = this.route.snapshot.queryParamMap.get('editId');
        const editId = Number(rawEditId);
        if (!rawEditId || !Number.isInteger(editId) || editId <= 0) {
            return null;
        }
        return this.timerStore.findTimerById(editId);
    }

    private async saveAndStart(): Promise<void> {
        const { title, steps, repeats } = this.model();
        const timer: Omit<Timer, 'id'> = { title, steps: toSteps(steps), repeats };

        const editingId = this.editingTimerId();
        const savedTimer = editingId
            ? (this.timerStore.updateTimer(editingId, timer) ?? this.timerStore.addTimer(timer))
            : this.timerStore.addTimer(timer);

        this.model.set(this.emptySetup());
        this.editingTimerId.set(null);
        this.timerStore.setActiveTimer(savedTimer);
        await this.router.navigate(['/timer']);
    }
}

/** The steps to save: whole seconds and trimmed names, leaving out any left at 0:00. */
function toSteps(steps: readonly StepModel[]): Step[] {
    return steps
        .map((step) => ({
            kind: step.kind,
            seconds: step.minutes * 60 + step.seconds,
            name: step.name.trim(),
        }))
        .filter((step) => step.seconds > 0);
}
