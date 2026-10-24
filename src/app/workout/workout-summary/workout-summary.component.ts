import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
    Component,
    computed,
    ElementRef,
    inject,
    linkedSignal,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { form, FormField, maxLength } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { isBuiltIn } from '../../models/exercise';
import { MAX_NOTE_LENGTH, RepSet } from '../../models/history';
import {
    exerciseBests,
    isMostRounds,
    roundsScore,
    sessionsByExercise,
} from '../../models/progress';
import { MAX_REPS } from '../../models/workout';
import { weightIn, weightOptions, weightToKg } from '../../models/weight';
import { WheelPickerComponent } from '../../shared/components/wheel-picker/wheel-picker.component';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import {
    describeRounds,
    describeScore,
    describeSets,
    entryName,
    formatDuration,
} from '../../history/history-format';
import { bestLines } from '../../exercises/progress-format';
import { project, rubberband, VelocityTracker } from '../../shared/gesture';
import { injectPrefersReducedMotion } from '../../shared/reduced-motion';
import { criticallyDampedSpring } from '../../shared/spring';

/** One rep step's sets, for correcting them one by one. */
interface SetGroup {
    name: string;
    /** Each set, with where it is in the run's list of sets. */
    sets: { index: number; set: RepSet }[];
}

/**
 * How the workout went, once it's finished or ended with End workout: the time, rounds and
 * sets, which can be corrected, and a note. A workout ended early (or one that runs until
 * stopped) can be taken up again with Back to workout; the run waits, paused, until then.
 * Focus starts on the heading and is trapped inside while it's open.
 */
@Component({
    selector: 'app-workout-summary',
    imports: [CdkTrapFocus, FormField, MatIconModule, WheelPickerComponent],
    templateUrl: './workout-summary.component.html',
    styleUrl: './workout-summary.component.scss',
    host: { '[class.summary--dragged-away]': 'draggedAway()' },
})
export class WorkoutSummaryComponent {
    private readonly run = inject(ActiveRunService);
    private readonly store = inject(WorkoutStore);
    private readonly history = inject(HistoryStore);
    private readonly settings = inject(SettingsStore);
    private readonly exercises = inject(ExerciseStore);

    /** Back to workout: the run carries on from where it was ended. */
    readonly back = output<void>();
    /** Done: the run is over, on to the library. */
    readonly done = output<void>();
    /** View history: the run is over, on to it in the history. */
    readonly viewHistory = output<void>();

    protected readonly finished = this.run.isComplete;
    protected readonly heading = computed(() => {
        if (!this.finished()) {
            return 'Workout ended';
        }
        return this.run.workout()?.timeLimitSeconds === undefined
            ? 'Workout finished'
            : "Time's up";
    });
    /** The rep step time ran out on, to log how much of it was done; null otherwise. */
    protected readonly lastSet = computed(() => {
        const last = this.run.unloggedLastSet();
        if (!last) {
            return null;
        }
        const { exerciseId, name } = last.step;
        const current = exerciseId === undefined ? undefined : this.exerciseName(exerciseId);
        return { name: current || name.trim() || 'the reps', reps: last.step.reps };
    });
    /** Starts at the step's reps, as most of a set is likely done by then. */
    protected readonly lastSetReps = linkedSignal(() => this.lastSet()?.reps ?? 1);
    /** This run in the history; missing when it ended before its first step was done. */
    protected readonly entry = computed(() => {
        const id = this.run.runId();
        return this.history.entries().find((entry) => entry.id === id);
    });
    protected readonly title = computed(() => {
        const entry = this.entry();
        return entry ? entryName(entry) : (this.run.workout()?.title.trim() ?? '');
    });
    protected readonly duration = computed(() => formatDuration(this.entry()?.activeSeconds ?? 0));
    protected readonly rounds = computed(() => {
        const entry = this.entry();
        return entry ? describeRounds(entry) : '';
    });

