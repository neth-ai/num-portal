// The state machine of one Method A handoff request.
//
//   waiting  -> deploying   Ops presses "Start deploy" (the handoff wait ends here)
//   deploying -> live       all eleven steps ticked and the health check passed
//   deploying -> failed     Ops reports a failed health check
//   failed   -> waiting     Dev presses "Fix and resend" (a new try, tries + 1)

export type HandoffStatus = 'waiting' | 'deploying' | 'live' | 'failed';

export type HandoffAction = 'start' | 'health_ok' | 'health_failed' | 'resend';

const NEXT: Record<HandoffStatus, Partial<Record<HandoffAction, HandoffStatus>>> = {
  waiting: { start: 'deploying' },
  deploying: { health_ok: 'live', health_failed: 'failed' },
  failed: { resend: 'waiting' },
  live: {},
};

/** The status after the action, or null when the action is not allowed. */
export const nextStatus = (status: HandoffStatus, action: HandoffAction): HandoffStatus | null =>
  NEXT[status][action] ?? null;

export const canAct = (status: HandoffStatus, action: HandoffAction) => nextStatus(status, action) !== null;

/** A request is open while Operations has not reported a result. */
export const isOpen = (status: HandoffStatus) => status === 'waiting' || status === 'deploying';

/** "Fix and resend" starts a new try, so the number of handoffs goes up by one. */
export const triesAfterResend = (tries: number) => tries + 1;

/** Going live needs every step of the written procedure ticked. */
export const canGoLive = (stepsDone: number[], totalSteps: number) =>
  new Set(stepsDone).size >= totalSteps;
