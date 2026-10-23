import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ExerciseEditorComponent } from '../shared/components/exercise-editor/exercise-editor.component';
import { ToggleSwitchComponent } from '../shared/components/toggle-switch/toggle-switch.component';
import {
    canDoWith,
    capitalise,
    Equipment,
    EQUIPMENT_CHOICES,
    equipmentLabel,
    equipmentPhrases,
    Exercise,
    exercisePath,
    isBuiltIn,
    MUSCLE_LABELS,
    MuscleGroup,
} from '../models/exercise';
import { searchExercises } from '../models/exercise-links';
import {
    exerciseBests,
    ExerciseSession,
    progressMeasure,
    sessionsByExercise,
} from '../models/progress';
import { WeightUnit } from '../models/weight';
import { describeSets } from '../history/history-format';
import { HistoryStore } from '../shared/state/history-store.service';
import { headlineBest } from './progress-format';
import { blankOwnExercise, ExerciseStore } from '../shared/state/exercise-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { parseMusclesParam, serialiseMusclesParam } from './muscle-filter-query';

/** One exercise in the list, as its card shows it. */
interface ExerciseCard {
    exercise: Exercise;
    path: string;
    queryParams: { muscles?: string };
    own: boolean;
    mainMuscles: string[];
    /** e.g. "Barbell, rack", or empty when it lists none. */
    equipment: string;
    /** The other name a search found it by, if not its own. */
    otherName?: string;
    /** Its latest and best (PRG-3); missing until it's been done in a workout. */
    progress?: CardProgress;
}

/** e.g. latest "3 × 10 @ 60 kg" on 18 October, best "80 kg". */
interface CardProgress {
    latest: string;
    latestSpoken: string;
    latestAt: number;
    /** The date with its year, unless it was this year. */
    dateFormat: string;
    best: string;
}

const MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

/**
 * Every exercise, built-in and your own, to browse and search (EXR-6). The list can be cut
 * down to one main muscle, and to what you can do with your equipment, which is remembered.
 * Hidden exercises are kept apart at the end. New makes an exercise of your own.
 */
