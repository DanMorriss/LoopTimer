import { DatePipe } from '@angular/common';
import { afterNextRender, Component, computed, inject, Injector, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { HistoryEntry } from '../models/history';
import { HistoryStore } from '../shared/state/history-store.service';

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

/** e.g. 75 → "1:15", 3725 → "1:02:05" */
export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** e.g. "3 rounds", "2 of 5 rounds · stopped", "12 rounds · until stopped" */
export function describeRounds(entry: HistoryEntry): string {
    const rounds = (n: number) => `${n} ${n === 1 ? 'round' : 'rounds'}`;
    if (entry.totalRounds === 0) {
        return `${rounds(entry.roundsCompleted)} · until stopped`;
    }
    if (entry.outcome === 'stopped') {
        return `${entry.roundsCompleted} of ${rounds(entry.totalRounds)} · stopped`;
    }
    return rounds(entry.roundsCompleted);
}

function dayKey(time: number): string {
    const date = new Date(time);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

@Component({
    selector: 'app-history',
    imports: [DatePipe, MatIconModule, RouterLink],
    templateUrl: './history.component.html',
    styleUrl: './history.component.scss',
})
export class HistoryComponent {
    private readonly history = inject(HistoryStore);
    private readonly injector = inject(Injector);
    private readonly now = Date.now();

    protected readonly formatDuration = formatDuration;
    protected readonly describeRounds = describeRounds;

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

    /** The workout just deleted, which can be put back. */
    protected readonly deleted = signal<HistoryEntry | null>(null);

    protected name(entry: HistoryEntry): string {
        return entry.title.trim() || 'Untitled timer';
    }

    protected delete(entry: HistoryEntry) {
        this.history.delete(entry.id);
        this.deleted.set(entry);
        this.focusAfterRender('history-undo');
    }

    protected undo() {
        const entry = this.deleted();
        if (!entry) {
            return;
        }
        this.history.record(entry);
        this.deleted.set(null);
        this.focusAfterRender(`delete-${entry.id}`);
    }

    private focusAfterRender(id: string) {
        afterNextRender(() => document.getElementById(id)?.focus(), { injector: this.injector });
    }
}
