import {
    afterNextRender,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    Injector,
    input,
    linkedSignal,
    output,
    untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { form, FormField, maxLength } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { HistoryEntry, MAX_NOTE_LENGTH } from '../../models/history';
import { HistoryStore } from '../../shared/state/history-store.service';
import { describeRounds, entryName, formatDuration } from '../history-format';

/**
 * One workout in the history, with a ⋮ menu to add, edit or remove its note, or delete it.
 * The history decides which entry's menu is open and which note is being edited (one of
 * each at a time); the entry shows that, saves notes itself, and asks the history to
 * delete it, so the history can offer Undo.
 */
@Component({
    selector: 'li[appHistoryEntry]',
    imports: [DatePipe, FormField, MatIconModule],
    templateUrl: './history-entry.component.html',
    styleUrl: './history-entry.component.scss',
    host: {
        class: 'entry',
        '[id]': "'entry-' + entry().id",
        // Focusable from code only, for arriving from the finished screen
        tabindex: '-1',
        '[class.entry--stopped]': "entry().outcome === 'stopped'",
        '[class.entry--highlighted]': 'highlighted()',
        '[class.entry--menu-open]': 'menuOpen()',
    },
})
export class HistoryEntryComponent {
    private readonly history = inject(HistoryStore);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);

    readonly entry = input.required<HistoryEntry>();
    /** Whether this entry's menu is open. */
    readonly menuOpen = input(false);
    /** Whether its note is being added or edited. */
    readonly editing = input(false);
    /** The run just finished, when arriving from the finished screen. */
    readonly highlighted = input(false);

    readonly menuToggled = output<void>();
    readonly menuClosed = output<void>();
    readonly editRequested = output<void>();
    readonly editClosed = output<void>();
    readonly deleteRequested = output<void>();

    protected readonly name = computed(() => entryName(this.entry()));
    protected readonly duration = computed(() => formatDuration(this.entry().activeSeconds));
    protected readonly rounds = computed(() => describeRounds(this.entry()));
    protected readonly id = computed(() => this.entry().id);

    // The box starts from the saved note each time it opens
    private readonly noteModel = linkedSignal(() => {
        this.editing();
        return { note: this.entry().note ?? '' };
    });
    protected readonly noteForm = form(this.noteModel, (note) =>
        maxLength(note.note, MAX_NOTE_LENGTH)
    );

    constructor() {
        // Into the note box as it opens, from the menu or straight from the finished screen
        effect(() => {
            if (this.editing()) {
                untracked(() => this.focusAfterRender(`#note-${CSS.escape(this.id())}`));
            }
        });
    }

    /**
     * Saves the note and closes the box. Handled here rather than as a form submission: the
     * box closes as it saves, and a form taken away mid-submission stays "submitting".
     */
    protected saveNote(event: Event) {
        event.preventDefault();
        if (this.noteForm().invalid()) {
            return;
        }
        this.history.setNote(this.id(), this.noteModel().note);
        this.closeEditor();
    }

    protected cancelEdit(event?: Event) {
        // Escape in the box shouldn't also reach anything around it
        event?.stopPropagation();
        this.closeEditor();
    }

    protected removeNote() {
        this.history.setNote(this.id(), '');
        this.menuClosed.emit();
    }

    private closeEditor() {
        this.editClosed.emit();
        this.focusAfterRender(`#menu-${CSS.escape(this.id())}`);
    }

    private focusAfterRender(selector: string) {
        afterNextRender(
            () => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(),
            { injector: this.injector }
        );
    }
}
