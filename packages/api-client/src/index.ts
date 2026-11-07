/**
 * @oddly/api-client
 * Universal typed API client for web and worker services.
 */

export interface OddlyClientConfig {
  baseUrl: string;
  fetchFn?: typeof fetch;
}

export class OddlyApiClient {
  private baseUrl: string;
  private fetchFn: typeof fetch;

  constructor(config: OddlyClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.fetchFn = config.fetchFn ?? fetch;
  }

  async getHealth(): Promise<{ ok: boolean; service: string; time: string }> {
    const res = await this.fetchFn(`${this.baseUrl}/health`);
    if (!res.ok) {
      throw new Error(`Health check failed with status: ${res.status}`);
    }
    return res.json();
  }
}

