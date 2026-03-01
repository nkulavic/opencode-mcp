import { createOpencodeClient } from "@opencode-ai/sdk";

type Client = ReturnType<typeof createOpencodeClient>;
let clientPromise: Promise<Client> | null = null;

const BASE_URL = `http://${process.env.OPENCODE_HOST ?? "127.0.0.1"}:${process.env.OPENCODE_PORT ?? "4096"}`;

async function waitForServer(maxAttempts = 10): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE_URL}/session`, {
        method: "GET",
        signal: AbortSignal.timeout(1000),
      });
      if (res.ok) return;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`OpenCode server not reachable at ${BASE_URL}`);
}

async function initClient(): Promise<Client> {
  await waitForServer();
  return createOpencodeClient({ baseUrl: BASE_URL });
}

export function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = initClient().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

export type OpenCodeClient = Client;
