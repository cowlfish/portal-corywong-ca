import type { MlsFeedProvider, MlsFeedProviderConfig } from "../types";
import { AmpreResoProvider } from "./ampre-reso";

const providers: Record<string, () => MlsFeedProvider> = {
  "ampre-reso": () => new AmpreResoProvider(),
};

export async function createProvider(
  name: string,
  config: MlsFeedProviderConfig
): Promise<MlsFeedProvider> {
  const factory = providers[name];
  if (!factory) {
    throw new Error(
      `Unknown feed provider: ${name}. Available: ${Object.keys(providers).join(", ")}`
    );
  }
  const provider = factory();
  await provider.initialize(config);
  return provider;
}

export function getAvailableProviders(): string[] {
  return Object.keys(providers);
}