    protected readonly weightUnit = this.settings.weightUnit;
    private readonly exerciseName = (id: string) => {
        // Built-in names never change, so a set keeps the name it ran with, e.g. "Squats"
        const exercise = this.exercises.byId(id);
        return exercise && !isBuiltIn(exercise) ? exercise.name : undefined;
    };
    /** Its sets, one line per step, e.g. "Squats: 10, 10, 8 @ 60 kg" or "Plank: 3 × 0:45". */
    protected readonly setLines = computed(() =>
        describeSets(this.run.sets(), this.weightUnit(), this.exerciseName)
    );
    /**
     * The bests this run set (PRG-2), e.g. "Heaviest: 80 kg × 5", and "Most rounds" for a
     * time limit (PRG-7). Equalling a best isn't one, and nor is doing it for the first time.
     */
    protected readonly personalBests = computed(() => {
        const entry = this.entry();
        if (!entry) {
            return [];
        }
        const before = sessionsByExercise(
            this.history.entries().filter((other) => other.id !== entry.id)
        );
        const lines: string[] = [];
        const score = roundsScore(entry);
        if (score && isMostRounds(entry, this.history.entries())) {
            lines.push(`Most rounds: ${describeScore(score)}`);
        }
        for (const [exerciseId, [session]] of sessionsByExercise([entry])) {
            const earlier = before.get(exerciseId);
            if (!earlier) {
                continue;
            }
            // Newest first, as the history is, so on a tie the earlier best stands
            const bests = exerciseBests([session, ...earlier]);
            for (const line of bestLines(bests, this.weightUnit())) {
                if (line.entryId === entry.id) {
                    lines.push(`${line.label}: ${line.text}`);
                }
            }
        }
        return lines;
    });

    protected logLastSet() {
        this.run.logLastSet(this.lastSetReps());
    }

    // Correcting the rep sets, e.g. the last one was 8 reps, not 10. Timed ones ran as set.
    protected readonly changingSets = signal(false);
    protected readonly setGroups = computed((): SetGroup[] => {
        const groups = new Map<number, SetGroup>();
        this.store.activeSets().forEach((set, index) => {
            const group = groups.get(set.step) ?? { name: '', sets: [] };
            group.sets.push({ index, set });
            groups.set(set.step, group);
        });
        // Named as its line is
        return Array.from(groups.values(), (group) => ({
            ...group,
            name: describeSets(
                group.sets.map((item) => item.set),
                this.weightUnit(),
                this.exerciseName
            )[0].name,
        }));
    });
    protected readonly repOptions = Array.from({ length: MAX_REPS }, (_, i) => ({
        value: i + 1,
        label: String(i + 1),
    }));
    protected readonly weightOptions = computed(() => weightOptions(this.weightUnit()));
    protected weightValue(set: RepSet): number {
        return set.weight ? weightIn(set.weight, this.weightUnit()) : 0;
    }

    /** null until a set is changed; then asks whether to start from them next time. */
    protected readonly nextTime = signal<'asking' | 'yes' | 'no' | null>(null);

    // The note box starts from the saved note
    private readonly noteModel = linkedSignal(() => ({ note: this.entry()?.note ?? '' }));
    protected readonly noteForm = form(this.noteModel, (note) =>
        maxLength(note.note, MAX_NOTE_LENGTH)
    );

    protected setReps(index: number, reps: number) {
        if (this.store.activeSets()[index]?.reps === reps) {
            return;
        }
        this.run.changeSet(index, { reps });
        this.nextTime.set('asking');
    }

    protected setWeight(index: number, value: number) {
        const weight = value > 0 ? weightToKg(value, this.weightUnit()) : undefined;
        if (this.store.activeSets()[index]?.weight === weight) {
            return;
        }
        this.run.changeSet(index, { weight });
        this.nextTime.set('asking');
    }

    protected answerNextTime(use: boolean) {
        if (use) {
            this.run.useSetsNextTime();
        }
        this.nextTime.set(use ? 'yes' : 'no');
    }

    /** Saves the note as it is, e.g. on leaving the box or the summary. */
    protected saveNote() {
        const id = this.entry()?.id;
        const note = this.noteModel().note;
        if (id && !this.noteForm().invalid() && note.trim() !== (this.entry()?.note ?? '')) {
            this.history.setNote(id, note);
        }
    }

    protected leave(to: 'back' | 'done' | 'viewHistory') {
        this.saveNote();
        this[to].emit();
    }

