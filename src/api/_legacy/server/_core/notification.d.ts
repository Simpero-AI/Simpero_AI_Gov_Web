export type NotificationPayload = {
    title: string;
    content: string;
};
/**
 * Dispatches **`NOTIFY_OWNER_WEBHOOK_URL`** (JSON POST). No other channel — set the webhook
 * (Slack/Zapier/etc.) or owner notify returns `false`.
 * Returns `true` if the request succeeded, `false` on missing URL / HTTP error.
 * Validation errors bubble as TRPC `BAD_REQUEST`.
 */
export declare function notifyOwner(payload: NotificationPayload): Promise<boolean>;
