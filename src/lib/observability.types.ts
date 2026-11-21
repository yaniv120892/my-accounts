export type FailureReport = {
  error: unknown;
  /** The log message and Sentry `where` tag. */
  where: string;
  /** Ids and fixed labels only: they reach Sentry as tags. */
  context?: Record<string, string>;
  /** What the hourly alert cap counts; never an id. */
  alertType: string;
  alertTitle: string;
};
