/**
 * Simple Performance Metrics
 * 
 * Minimal performance tracking for the auto-sync engine.
 * Only tracks what's actually needed.
 */

/**
 * Simple metrics for basic counting and timing
 */
export class SimpleMetrics {
  private static instance: SimpleMetrics;
  private counters: Map<string, number> = new Map();
  private enabled: boolean = true;

  static getInstance(): SimpleMetrics {
    if (!SimpleMetrics.instance) {
      SimpleMetrics.instance = new SimpleMetrics();
    }
    return SimpleMetrics.instance;
  }

  /**
   * Record/increment a simple counter
   */
  recordCounter(name: string, count: number = 1): void {
    if (!this.enabled) return;
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + count);
  }

  /**
   * Record error count
   */
  recordError(name: string, count: number = 1): void {
    this.recordCounter(name, count);
  }

  /**
   * Record queue size (just updates current value)
   */
  recordQueueSize(name: string, size: number): void {
    if (!this.enabled) return;
    this.counters.set(name, size);
  }

  /**
   * Get counter value
   */
  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  /**
   * Get basic summary for debugging
   */
  getBasicReport(): Record<string, number> {
    if (!this.enabled) return {};
    return Object.fromEntries(this.counters);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.counters.clear();
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Simple timing wrapper for async functions
   */
  async timeAsync<T>(metricName: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.recordCounter(`${metricName}.duration_ms`, duration);
      this.recordCounter(`${metricName}.calls`);
      return result;
    } catch (error) {
      this.recordError(`${metricName}.errors`);
      throw error;
    }
  }
}

// Export singleton instance
export const performanceMetrics = SimpleMetrics.getInstance();