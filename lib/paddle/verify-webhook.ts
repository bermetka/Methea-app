import { NodeRuntime, Webhooks, type EventEntity } from '@paddle/paddle-node-sdk'

/**
 * `Webhooks`' signature check delegates to a crypto provider that is only
 * ever registered by the `Paddle` client's constructor. Since this route
 * uses the standalone `Webhooks` class (no API key needed for signature
 * verification) and never constructs `Paddle`, that provider would
 * otherwise stay unset — `isValidSignature` then short-circuits to `false`
 * for every request, regardless of secret or timestamp. Registering it
 * directly here is what the SDK's own constructor does under the hood.
 */
NodeRuntime.initialize()

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
