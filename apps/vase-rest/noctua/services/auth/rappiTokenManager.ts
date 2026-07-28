export class RappiTokenManager {
  private static instance: RappiTokenManager;
  private token: string | null = null;
  private tokenExpiry: number | null = null;

  private constructor() {}

  static getInstance(): RappiTokenManager {
    if (!RappiTokenManager.instance) {
      RappiTokenManager.instance = new RappiTokenManager();
    }
    return RappiTokenManager.instance;
  }

  async getToken(): Promise<string> {
    // If token exists and has more than 24 hours left, return it
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry - 86400000) {
      return this.token;
    }

    // Otherwise, refresh the token
    await this.refreshToken();
    return this.token as string;
  }

  private async refreshToken(): Promise<void> {
    // TODO: Replace with actual token refresh logic from Rappi API
    // For now, just use the token from env and set expiry to 7 days from now
    this.token = process.env.RAPPI_BEARER_TOKEN || '';
    this.tokenExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  }
}
