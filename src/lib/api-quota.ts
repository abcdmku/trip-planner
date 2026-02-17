// ---------------------------------------------------------------------------
// api-quota – API call tracking and soft-limit warnings.
//
// Tracks API call timestamps and provides utilities to measure call rates
// and warn when approaching configurable soft limits. This is intended for
// client-side rate-limit awareness (e.g. Google Maps / Places API calls).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ONE_MINUTE_MS = 60_000;
const ONE_HOUR_MS = 3_600_000;

/** Default soft limit: 50 calls per minute. */
const DEFAULT_SOFT_LIMIT_PER_MINUTE = 50;

/** Warn when usage reaches 80% of the soft limit. */
const WARNING_THRESHOLD = 0.8;

// ---------------------------------------------------------------------------
// ApiQuotaTracker
// ---------------------------------------------------------------------------

/**
 * Tracks API call timestamps in memory and provides rate-of-use queries.
 *
 * Timestamps older than one hour are automatically pruned on each `track()`
 * call to keep memory bounded.
 */
class ApiQuotaTracker {
  private calls: number[] = [];

  // -------------------------------------------------------------------------
  // track
  // -------------------------------------------------------------------------

  /**
   * Record an API call at the current time.
   *
   * Also prunes entries older than one hour to keep the list bounded.
   */
  track(): void {
    const now = Date.now();
    this.calls.push(now);
    this.prune(now);
  }

  // -------------------------------------------------------------------------
  // getCallsPerMinute
  // -------------------------------------------------------------------------

  /**
   * Return the number of tracked calls within the last 60 seconds.
   */
  getCallsPerMinute(): number {
    const cutoff = Date.now() - ONE_MINUTE_MS;
    return this.calls.filter((t) => t >= cutoff).length;
  }

  // -------------------------------------------------------------------------
  // getCallsPerHour
  // -------------------------------------------------------------------------

  /**
   * Return the number of tracked calls within the last 60 minutes.
   */
  getCallsPerHour(): number {
    const cutoff = Date.now() - ONE_HOUR_MS;
    return this.calls.filter((t) => t >= cutoff).length;
  }

  // -------------------------------------------------------------------------
  // isNearLimit
  // -------------------------------------------------------------------------

  /**
   * Returns `true` when the calls-per-minute rate has reached or exceeded
   * 80% of the given soft limit.
   *
   * @param softLimitPerMinute Per-minute soft limit (default: 50).
   */
  isNearLimit(softLimitPerMinute: number = DEFAULT_SOFT_LIMIT_PER_MINUTE): boolean {
    return this.getCallsPerMinute() >= Math.floor(softLimitPerMinute * WARNING_THRESHOLD);
  }

  // -------------------------------------------------------------------------
  // getRemainingQuota
  // -------------------------------------------------------------------------

  /**
   * Return how many more calls can be made this minute before hitting the
   * soft limit. Returns 0 (never negative) when the limit is reached.
   *
   * @param limitPerMinute Per-minute soft limit (default: 50).
   */
  getRemainingQuota(limitPerMinute: number = DEFAULT_SOFT_LIMIT_PER_MINUTE): number {
    return Math.max(0, limitPerMinute - this.getCallsPerMinute());
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Remove call timestamps older than one hour to prevent unbounded growth.
   */
  private prune(now: number): void {
    const cutoff = now - ONE_HOUR_MS;
    // Find the first index that is within the window.
    const firstValid = this.calls.findIndex((t) => t >= cutoff);
    if (firstValid > 0) {
      this.calls = this.calls.slice(firstValid);
    } else if (firstValid === -1) {
      // All entries are stale.
      this.calls = [];
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/**
 * Shared singleton tracker for the application.
 *
 * @example
 * import { apiQuota } from '@/lib/api-quota';
 *
 * apiQuota.track();
 * if (apiQuota.isNearLimit()) {
 *   console.warn('Approaching API rate limit');
 * }
 */
export const apiQuota = new ApiQuotaTracker();
