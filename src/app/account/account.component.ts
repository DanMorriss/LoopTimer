import {
    afterNextRender,
    Component,
    computed,
    DOCUMENT,
    inject,
    Injector,
    signal,
} from '@angular/core';
import { email, form, FormField, pattern, required } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { PageSlide } from '../nav/page-slide';
import { LoopLogoComponent } from '../shared/components/loop-logo/loop-logo.component';
import { SyncStarter } from '../sync/sync-starter.service';
import { syncText } from '../sync/sync-text';
import { AccountService } from './account.service';
import { ProfileComponent } from './profile/profile.component';
import { YourDataComponent } from './your-data/your-data.component';

/**
 * The Account tab (SYN-3, SYN-8, SYN-9): signing in by an email link or its code, who's
 * signed in and how sync is going, signing out and deleting the account; then your profile
 * (sex and weight units), Settings, which slides in over it, your data (backups and Clear
 * this device), and About.
 */
@Component({
    selector: 'app-account',
    imports: [FormField, LoopLogoComponent, MatIconModule, ProfileComponent, YourDataComponent],
    templateUrl: './account.component.html',
    styleUrl: './account.component.scss',
})
export class AccountComponent {
    protected readonly account = inject(AccountService);
    /** Into Settings, the Privacy notice and Terms of use. */
    protected readonly slide = inject(PageSlide);
    private readonly injector = inject(Injector);
    private readonly document = inject(DOCUMENT);

    /** The email signed in with, or empty when no one is. */
    protected readonly signedInAs = computed(() => {
        const state = this.account.state();
        return state.status === 'signed-in' ? state.email : '';
    });

    private readonly sync = inject(SyncStarter);
    /** How sync is going, e.g. "Synced at 12:30." */
    protected readonly syncText = computed(() => syncText(this.sync.status()));

    /** Where the email was sent, once it has been: then the code is asked for. */
    protected readonly sentTo = signal<string | null>(null);
    /** Waiting on the server, so the buttons can't be pressed twice. */
    protected readonly busy = signal(false);
    /** What the last thing done did, read out as it changes. */
    protected readonly message = signal('');
    /** Delete account was pressed: its warning is open. */
    protected readonly confirmingDelete = signal(false);

    private readonly emailModel = signal({ email: '' });
    protected readonly emailForm = form(this.emailModel, (fields) => {
        required(fields.email, { message: 'Enter your email address.' });
        email(fields.email, { message: "That isn't an email address. Check it and try again." });
    });
    protected readonly emailError = computed(() =>
        this.emailForm.email().touched()
            ? this.emailForm.email().errors().at(0)?.message
            : undefined
    );

    private readonly codeModel = signal({ code: '' });
    protected readonly codeForm = form(this.codeModel, (fields) => {
        required(fields.code, { message: 'Enter the code from the email.' });
        pattern(fields.code, /^\s*\d{6,10}\s*$/, {
            message: 'The code is the number in the email, e.g. 123456.',
        });
    });
    protected readonly codeError = computed(() =>
        this.codeForm.code().touched() ? this.codeForm.code().errors().at(0)?.message : undefined
    );

    /**
     * Sends the sign-in email. Handled here rather than as a form submission, as the form
     * goes once it's sent, and a form taken away mid-submission stays "submitting".
     */
    protected async sendLink(event: Event) {
        event.preventDefault();
        this.emailForm.email().markAsTouched();
        if (this.emailForm().invalid()) {
            this.focus('account-email');
            return;
        }
        const address = this.emailModel().email.trim();
        this.busy.set(true);
        const result = await this.account.sendLink(address);
        this.busy.set(false);
        if (result === 'sent') {
            this.message.set('');
            this.account.linkProblem.set(null);
            this.sentTo.set(address);
            this.focus('account-sent');
        } else {
            this.message.set(
                result === 'too-many'
                    ? 'Too many sign-in emails for now. Wait a while, then try again.'
                    : "The email couldn't be sent. Check your connection and try again."
            );
        }
    }

    protected async enterCode(event: Event) {
        event.preventDefault();
        const address = this.sentTo();
        this.codeForm.code().markAsTouched();
        if (!address || this.codeForm().invalid()) {
            this.focus('account-code');
            return;
        }
        this.busy.set(true);
        const signedIn = await this.account.enterCode(address, this.codeModel().code.trim());
        this.busy.set(false);
        if (signedIn) {
            this.reset('Signed in.');
        } else {
            this.message.set(
                "That code didn't work: it may be wrong, or expired. Check it, or send another email."
            );
        }
    }

    /** Back to the email field, e.g. to fix a typo in it. */
    protected useAnotherEmail() {
        this.sentTo.set(null);
        this.message.set('');
        this.codeModel.set({ code: '' });
        this.focus('account-email');
    }

    protected async signOut() {
        this.busy.set(true);
        const done = await this.account.signOut();
        this.busy.set(false);
        if (done) {
            this.reset('Signed out. Your data is still on this device.');
        } else {
            this.message.set("You couldn't be signed out. Check your connection and try again.");
        }
    }

    protected askToDelete() {
        this.confirmingDelete.set(true);
        this.focus('account-delete-warning');
    }

    protected cancelDelete() {
        this.confirmingDelete.set(false);
        this.focus('account-delete');
    }

    protected async deleteAccount() {
        this.busy.set(true);
        const deleted = await this.account.deleteAccount();
        this.busy.set(false);
        if (deleted) {
            this.confirmingDelete.set(false);
            this.reset('Your account has been deleted. Your data is still on this device.');
        } else {
            this.message.set(
                "Your account couldn't be deleted. Check your connection and try again."
            );
        }
    }

    /** Back to the start, saying what happened, with focus on the page's title. */
    private reset(message: string) {
        this.sentTo.set(null);
        this.emailModel.set({ email: '' });
        this.codeModel.set({ code: '' });
        this.emailForm().reset();
        this.codeForm().reset();
        this.message.set(message);
        this.focus('account-title');
    }

    /** Moves focus to an element once it's on the page. */
    private focus(id: string) {
        afterNextRender(() => this.document.getElementById(id)?.focus(), {
            injector: this.injector,
        });
    }
}
