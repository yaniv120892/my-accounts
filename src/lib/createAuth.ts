import { oauthProvider } from '@better-auth/oauth-provider';
import { waitUntil } from '@vercel/functions';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware, isAPIError } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP, jwt } from 'better-auth/plugins';
import { z } from 'zod';

import { appBaseUrl, appOrigins } from './appUrl';
import {
  CODE_SIGN_IN_PATH,
  CONSENT_PAGE,
  SEND_SIGN_IN_CODE_PATH,
  SIGN_IN_PAGE,
  SOCIAL_CALLBACK_PATH,
  SOCIAL_SIGN_IN_PATH,
} from './authPaths';
import {
  allowsLocalDevelopmentRedirect,
  googleCredentials,
  identityClaims,
  signInMethodOf,
  trustedClientIds,
} from './authSettings';
import type { SignInCodeAdmission, SignInCodeSender } from './createAuth.types';
import { prisma } from './db';
import { hashForLog } from './logFields';
import { logger, reportAndAlert } from './observability';
import {
  SIGN_IN_CODE_ALLOWED_ATTEMPTS,
  SIGN_IN_CODE_LENGTH,
  SIGN_IN_CODE_TTL_SECONDS,
} from './signInCode';

/**
 * Better Auth routes no browser may reach. Clients are created only by `scripts/create-client.mts`
 * through the server-only admin API; these are the routes a signed-in person could otherwise use
 * to register, read or change one. `/token` is the JWT plugin's session-token route, which the
 * OIDC provider's `/oauth2/token` replaces. The email-otp routes other than sign-in would store
 * codes this app never mails: there are no passwords to reset and no address changes.
 */
export const DISABLED_AUTH_PATHS = [
  '/token',
  '/email-otp/check-verification-otp',
  '/email-otp/verify-email',
  '/email-otp/request-password-reset',
  '/forget-password/email-otp',
  '/email-otp/reset-password',
  '/email-otp/request-email-change',
  '/email-otp/change-email',
  '/oauth2/register',
  '/oauth2/create-client',
  '/oauth2/get-client',
  '/oauth2/get-clients',
  '/oauth2/update-client',
  '/oauth2/delete-client',
  '/oauth2/client/rotate-secret',
  '/oauth2/client/rotate-keys',
];

const SIGN_IN_PATHS = new Set([CODE_SIGN_IN_PATH, SOCIAL_SIGN_IN_PATH, SOCIAL_CALLBACK_PATH]);
const MINUTE_SECONDS = 60;

const SIGN_IN_CODE_TYPE = 'sign-in';

/** What the code request posts; a malformed one is left for the endpoint to refuse. */
const codeRequestSchema = z.object({
  email: z
    .string()
    .transform((email) => email.toLowerCase())
    .pipe(z.email()),
  type: z.string(),
});

type CreateAuthOptions = {
  admitSignInCode: SignInCodeAdmission;
  sendSignInCode: SignInCodeSender;
  /** Read once at boot; a test passes its own set and adds the clients it creates. */
  trustedClients?: Set<string>;
};

type BetterAuthLogLevel = 'debug' | 'info' | 'warn' | 'error';

/** The mail callback the email-otp plugin calls once it has stored a code. */
type VerificationCodeMailer = NonNullable<Parameters<typeof emailOTP>[0]>['sendVerificationOTP'];

/**
 * The one Better Auth configuration. `src/lib/auth.ts` builds the app's instance from it; the
 * integration suite builds its own with a sender that keeps the code instead of mailing it, so
 * every other setting it exercises is the production one.
 */
