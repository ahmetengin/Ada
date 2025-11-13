/**
 * Aviation-Grade Metrics System
 * Inspired by ada-marina-wim's 99.9% uptime commitment
 *
 * Standards:
 * - 99.9% uptime (8.76 hours downtime per year max)
 * - p95 API latency < 200ms
 * - p99 API latency < 500ms
 * - Compliance scoring > 98%
 */

import { createLogger, Logger } from '../utils/Logger.js';
import EventEmitter from 'eventemitter3';

export interface MetricSnapshot {
  timestamp: Date;
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  lastCheck: Date;
  consecutiveFailures: number;
  metadata?: Record<string, any>;
}

export interface UptimeReport {
  period: 'hour' | 'day' | 'week' | 'month' | 'year';
  uptime: number; // Percentage (0-100)
  totalTime: number; // milliseconds
  downtime: number; // milliseconds
  incidents: number;
}

export interface LatencyMetrics {
  p50: number; // median
  p95: number;
  p99: number;
  p999: number;
  average: number;
  max: number;
  min: number;
  sampleSize: number;
}

export interface ComplianceMetrics {
  score: number; // Percentage (0-100)
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warnings: number;
  criticalViolations: number;
  lastAudit: Date;
}

/**
 * Aviation-Grade Metrics Collector
 */
export class AviationMetrics extends EventEmitter {
  private logger: Logger;
  private latencyBuffer: number[] = [];
  private uptimeStart: Date;
  private totalDowntime: number = 0;
  private incidents: number = 0;
  private healthChecks: Map<string, HealthCheck> = new Map();
  private complianceScore: number = 100;

  // Thresholds
  private readonly SLA_UPTIME = 99.9; // percent
  private readonly SLA_P95_LATENCY = 200; // ms
  private readonly SLA_P99_LATENCY = 500; // ms
  private readonly SLA_COMPLIANCE = 98; // percent

  constructor() {
    super();
    this.logger = createLogger('Metrics:Aviation');
    this.uptimeStart = new Date();
    this.startHealthMonitoring();
  }

  /**
   * Record API latency
   */
  recordLatency(latencyMs: number, endpoint?: string): void {
    this.latencyBuffer.push(latencyMs);

    // Keep only last 10,000 measurements
    if (this.latencyBuffer.length > 10000) {
      this.latencyBuffer = this.latencyBuffer.slice(-10000);
    }

    // Alert if p95 exceeds SLA
    const metrics = this.getLatencyMetrics();
    if (metrics.p95 > this.SLA_P95_LATENCY) {
      this.emit('sla:violation', {
        metric: 'p95_latency',
        value: metrics.p95,
        threshold: this.SLA_P95_LATENCY,
        endpoint,
      });
      this.logger.warn('P95 latency SLA violation', {
        p95: metrics.p95,
        threshold: this.SLA_P95_LATENCY,
      });
    }
  }

