/**
 * PaymentMonitor - Monitoring and alerting for payment operations
 * Production: Integrate with Datadog, New Relic, or Prometheus
 */

export interface PaymentMetric {
  timestamp: Date;
  metricType: 'payment_created' | 'payment_succeeded' | 'payment_failed' | 'payment_expired';
  provider: 'paytr' | 'iyzico';
  amount: number;
  currency: string;
  bookingId: string;
  duration?: number; // ms
  errorMessage?: string;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class PaymentMonitor {
  private metrics: PaymentMetric[] = [];
  private alerts: Alert[] = [];
  private alertThresholds = {
    failureRate: 0.15, // Alert if >15% failure rate
    expiredRate: 0.30, // Alert if >30% expiration rate
    slowPayment: 5000, // Alert if payment takes >5s
  };

  /**
   * Track payment metric
   */
  trackMetric(metric: PaymentMetric): void {
    this.metrics.push(metric);

    // Keep only last 10,000 metrics in memory
    if (this.metrics.length > 10000) {
      this.metrics.shift();
    }

    // Check for anomalies
    this.checkAnomalies(metric);
  }

  /**
   * Get metrics for a time period
   */
  getMetrics(options: {
    startTime?: Date;
    endTime?: Date;
    metricType?: PaymentMetric['metricType'];
    provider?: PaymentMetric['provider'];
  }): PaymentMetric[] {
    let filtered = this.metrics;

    if (options.startTime) {
      filtered = filtered.filter(m => m.timestamp >= options.startTime!);
    }

    if (options.endTime) {
      filtered = filtered.filter(m => m.timestamp <= options.endTime!);
    }

    if (options.metricType) {
      filtered = filtered.filter(m => m.metricType === options.metricType);
    }

    if (options.provider) {
      filtered = filtered.filter(m => m.provider === options.provider);
    }

    return filtered;
  }

  /**
   * Get payment statistics
   */
  getStatistics(timeWindowMinutes: number = 60): {
    total: number;
    succeeded: number;
    failed: number;
    expired: number;
    successRate: number;
    failureRate: number;
    averageAmount: number;
    averageDuration: number;
    byProvider: Record<string, number>;
  } {
    const cutoff = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    const succeeded = recentMetrics.filter(m => m.metricType === 'payment_succeeded').length;
    const failed = recentMetrics.filter(m => m.metricType === 'payment_failed').length;
    const expired = recentMetrics.filter(m => m.metricType === 'payment_expired').length;
    const total = succeeded + failed + expired;

    const successRate = total > 0 ? succeeded / total : 0;
    const failureRate = total > 0 ? failed / total : 0;

    const amounts = recentMetrics.map(m => m.amount);
    const averageAmount = amounts.length > 0
      ? amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length
      : 0;

    const durations = recentMetrics
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!);
    const averageDuration = durations.length > 0
      ? durations.reduce((sum, dur) => sum + dur, 0) / durations.length
      : 0;

    const byProvider: Record<string, number> = {};
    recentMetrics.forEach(m => {
      byProvider[m.provider] = (byProvider[m.provider] || 0) + 1;
    });

    return {
      total,
      succeeded,
      failed,
      expired,
      successRate,
      failureRate,
      averageAmount,
      averageDuration,
      byProvider,
    };
  }

