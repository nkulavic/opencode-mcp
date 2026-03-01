import { createOpencode } from "@opencode-ai/sdk";

type Client = Awaited<ReturnType<typeof createOpencode>>["client"];
let clientPromise: Promise<Client> | null = null;

export function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = createOpencode({
      hostname: "127.0.0.1",
      port: 4096,
    }).then(({ client }) => client);
  }
  return clientPromise;
}

export type OpenCodeClient = Client;
