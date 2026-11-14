export type TrustedClientRequest = {
  /** Shown nowhere a person signs in, since trusted clients skip consent; for the operator. */
  name: string;
  /** Exact URIs; the authorize request must name one of them. */
  redirectUris: string[];
  /** An existing account that owns the client, recorded on its row. */
  ownerEmail: string;
};

export type CreatedClient = { clientId: string; clientSecret: string };
