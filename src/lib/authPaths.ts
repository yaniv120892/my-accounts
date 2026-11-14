/** This app's pages that Better Auth sends a person to. Client-safe: no server imports. */
export const SIGN_IN_PAGE = '/sign-in';
export const CONSENT_PAGE = '/consent';

/** Better Auth's route paths as `context.path` reports them, relative to `/api/auth`. */
export const SEND_SIGN_IN_CODE_PATH = '/email-otp/send-verification-otp';
export const CODE_SIGN_IN_PATH = '/sign-in/email-otp';
export const SOCIAL_SIGN_IN_PATH = '/sign-in/social';
export const SOCIAL_CALLBACK_PATH = '/callback/:id';