@Component({
    selector: 'app-exercise-list',
    imports: [
        DatePipe,
        MatIconModule,
        NgTemplateOutlet,
        RouterLink,
        ToggleSwitchComponent,
        ExerciseEditorComponent,
    ],
    templateUrl: './exercise-list.component.html',
    styleUrl: './exercise-list.component.scss',
})
export class ExerciseListComponent {
    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);
    private readonly history = inject(HistoryStore);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly muscles = MUSCLES;
    protected readonly muscleLabels = MUSCLE_LABELS;
    protected readonly equipmentChoices = EQUIPMENT_CHOICES;
    protected readonly equipmentLabel = equipmentLabel;

    protected readonly query = signal('');
    /** The main muscle the list is cut down to, or null for all. */
    protected readonly muscle = signal<MuscleGroup | null>(null);
    protected readonly selectedMuscles = computed(() => {
        const muscle = this.muscle();
        return muscle === null ? [] : [muscle];
    });
    protected readonly muscleQueryParams = computed(() => {
        const muscles = serialiseMusclesParam(this.selectedMuscles());
        return muscles ? { muscles } : {};
    });
    protected readonly kitOpen = signal(false);
    protected readonly hiddenOpen = signal(false);
    /** A blank exercise of your own in the editor, made when it's saved. */
    protected readonly drafting = signal(false);
    protected readonly draft = blankOwnExercise();

    protected readonly myEquipment = this.settings.myEquipment;
    protected readonly onlyMyEquipment = this.settings.onlyMyEquipment;

    /** Each exercise's sessions in the history, newest first. */
    private readonly sessions = computed(() => sessionsByExercise(this.history.entries()));

    /** Best match first while searching, otherwise A to Z. */
    private readonly found = computed(() => {
        const muscle = this.muscle();
        const kit = this.myEquipment();
        const typed = this.query().trim();
        const all = this.exercises.exercises();
        const queryParams = this.muscleQueryParams();
        const matches = typed
            ? searchExercises(typed, all, Infinity)
            : [...all]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((exercise) => ({ exercise, otherName: undefined }));
        return matches
            .filter(
                ({ exercise }) =>
                    (muscle === null || exercise.mainMuscles.includes(muscle)) &&
                    (!this.onlyMyEquipment() || canDoWith(exercise, kit))
            )
            .map(({ exercise, otherName }) =>
                card(
                    exercise,
                    queryParams,
                    otherName,
                    this.sessions().get(exercise.id),
                    this.settings.weightUnit()
                )
            );
    });

    constructor() {
        const picked = parseMusclesParam(this.route.snapshot.queryParamMap.get('muscles'));
        this.muscle.set(picked[0] ?? null);
    }

    protected readonly shown = computed(() =>
        this.found().filter((c) => !this.exercises.isHidden(c.exercise.id))
    );
    protected readonly hidden = computed(() =>
        this.found().filter((c) => this.exercises.isHidden(c.exercise.id))
    );
    protected readonly filtered = computed(
        () => this.query().trim() !== '' || this.muscle() !== null || this.onlyMyEquipment()
    );
    protected readonly kitSummary = computed(() => {
        const count = this.myEquipment().length;
        if (count === 0) {
            return 'none';
        }
        return count === 1 ? '1 piece' : `${count} pieces`;
    });

    protected onSearch(event: Event) {
        this.query.set((event.target as HTMLInputElement).value);
    }

    protected pickMuscle(muscle: MuscleGroup | null) {
        this.muscle.set(muscle);
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { muscles: serialiseMusclesParam(muscle === null ? [] : [muscle]) },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    protected setOnlyMine(only: boolean) {
        this.settings.update({ onlyMyEquipment: only });
    }

    protected hasEquipment(equipment: Equipment): boolean {
        return this.myEquipment().includes(equipment);
    }

    protected toggleEquipment(equipment: Equipment) {
        const mine = this.hasEquipment(equipment)
            ? this.myEquipment().filter((e) => e !== equipment)
            : [...this.myEquipment(), equipment];
        // In the order it's offered, as it's saved
        this.settings.update({ myEquipment: EQUIPMENT_CHOICES.filter((e) => mine.includes(e)) });
    }

    protected clearFilters() {
        this.query.set('');
        this.pickMuscle(null);
        this.setOnlyMine(false);
    }

    protected made(exercise: Exercise) {
        this.drafting.set(false);
        void this.router.navigateByUrl(exercisePath(exercise));
    }

    protected closeDraft() {
        this.drafting.set(false);
        document.getElementById('exercise-list-new')?.focus();
    }
}

function card(
    exercise: Exercise,
    queryParams: { muscles?: string },
    otherName: string | undefined,
    sessions: readonly ExerciseSession[] | undefined,
    unit: WeightUnit
): ExerciseCard {
    return {
        exercise,
        path: exercisePath(exercise),
        queryParams,
        own: !isBuiltIn(exercise),
        mainMuscles: exercise.mainMuscles.map((muscle) => MUSCLE_LABELS[muscle]),
        equipment: capitalise(equipmentPhrases(exercise.equipment).join(', ')),
        otherName,
        ...(sessions?.length ? { progress: cardProgress(sessions, unit) } : {}),
    };
}

// Its latest session's sets, as in the history, and its headline best
function cardProgress(sessions: readonly ExerciseSession[], unit: WeightUnit): CardProgress {
    const latest = sessions[0];
    const lines = describeSets(latest.sets, unit);
    const measure = progressMeasure(sessions)!;
    return {
        latest: lines.map((line) => line.text).join(' + '),
        latestSpoken: lines.map((line) => line.spoken).join(', then '),
        latestAt: latest.startedAt,
        dateFormat:
            new Date(latest.startedAt).getFullYear() === new Date().getFullYear()
                ? 'd MMM'
                : 'd MMM y',
        best: headlineBest(exerciseBests(sessions), measure, unit),
    };
}
