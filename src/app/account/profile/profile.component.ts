import { Component, computed, inject } from '@angular/core';
import { BodyFigure } from '../../models/exercise';
import { TrainingGoal, WEEKLY_AIMS } from '../../models/muscle-balance';
import { WeightUnit } from '../../models/weight';
import { SettingsStore } from '../../shared/state/settings-store.service';

/**
 * Account → Profile: your sex, for the body map's figure (SET-5), what you train for, for
 * the muscle bars' aims (PRG-8), and the weight unit you lift in (SET-4). They're saved with the settings, so they stay a choice for each device.
 */
@Component({
    selector: 'app-profile',
    template: `
        <!-- Which figure the body maps draw -->
        <fieldset class="segmented" aria-describedby="sex-hint">
            <legend class="profile__name">Sex</legend>
            <div
                class="segmented__options"
                [style.--count]="sexes.length"
                [style.--chosen]="chosenSexIndex()"
            >
                <!-- The highlight behind the chosen option, which slides between them -->
                <span class="segmented__thumb" aria-hidden="true"></span>
                @for (option of sexes; track option.value; let i = $index) {
                    <label
                        class="segmented__option"
                        [class.segmented__option--chosen]="i === chosenSexIndex()"
                    >
                        <input
                            type="radio"
                            name="bodyFigure"
                            class="segmented__input"
                            [value]="option.value"
                            [checked]="settings.bodyFigure() === option.value"
                            (change)="settings.update({ bodyFigure: option.value })"
                        />
                        <span class="segmented__label">{{ option.label }}</span>
                    </label>
                }
            </div>
            <p class="profile__hint" id="sex-hint">The body the muscle maps show</p>
        </fieldset>

        <!-- Sets the sets a week each muscle bar aims at -->
        <fieldset class="segmented profile__picker" aria-describedby="goal-hint">
            <legend class="profile__name">Training for</legend>
            <div
                class="segmented__options"
                [style.--count]="goals.length"
                [style.--chosen]="chosenGoalIndex()"
            >
                <span class="segmented__thumb" aria-hidden="true"></span>
                @for (option of goals; track option.value; let i = $index) {
                    <label
                        class="segmented__option"
                        [class.segmented__option--chosen]="i === chosenGoalIndex()"
                    >
                        <input
                            type="radio"
                            name="trainingGoal"
                            class="segmented__input"
                            [value]="option.value"
                            [checked]="settings.trainingGoal() === option.value"
                            (change)="settings.update({ trainingGoal: option.value })"
                        />
                        <span class="segmented__label">{{ option.label }}</span>
                    </label>
                }
            </div>
            <p class="profile__hint" id="goal-hint">{{ goalHint() }}</p>
        </fieldset>

        <!-- Weights are always saved in kg, so switching loses nothing -->
        <fieldset class="segmented profile__picker">
            <legend class="profile__name">Weight units</legend>
            <div
                class="segmented__options"
                [style.--count]="weightUnits.length"
                [style.--chosen]="chosenUnitIndex()"
            >
                <span class="segmented__thumb" aria-hidden="true"></span>
                @for (option of weightUnits; track option.value; let i = $index) {
                    <label
                        class="segmented__option"
                        [class.segmented__option--chosen]="i === chosenUnitIndex()"
                    >
                        <input
                            type="radio"
                            name="weightUnit"
                            class="segmented__input"
                            [value]="option.value"
                            [checked]="settings.weightUnit() === option.value"
                            (change)="settings.update({ weightUnit: option.value })"
                        />
                        <span class="segmented__label">{{ option.label }}</span>
                    </label>
                }
            </div>
        </fieldset>
    `,
    styles: `
        :host {
            display: block;
        }

        // The pickers' look is shared (styles/_segmented.scss); here, their spacing
        .segmented {
            padding-top: 0.25rem;
        }

        .profile__picker {
            margin-top: 1rem;
        }

        .profile__name {
            color: var(--text);
        }

        .profile__hint {
            margin: 0.5rem 0 0;
            font-size: 0.85rem;
            color: var(--text-muted);
        }
    `,
})
export class ProfileComponent {
    protected readonly settings = inject(SettingsStore);

    protected readonly sexes: { value: BodyFigure; label: string }[] = [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
    ];
    protected readonly chosenSexIndex = computed(() =>
        this.sexes.findIndex((option) => option.value === this.settings.bodyFigure())
    );

    protected readonly goals: { value: TrainingGoal; label: string }[] = [
        { value: 'muscle', label: 'Muscle' },
        { value: 'fitness', label: 'Fitness' },
    ];
    protected readonly chosenGoalIndex = computed(() =>
        this.goals.findIndex((option) => option.value === this.settings.trainingGoal())
    );
    protected readonly goalHint = computed(() => {
        const { large, small } = WEEKLY_AIMS[this.settings.trainingGoal()];
        return `Aim for ${large.low} to ${large.high} sets a week on each muscle, ${small.low} to ${small.high} on small ones`;
    });

    protected readonly weightUnits: { value: WeightUnit; label: string }[] = [
        { value: 'kg', label: 'Kilograms (kg)' },
        { value: 'lb', label: 'Pounds (lb)' },
    ];
    protected readonly chosenUnitIndex = computed(() =>
        this.weightUnits.findIndex((option) => option.value === this.settings.weightUnit())
    );
}
