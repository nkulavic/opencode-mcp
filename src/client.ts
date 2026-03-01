import { createOpencode, createOpencodeClient } from "@opencode-ai/sdk";

let clientInstance: Awaited<ReturnType<typeof createOpencode>>["client"] | null = null;

export async function getClient() {
  if (clientInstance) return clientInstance;

  const { client } = await createOpencode({
    hostname: "127.0.0.1",
    port: 4096,
  });

  clientInstance = client;
  return client;
}

export type OpenCodeClient = Awaited<ReturnType<typeof getClient>>;
