// Alerts are switched off (2026-10-21) until they match searches the way search does,
// honour the chosen frequency and send email. Flip this to turn them back on, and re-add the
// "0 12 * * *" trigger in wrangler.jsonc and worker.ts.
export const ALERTS_ENABLED = false;
