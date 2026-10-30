import { isSignInReturn, sendSignInToAccount } from './sign-in-landing';

describe('a sign-in coming back', () => {
    const at = (pathname: string, hash = '', search = '') =>
        ({ pathname, hash, search }) as Location;

    it("is the tokens, or why it didn't work, in the address", () => {
        expect(isSignInReturn(at('/', '#access_token=abc&refresh_token=def'))).toBe(true);
        expect(isSignInReturn(at('/', '#error=access_denied&error_code=otp_expired'))).toBe(true);
        expect(isSignInReturn(at('/', '', '?error=access_denied&error_description=No'))).toBe(true);
        expect(isSignInReturn(at('/home'))).toBe(false);
        expect(isSignInReturn(at('/history', '', '?run=run-1'))).toBe(false);
    });

    it('goes on to the Account tab, keeping the tokens, from wherever it landed', () => {
        const history = { state: null, replaceState: vi.fn() } as unknown as History;

        sendSignInToAccount(at('/', '#access_token=abc'), history);

        expect(history.replaceState).toHaveBeenCalledWith(null, '', '/account#access_token=abc');
    });

    it('leaves the address alone on the Account tab, or with no sign-in in it', () => {
        const history = { state: null, replaceState: vi.fn() } as unknown as History;

        sendSignInToAccount(at('/account', '#access_token=abc'), history);
        sendSignInToAccount(at('/home'), history);

        expect(history.replaceState).not.toHaveBeenCalled();
    });
});
