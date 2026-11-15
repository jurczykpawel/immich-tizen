export interface PairServerOptions {
  staticDir?: string;
  tls?: { key: Buffer | string; cert: Buffer | string };
  keepAliveMs?: number;
  maxSubscribers?: number;
}
export interface RunningPairServer { port: number; close(): void }
export function createPairServer(options?: PairServerOptions): { listen(port: number, host?: string): Promise<RunningPairServer> };
