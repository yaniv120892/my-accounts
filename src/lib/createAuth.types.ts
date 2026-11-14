/** Where a code was asked for: its language comes from this request's cookie and headers. */
export type SignInCodeRequest = { url: string; headers: Headers };

export type SignInCode = { email: string; code: string; request: SignInCodeRequest };

/** Delivers a sign-in code; must never reject, since it runs after the response. */
export type SignInCodeSender = (signInCode: SignInCode) => Promise<void>;