    /** Escape goes back to the workout, where there's one to go back to. */
    protected onEscape(event: Event) {
        event.stopPropagation();
        if (!this.finished()) {
            this.leave('back');
        }
    }

    // Dragging the sheet down by its grabber, on a phone, to go back to the workout. It follows
    // the finger 1:1 from where it was grabbed, resists being pulled up (rubber-banding), and
    // on letting go the flick decides: projected past halfway, it carries on down at the
    // finger's speed and goes back; otherwise it springs home, also from the finger's speed.
    // It can be grabbed again mid-spring, from wherever it is.

    private readonly sheet = viewChild.required<ElementRef<HTMLElement>>('sheet');
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly reducedMotion = injectPrefersReducedMotion();
    /** Gone by dragging, so it doesn't play its closing animation on top. */
    protected readonly draggedAway = signal(false);
    private dragging: {
        pointerId: number;
        startY: number;
        startOffset: number;
        offset: number;
        tracker: VelocityTracker;
    } | null = null;

    protected grab(event: PointerEvent) {
        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }
        const sheet = this.sheet().nativeElement;
        // Where it is on screen now, mid-spring included, and stop it there
        const offset = new DOMMatrix(getComputedStyle(sheet).transform).m42;
        this.host.nativeElement
            .getAnimations({ subtree: true })
            .forEach((animation) => animation.cancel());
        this.moveTo(offset);
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
        const tracker = new VelocityTracker();
        tracker.add(offset, event.timeStamp);
        this.dragging = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startOffset: offset,
            offset,
            tracker,
        };
    }

    protected drag(event: PointerEvent) {
        const dragging = this.dragging;
        if (!dragging || event.pointerId !== dragging.pointerId) {
            return;
        }
        const pulled = dragging.startOffset + event.clientY - dragging.startY;
        // Down follows the finger; up, past where it sits, resists more the further it goes
        const offset = pulled < 0 ? rubberband(pulled, this.height()) : pulled;
        dragging.offset = offset;
        dragging.tracker.add(offset, event.timeStamp);
        this.moveTo(offset);
    }

    protected async letGo(event: PointerEvent) {
        const dragging = this.dragging;
        if (!dragging || event.pointerId !== dragging.pointerId) {
            return;
        }
        this.dragging = null;
        const velocity = dragging.tracker.velocity(event.timeStamp);
        const height = this.height();
        // Where the flick would come to rest decides, not where the finger let go
        const away = dragging.offset + project(velocity) > height / 2;
        await this.springTo(away ? height : 0, dragging.offset, velocity);
        if (away) {
            this.draggedAway.set(true);
            this.leave('back');
        }
    }

    private height(): number {
        return this.sheet().nativeElement.offsetHeight || window.innerHeight;
    }

    /** Puts the sheet `offset` px down, and fades the dimming behind to match. */
    private moveTo(offset: number) {
        this.sheet().nativeElement.style.transform = `translateY(${offset}px)`;
        this.host.nativeElement.style.setProperty('--dim', String(this.dim(offset)));
    }

    /** How dimmed the page behind is with the sheet `offset` px down: fully at the top, not at all off the bottom. */
    private dim(offset: number): number {
        return 1 - Math.min(1, Math.max(0, offset / this.height()));
    }

    /**
     * Springs the sheet from `from` to `to` px down, setting off at the finger's `velocity`
     * (px/s), so there's no seam where the drag lets go. With reduced motion it's just there.
     */
    private async springTo(to: number, from: number, velocity: number) {
        const distance = to - from;
        this.moveTo(to);
        if (this.reducedMotion() || Math.abs(distance) < 1) {
            return;
        }
        // The spring wants speed as a share of the distance left per second
        const { easing, duration } = criticallyDampedSpring(0.3, {
            velocity: velocity / distance,
        });
        const timing = { duration, easing };
        // The dimming behind, on the host's ::before, fades with it
        this.host.nativeElement.animate([{ opacity: this.dim(from) }, { opacity: this.dim(to) }], {
            ...timing,
            pseudoElement: '::before',
        });
        await this.sheet()
            .nativeElement.animate(
                [{ transform: `translateY(${from}px)` }, { transform: `translateY(${to}px)` }],
                timing
            )
            .finished.catch(() => undefined);
    }
}
