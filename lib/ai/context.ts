import { z } from "zod";

/**
 * Per-request data the tools can read through `runtime.context`.
 * The model never sees this object: the login token stays on the server.
 */
export const chatContextSchema = z.object({
  /** The Route API token, if the user is signed in. Verified by the API route before use. */
  token: z.string().optional(),
  /** Set by the API route from the verified token, never taken from the client. */
  user: z.object({ id: z.string(), name: z.string() }).optional(),
  /** Snapshot of the browser cart, sent by the chat widget. */
  cart: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        price: z.number(),
        quantity: z.number().int(),
      }),
    )
    .max(50)
    .default([]),
});

export type ChatContext = z.infer<typeof chatContextSchema>;
