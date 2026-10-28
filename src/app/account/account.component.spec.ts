import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    FakeAccountClient,
    fakeAccountClient,
    provideFakeAccountClient,
} from '../shared/testing/fake-account-client';
import { AccountComponent } from './account.component';

describe('AccountComponent', () => {
    let fixture: ComponentFixture<AccountComponent>;
    let element: HTMLElement;
    let client: FakeAccountClient;

    async function create(signedInAs: string | null = null) {
        client = fakeAccountClient(signedInAs);
        TestBed.configureTestingModule({ providers: [provideFakeAccountClient(client)] });
        fixture = TestBed.createComponent(AccountComponent);
        element = fixture.nativeElement;
        document.body.appendChild(element);
        await settle();
    }
    afterEach(() => {
        fixture.destroy();
        element.remove();
    });

    async function settle() {
        await new Promise((resolve) => setTimeout(resolve));
        await fixture.whenStable();
    }

    const text = () => element.textContent!.replace(/\s+/g, ' ');
    const status = () => element.querySelector('[role="status"]')!.textContent!.trim();
    const button = (label: string) =>
        [...element.querySelectorAll('button')].find((b) => b.textContent!.trim() === label)!;
    async function press(label: string) {
        button(label).click();
        await settle();
    }
    async function type(id: string, value: string) {
        const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
        input.value = value;
        input.dispatchEvent(new Event('input'));
        await settle();
    }

    describe('signed out', () => {
        beforeEach(() => create());

        it('asks for an email to send a sign-in link to, saying an account is optional', () => {
            expect(text()).toContain('An account is optional');
            const input = element.querySelector<HTMLInputElement>('#account-email')!;
            expect(input.type).toBe('email');
            expect(input.autocomplete).toBe('email');
            expect(button('Email me a sign-in link')).toBeTruthy();
            // No error until something's been tried
            expect(element.querySelector('#account-email-error')).toBeNull();
        });

        it("says what's wrong with the email, on the field, and doesn't send", async () => {
            await press('Email me a sign-in link');

            const input = element.querySelector<HTMLInputElement>('#account-email')!;
            expect(element.querySelector('#account-email-error')!.textContent).toBe(
                'Enter your email address.'
            );
            expect(input.getAttribute('aria-invalid')).toBe('true');
            expect(input.getAttribute('aria-describedby')).toContain('account-email-error');
            expect(document.activeElement).toBe(input);

            await type('account-email', 'not an email');
            expect(element.querySelector('#account-email-error')!.textContent).toBe(
                "That isn't an email address. Check it and try again."
            );
            expect(client.auth.signInWithOtp).not.toHaveBeenCalled();
        });

        it('sends the link, then asks for the code from the email', async () => {
            await type('account-email', ' me@example.com ');
            await press('Email me a sign-in link');

            expect(client.auth.signInWithOtp).toHaveBeenCalledWith(
                expect.objectContaining({ email: 'me@example.com' })
            );
            expect(text()).toContain("We've sent a sign-in link to me@example.com.");
            expect(document.activeElement!.id).toBe('account-sent');
            const code = element.querySelector<HTMLInputElement>('#account-code')!;
            expect(code.inputMode).toBe('numeric');
            expect(code.autocomplete).toBe('one-time-code');
        });

        it('signs in with the code, saying so', async () => {
            await type('account-email', 'me@example.com');
            await press('Email me a sign-in link');
            await type('account-code', '123456');
            await press('Sign in');

            expect(client.auth.verifyOtp).toHaveBeenCalledWith({
                email: 'me@example.com',
                token: '123456',
                type: 'email',
            });
            expect(status()).toBe('Signed in.');
            expect(text()).toContain('Signed in as me@example.com.');
            expect(document.activeElement!.id).toBe('account-title');
        });

        it("says when a code didn't work, or isn't one", async () => {
            await type('account-email', 'me@example.com');
            await press('Email me a sign-in link');
            await type('account-code', '12');
            await press('Sign in');
            expect(element.querySelector('#account-code-error')!.textContent).toBe(
                'The code is the number in the email, e.g. 123456.'
            );
            expect(client.auth.verifyOtp).not.toHaveBeenCalled();

            client.auth.verifyOtp.mockResolvedValueOnce({ data: {}, error: { status: 403 } });
            await type('account-code', '654321');
            await press('Sign in');
            expect(status()).toBe(
                "That code didn't work: it may be wrong, or expired. Check it, or send another email."
            );
        });

        it('goes back to the email on Use another email', async () => {
            await type('account-email', 'me@example.com');
            await press('Email me a sign-in link');
            await press('Use another email');

            expect(document.activeElement!.id).toBe('account-email');
        });

        it("says when the email couldn't be sent, or too many have been", async () => {
            await type('account-email', 'me@example.com');
            client.auth.signInWithOtp.mockResolvedValueOnce({ data: {}, error: { status: 429 } });
            await press('Email me a sign-in link');
            expect(status()).toBe('Too many sign-in emails for now. Wait a while, then try again.');

            client.auth.signInWithOtp.mockResolvedValueOnce({ data: {}, error: { status: 500 } });
            await press('Email me a sign-in link');
            expect(status()).toBe(
                "The email couldn't be sent. Check your connection and try again."
            );
            expect(element.querySelector('#account-code')).toBeNull();
        });
    });

    describe('signed in', () => {
        beforeEach(() => create('me@example.com'));

        it('says who, that sync is coming, and that clearing the device signs it out', () => {
            expect(text()).toContain('Signed in as me@example.com.');
            expect(text()).toContain('Sync is on its way');
            expect(text()).toContain('That signs this device out too');
            expect(element.querySelector('#account-email')).toBeNull();
        });

        it('signs out, keeping the data on the device', async () => {
            await press('Sign out');

            expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
            expect(status()).toBe('Signed out. Your data is still on this device.');
            expect(element.querySelector('#account-email')).not.toBeNull();
        });

        it('asks before deleting the account, with focus on the warning', async () => {
            await press('Delete account');

            const warning = element.querySelector('#account-delete-warning')!;
            expect(warning.textContent).toContain("It can't be undone.");
            expect(document.activeElement).toBe(warning);
            expect(client.rpc).not.toHaveBeenCalled();

            await press('Cancel');
            expect(document.activeElement!.id).toBe('account-delete');
        });

        it('deletes the account, then says the data is still here', async () => {
            await press('Delete account');
            await press('Delete my account');

            expect(client.rpc).toHaveBeenCalledWith('delete_my_account');
            expect(status()).toBe(
                'Your account has been deleted. Your data is still on this device.'
            );
            expect(element.querySelector('#account-email')).not.toBeNull();
        });

        it("says when the account couldn't be deleted", async () => {
            client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'failed' } });
            await press('Delete account');
            await press('Delete my account');

            expect(status()).toBe(
                "Your account couldn't be deleted. Check your connection and try again."
            );
            expect(text()).toContain('Signed in as me@example.com.');
        });
    });
});
