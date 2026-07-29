export type ArcaCredentials = {
  token: string;
  sign: string;
  cuit: string;
};

export type ArcaObservation = {
  code: number;
  message: string;
};

export type ArcaAuthorizationResult = {
  result: "A" | "R";
  voucherNumber: number;
  cae?: string;
  caeExpiresAt?: string;
  observations?: ArcaObservation[];
};