  /**
   * Calculate latency percentiles
   */
  getLatencyMetrics(): LatencyMetrics {
    if (this.latencyBuffer.length === 0) {
      return {
        p50: 0,
        p95: 0,
        p99: 0,
        p999: 0,
        average: 0,
        max: 0,
        min: 0,
        sampleSize: 0,
      };
    }

    const sorted = [...this.latencyBuffer].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      p999: this.percentile(sorted, 99.9),
      average: sorted.reduce((a, b) => a + b, 0) / len,
      max: sorted[len - 1],
      min: sorted[0],
      sampleSize: len,
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  /**
   * Register a service for health monitoring
   */
  registerHealthCheck(service: string, checkFn: () => Promise<boolean>): void {
    const check: HealthCheck = {
      service,
      status: 'healthy',
      latency: 0,
      lastCheck: new Date(),
      consecutiveFailures: 0,
    };

    this.healthChecks.set(service, check);

    // Perform health check every 30 seconds
    setInterval(async () => {
      const start = Date.now();
      try {
        const healthy = await checkFn();
        const latency = Date.now() - start;

        check.latency = latency;
        check.lastCheck = new Date();

        if (healthy) {
          check.status = 'healthy';
          check.consecutiveFailures = 0;
        } else {
          check.consecutiveFailures++;
          check.status = check.consecutiveFailures > 3 ? 'down' : 'degraded';

          if (check.status === 'down') {
            this.recordIncident(service);
          }
        }

        this.healthChecks.set(service, check);
        this.emit('health:check', check);
      } catch (error) {
        check.consecutiveFailures++;
        check.status = check.consecutiveFailures > 3 ? 'down' : 'degraded';
        check.lastCheck = new Date();
        check.metadata = { error: error instanceof Error ? error.message : 'Unknown error' };

        this.healthChecks.set(service, check);
        this.logger.error('Health check failed', { service, error });

        if (check.status === 'down') {
          this.recordIncident(service);
        }
      }
    }, 30000);
  }

  /**
   * Record a system incident
   */
  recordIncident(service: string, duration?: number): void {
    this.incidents++;
    if (duration) {
      this.totalDowntime += duration;
    }

    this.emit('incident', { service, timestamp: new Date(), duration });
    this.logger.error('System incident recorded', { service, incidents: this.incidents });
  }

  /**
   * Get uptime report
   */
  getUptimeReport(period: UptimeReport['period']): UptimeReport {
    const now = Date.now();
    const startTime = this.uptimeStart.getTime();
    const totalTime = now - startTime;

    const uptime = totalTime > 0 ? ((totalTime - this.totalDowntime) / totalTime) * 100 : 100;

    const report: UptimeReport = {
      period,
      uptime,
      totalTime,
      downtime: this.totalDowntime,
      incidents: this.incidents,
    };

    // Check SLA
    if (uptime < this.SLA_UPTIME) {
      this.emit('sla:violation', {
        metric: 'uptime',
        value: uptime,
        threshold: this.SLA_UPTIME,
      });
      this.logger.warn('Uptime SLA violation', {
        uptime,
        threshold: this.SLA_UPTIME,
      });
    }

    return report;
  }

  /**
   * Update compliance score
   */
  updateComplianceScore(metrics: ComplianceMetrics): void {
    this.complianceScore = metrics.score;

    if (metrics.score < this.SLA_COMPLIANCE) {
      this.emit('sla:violation', {
        metric: 'compliance',
        value: metrics.score,
        threshold: this.SLA_COMPLIANCE,
      });
      this.logger.warn('Compliance SLA violation', {
        score: metrics.score,
        threshold: this.SLA_COMPLIANCE,
      });
    }

    this.emit('compliance:update', metrics);
  }

  /**
   * Get all health checks
   */
  getAllHealthChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'down';
    services: HealthCheck[];
    uptime: number;
    latency: LatencyMetrics;
    compliance: number;
    meetsAllSLAs: boolean;
  } {
    const services = this.getAllHealthChecks();
    const downServices = services.filter(s => s.status === 'down');
    const degradedServices = services.filter(s => s.status === 'degraded');

    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (downServices.length > 0) {
      status = 'down';
    } else if (degradedServices.length > 0) {
      status = 'degraded';
    }

    const uptime = this.getUptimeReport('day');
    const latency = this.getLatencyMetrics();

    const meetsAllSLAs =
      uptime.uptime >= this.SLA_UPTIME &&
      latency.p95 <= this.SLA_P95_LATENCY &&
      latency.p99 <= this.SLA_P99_LATENCY &&
      this.complianceScore >= this.SLA_COMPLIANCE;

    return {
      status,
      services,
      uptime: uptime.uptime,
      latency,
      compliance: this.complianceScore,
      meetsAllSLAs,
    };
  }

  /**
   * Start health monitoring loop
   */
  private startHealthMonitoring(): void {
    // Emit health report every 5 minutes
    setInterval(() => {
      const health = this.getSystemHealth();
      this.emit('health:report', health);

      if (!health.meetsAllSLAs) {
        this.logger.warn('Not meeting all SLAs', {
          uptime: health.uptime,
          p95: health.latency.p95,
          p99: health.latency.p99,
          compliance: health.compliance,
        });
      }
    }, 300000); // 5 minutes
  }

  /**
   * Get SLA thresholds
   */
  getSLAThresholds(): {
    uptime: number;
    p95Latency: number;
    p99Latency: number;
    compliance: number;
  } {
    return {
      uptime: this.SLA_UPTIME,
      p95Latency: this.SLA_P95_LATENCY,
      p99Latency: this.SLA_P99_LATENCY,
      compliance: this.SLA_COMPLIANCE,
    };
  }
}

// Singleton instance
export const aviationMetrics = new AviationMetrics();