  /**
   * Check for anomalies and create alerts
   */
  private checkAnomalies(metric: PaymentMetric): void {
    // Check for slow payments
    if (metric.duration && metric.duration > this.alertThresholds.slowPayment) {
      this.createAlert({
        severity: 'warning',
        message: `Slow payment detected: ${metric.duration}ms for booking ${metric.bookingId}`,
        metadata: {
          bookingId: metric.bookingId,
          duration: metric.duration,
          provider: metric.provider,
        },
      });
    }

    // Check failure rate (last 100 transactions)
    const recent = this.metrics.slice(-100);
    const failures = recent.filter(m => m.metricType === 'payment_failed').length;
    const failureRate = failures / recent.length;

    if (failureRate > this.alertThresholds.failureRate) {
      this.createAlert({
        severity: 'critical',
        message: `High payment failure rate: ${(failureRate * 100).toFixed(1)}% (last 100 transactions)`,
        metadata: {
          failureRate,
          threshold: this.alertThresholds.failureRate,
        },
      });
    }

    // Check expiration rate
    const expirations = recent.filter(m => m.metricType === 'payment_expired').length;
    const expirationRate = expirations / recent.length;

    if (expirationRate > this.alertThresholds.expiredRate) {
      this.createAlert({
        severity: 'warning',
        message: `High payment expiration rate: ${(expirationRate * 100).toFixed(1)}% (last 100 transactions)`,
        metadata: {
          expirationRate,
          threshold: this.alertThresholds.expiredRate,
        },
      });
    }
  }

  /**
   * Create an alert
   */
  private createAlert(alert: Omit<Alert, 'id' | 'timestamp'>): void {
    const fullAlert: Alert = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...alert,
    };

    this.alerts.push(fullAlert);

    // Log alert
    console.error(`🚨 [${fullAlert.severity.toUpperCase()}] ${fullAlert.message}`);

    // In production, send to alerting service (PagerDuty, Slack, etc.)
    this.sendToAlertingService(fullAlert);

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts.shift();
    }
  }

  /**
   * Send alert to external service
   * Production: Integrate with PagerDuty, Slack, email, etc.
   */
  private sendToAlertingService(alert: Alert): void {
    // Simulated - would POST to Slack webhook, PagerDuty API, etc.
    if (alert.severity === 'critical') {
      console.log('📧 Sending critical alert to on-call engineer...');
      // await axios.post(process.env.PAGERDUTY_WEBHOOK, alert);
    } else if (alert.severity === 'warning') {
      console.log('💬 Sending warning to Slack #payments channel...');
      // await axios.post(process.env.SLACK_WEBHOOK, { text: alert.message });
    }
  }

  /**
   * Get recent alerts
   */
  getAlerts(options: {
    severity?: Alert['severity'];
    limit?: number;
  } = {}): Alert[] {
    let filtered = [...this.alerts].reverse(); // Most recent first

    if (options.severity) {
      filtered = filtered.filter(a => a.severity === options.severity);
    }

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    stats: ReturnType<typeof this.getStatistics>;
    recentAlerts: Alert[];
  } {
    const stats = this.getStatistics(60); // Last hour
    const recentAlerts = this.getAlerts({ limit: 10 });
    const criticalAlerts = this.getAlerts({ severity: 'critical', limit: 5 });

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

    if (criticalAlerts.length > 0) {
      status = 'critical';
    } else if (stats.failureRate > 0.10 || stats.successRate < 0.80) {
      status = 'degraded';
    }

    return {
      status,
      stats,
      recentAlerts,
    };
  }

  /**
   * Export metrics for external monitoring (Prometheus format)
   */
  exportPrometheusMetrics(): string {
    const stats = this.getStatistics(60);

    return `
# HELP payment_total Total number of payments
# TYPE payment_total counter
payment_total ${stats.total}

# HELP payment_succeeded Number of successful payments
# TYPE payment_succeeded counter
payment_succeeded ${stats.succeeded}

# HELP payment_failed Number of failed payments
# TYPE payment_failed counter
payment_failed ${stats.failed}

# HELP payment_success_rate Payment success rate (0-1)
# TYPE payment_success_rate gauge
payment_success_rate ${stats.successRate.toFixed(3)}

# HELP payment_average_amount Average payment amount
# TYPE payment_average_amount gauge
payment_average_amount ${stats.averageAmount.toFixed(2)}

# HELP payment_average_duration_ms Average payment duration in milliseconds
# TYPE payment_average_duration_ms gauge
payment_average_duration_ms ${stats.averageDuration.toFixed(0)}
    `.trim();
  }
}