export function createAuth({
  admitSignInCode,
  sendSignInCode,
  trustedClients = trustedClientIds(),
}: CreateAuthOptions) {
  const baseURL = appBaseUrl();
  const google = googleCredentials();

  return betterAuth({
    appName: 'My account',
    baseURL,
    trustedOrigins: appOrigins(),
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    disabledPaths: DISABLED_AUTH_PATHS,
    session: {
      storeSessionInDatabase: true,
    },
    socialProviders: google ? { google: { ...google, prompt: 'select_account' } } : {},
    rateLimit: {
      enabled: true,
      // Shared by every serverless instance; memory would give each one its own count.
      storage: 'database',
      // Session reads are the hottest route and spend nothing, so they cost no counter write.
      // Every other route keeps Better Auth's own limit (the token endpoint's included).
      customRules: {
        [SEND_SIGN_IN_CODE_PATH]: { window: 15 * MINUTE_SECONDS, max: 10 },
        [CODE_SIGN_IN_PATH]: { window: 15 * MINUTE_SECONDS, max: 30 },
        '/get-session': false,
      },
    },
    advanced: {
      // The mail goes out after the response, so its timing says nothing about the address.
      backgroundTasks: { handler: waitUntil },
    },
    logger: { level: 'warn', log: logBetterAuth },
    hooks: {
      before: admitSignInCodeBeforeStoring(admitSignInCode),
      after: createAuthMiddleware(async (context) => {
        logSignInOutcome({
          path: context.path,
          returned: context.context.returned,
          newSession: context.context.newSession,
        });
      }),
    },
    plugins: [
      emailOTP({
        otpLength: SIGN_IN_CODE_LENGTH,
        expiresIn: SIGN_IN_CODE_TTL_SECONDS,
        allowedAttempts: SIGN_IN_CODE_ALLOWED_ATTEMPTS,
        storeOTP: 'hashed',
        sendVerificationOTP: mailSignInCodes({ sendSignInCode, baseURL }),
      }),
      jwt({ disableSettingJwtHeader: true }),
      oauthProvider({
        loginPage: SIGN_IN_PAGE,
        consentPage: CONSENT_PAGE,
        scopes: ['openid', 'profile', 'email', 'offline_access'],
        cachedTrustedClients: trustedClients,
        allowDynamicClientRegistration: false,
        // Reached only through the server-only admin API; every client route over HTTP is disabled.
        clientPrivileges: ({ action }) => action === 'create',
        allowInsecureRedirectUri: (url) => allowsLocalDevelopmentRedirect({ url }),
        customIdTokenClaims: ({ user, scopes }) => identityClaims({ user, scopes }),
      }),
      // Last, so a server action that signs in or out sets its cookies.
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * Better Auth stores the new code before it calls the mailer, voiding the one the person has, so
 * a mail the budget refuses must stop here, before any code is made. Only sign-in codes are ever
 * mailed, so no other type is let through to be stored.
 */
function admitSignInCodeBeforeStoring(admitSignInCode: SignInCodeAdmission) {
  return createAuthMiddleware(async function admitBeforeStoringCode(context) {
    if (context.path !== SEND_SIGN_IN_CODE_PATH) {
      return;
    }
    const codeRequest = codeRequestSchema.safeParse(context.body);
    if (!codeRequest.success) {
      return;
    }
    if (codeRequest.data.type !== SIGN_IN_CODE_TYPE) {
      throw new APIError('BAD_REQUEST', { message: 'Only sign-in codes are sent.' });
    }
    const isAdmitted = await admitSignInCode(codeRequest.data.email);
    if (!isAdmitted) {
      return context.json({ success: true });
    }
  });
}

function mailSignInCodes({
  sendSignInCode,
  baseURL,
}: {
  sendSignInCode: SignInCodeSender;
  baseURL: string;
}): VerificationCodeMailer {
  return async function mailSignInCode({ email, otp, type }, endpointContext) {
    if (type !== SIGN_IN_CODE_TYPE) {
      logger.info({ type }, 'verification_code_ignored');
      return;
    }
    await sendSignInCode({
      email,
      code: otp,
      request: {
        url: endpointContext?.request?.url ?? baseURL,
        headers: endpointContext?.headers ?? new Headers(),
      },
    });
  };
}

function logSignInOutcome({
  path,
  returned,
  newSession,
}: {
  path: string | undefined;
  returned: unknown;
  newSession: { user: { id: string; email: string } } | null;
}): void {
  const isSignInPath = path !== undefined && SIGN_IN_PATHS.has(path);
  if (!isSignInPath) {
    return;
  }
  const method = signInMethodOf(path);
  if (newSession) {
    logger.info(
      {
        method,
        userId: newSession.user.id,
        emailHash: hashForLog(newSession.user.email),
        ship: true,
      },
      'signed_in',
    );
    return;
  }
  if (isAPIError(returned)) {
    // Logged, never reported to Sentry: a wrong or expired code is a person's slip, not a fault.
    logger.info(
      { method, status: returned.statusCode, code: returned.body?.code ?? null, ship: true },
      'sign_in_failed',
    );
  }
}

/**
 * Better Auth's own log lines, through the app's logger. Only the message and an error's name go
 * in: the other arguments can carry the request body, an address included.
 *
 * Better Auth answers its own 500s, so they never reach `onRequestError`; an unexpected error it
 * logs is reported and alerted here instead. An `APIError` is an answer it chose, not a fault.
 */
function logBetterAuth(level: BetterAuthLogLevel, message: string, ...rest: unknown[]): void {
  const error = rest.find((argument) => argument instanceof Error);
  const fields = { source: 'better-auth', errorName: error?.name ?? null };
  switch (level) {
    case 'error':
      logger.error(fields, message);
      if (error && !isAPIError(error)) {
        reportAndAlert({
          error,
          where: 'better_auth',
          alertType: 'auth_server_error',
          alertTitle: 'Sign-in server error',
        });
      }
      break;
    case 'warn':
      logger.warn(fields, message);
      break;
    default:
      logger.info(fields, message);
  }
}
