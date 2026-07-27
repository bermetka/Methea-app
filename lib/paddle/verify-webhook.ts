import { Webhooks, type EventEntity } from '@paddle/paddle-node-sdk'

/**
 * Verifies a Paddle webhook signature and returns the parsed event.
 *
 * Note: unlike the rest of the SDK, `Webhooks` needs no API key or Paddle
 * client instance — signature verification is a purely local HMAC check
 * against the webhook secret (see `WebhooksValidator.isValidSignature`),
 * with no network call to Paddle. `Webhooks.unmarshal` throws on an
 * invalid/malformed signature; we catch that and return null so the
 * webhook route (Task 13) can cleanly respond with 401.
 */
export async function verifyPaddleWebhook(
  rawBody: string,
  signatureHeader: string,
  secret: string
): Promise<EventEntity | null> {
  try {
    return await new Webhooks().unmarshal(rawBody, secret, signatureHeader)
  } catch {
    return null
  }
}
