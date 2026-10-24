import { DatePipe } from '@angular/common';
import { afterNextRender, Component, computed, inject, Injector, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MUSCLE_LABELS, MuscleGroup } from '../models/exercise';
import { HistoryEntry } from '../models/history';
import { BodyMapComponent } from '../shared/components/body-map/body-map.component';
import { injectPrefersReducedMotion } from '../shared/reduced-motion';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { HistoryStore } from '../shared/state/history-store.service';
import { HistoryEntryComponent } from './history-entry/history-entry.component';
import { entryName, formatDuration } from './history-format';

interface DayGroup {
    /** e.g. "2026-10-18", for tracking and ids. */
    key: string;
    /** "Today", "Yesterday", or the date. */
    label: string;
    /** For days before yesterday, the date to format; null for Today and Yesterday. */
    date: number | null;
    entries: HistoryEntry[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(time: number): string {
    const date = new Date(time);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Workouts by day. Arriving from the workout summary, `?run=<id>` highlights that run and
 * brings it into view, and `?note=<id>` does the same with its note box open.
 */
@Component({
    selector: 'app-history',
    imports: [BodyMapComponent, DatePipe, HistoryEntryComponent, RouterLink],
    templateUrl: './history.component.html',
    styleUrl: './history.component.scss',
    host: {
        // A click anywhere else closes an open menu
        '(document:click)': 'openMenuId.set(null)',
    },
})
export class HistoryComponent {
    private readonly history = inject(HistoryStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly injector = inject(Injector);
    private readonly reducedMotion = injectPrefersReducedMotion();
    private readonly now = Date.now();

    /** Workouts grouped by the day they started, newest first. */
    protected readonly groups = computed(() => {
        const today = dayKey(this.now);
        const yesterday = dayKey(this.now - DAY_MS);
        const groups: DayGroup[] = [];
        for (const entry of this.history.entries()) {
            const key = dayKey(entry.startedAt);
            let group = groups.at(-1);
            if (group?.key !== key) {
                const label = key === today ? 'Today' : key === yesterday ? 'Yesterday' : '';
                group = { key, label, date: label ? null : entry.startedAt, entries: [] };
                groups.push(group);
            }
            group.entries.push(entry);
        }
        return groups;
    });

    /** Workouts and time spent over the last seven days. */
    protected readonly lastWeek = computed(() => {
        const recent = this.history
            .entries()
            .filter((entry) => entry.startedAt >= this.now - 7 * DAY_MS);
        return {
            workouts: recent.length,
            time: formatDuration(recent.reduce((total, entry) => total + entry.activeSeconds, 0)),
        };
    });

    /**
     * Which muscles have been used in the last seven days (PRG-6): each set counts 1 for its
     * exercise's main muscles and ½ for supporting ones. A score of 1 or more shades as main.
     * Most worked first, A to Z on a tie.
     */
    protected readonly musclesWorked = computed(() => {
        const recent = this.history
            .entries()
            .filter((entry) => entry.startedAt >= this.now - 7 * DAY_MS);
        const counts = new Map<MuscleGroup, number>();

        for (const entry of recent) {
            for (const set of entry.sets ?? []) {
                const exercise = set.exerciseId ? this.exercises.byId(set.exerciseId) : undefined;
                if (!exercise) {
                    continue;
                }
                for (const muscle of exercise.mainMuscles) {
                    counts.set(muscle, (counts.get(muscle) ?? 0) + 1);
                }
                for (const muscle of exercise.supportingMuscles) {
                    counts.set(muscle, (counts.get(muscle) ?? 0) + 0.5);
                }
            }
        }

        const sorted = [...counts.entries()].sort(
            ([muscleA, scoreA], [muscleB, scoreB]) =>
                scoreB - scoreA || MUSCLE_LABELS[muscleA].localeCompare(MUSCLE_LABELS[muscleB])
        );

        const main = sorted.filter(([, score]) => score >= 1).map(([muscle]) => muscle);
        const supporting = sorted
            .filter(([, score]) => score > 0 && score < 1)
            .map(([muscle]) => muscle);
        const most = sorted.slice(0, 3).map(([muscle, score]) => {
            const count = score % 1 === 0 ? `${score}` : score.toFixed(1).replace(/\.0$/, '');
            return `${MUSCLE_LABELS[muscle]} (${count} ${score === 1 ? 'set' : 'sets'})`;
        });

        return {
            hasData: sorted.length > 0,
            main,
            supporting,
            most: most.length > 0 ? `Most worked: ${most.join(', ')}` : '',
        };
    });

    /** The workout just deleted, which can be put back. */
    protected readonly deleted = signal<HistoryEntry | null>(null);
    /** Whose menu is open, and whose note is being edited: one of each at most. */
    protected readonly openMenuId = signal<string | null>(null);
    protected readonly editingId = signal<string | null>(null);
    /** The run arrived at from the workout summary. */
    protected readonly highlightedId = signal<string | null>(null);

    protected readonly entryName = entryName;

    constructor() {
        const params = inject(ActivatedRoute).snapshot.queryParamMap;
        const noteFor = params.get('note');
        const run = noteFor ?? params.get('run');
        if (run && this.history.entries().some((entry) => entry.id === run)) {
            this.highlightedId.set(run);
            this.editingId.set(noteFor);
            this.bringIntoView(run, !noteFor);
        }
    }

    protected toggleMenu(id: string) {
        this.openMenuId.update((open) => (open === id ? null : id));
    }

    /** Closes a menu from inside it (Escape, or once it's done), returning focus to its button. */
    protected closeMenu(id: string) {
        if (this.openMenuId() !== id) {
            return;
        }
        this.openMenuId.set(null);
        this.focusAfterRender(`menu-${id}`);
    }

    protected editNote(id: string) {
        this.openMenuId.set(null);
        this.editingId.set(id);
    }

    protected closeNote(id: string) {
        if (this.editingId() === id) {
            this.editingId.set(null);
        }
    }

    protected delete(entry: HistoryEntry) {
        this.openMenuId.set(null);
        this.closeNote(entry.id);
        this.history.delete(entry.id);
        this.deleted.set(entry);
        this.focusAfterRender('history-undo');
    }

    protected undo() {
        const entry = this.deleted();
        if (!entry) {
            return;
        }
        this.history.restore(entry);
        this.deleted.set(null);
        this.focusAfterRender(`menu-${entry.id}`);
    }

    /**
     * Scrolls a run to the middle of the screen. Its note box takes focus itself when open;
     * otherwise the entry does, so a screen reader starts from it.
     */
    private bringIntoView(id: string, focus: boolean) {
        afterNextRender(
            () => {
                const element = document.getElementById(`entry-${id}`);
                element?.scrollIntoView({
                    block: 'center',
                    behavior: this.reducedMotion() ? 'auto' : 'smooth',
                });
                if (focus) {
                    element?.focus({ preventScroll: true });
                }
            },
            { injector: this.injector }
        );
    }

    private focusAfterRender(id: string) {
        afterNextRender(() => document.getElementById(id)?.focus(), { injector: this.injector });
    }
}
