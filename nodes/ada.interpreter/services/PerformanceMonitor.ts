/**
 * PerformanceMonitor - Real-time performance tracking and metrics
 * Monitors latency, throughput, error rates, and system health
 */

import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  // Processing metrics
  totalSegments: number;
  segmentsPerSecond: number;
  averageProcessingTime: number;
  medianProcessingTime: number;
  p95ProcessingTime: number;
  p99ProcessingTime: number;

  // Quality metrics
  averageConfidence: number;
  lowConfidenceSegments: number;

  // API metrics
  whisperApiCalls: number;
  whisperApiErrors: number;
  whisperAverageLatency: number;
  claudeApiCalls: number;
  claudeApiErrors: number;
  claudeAverageLatency: number;

  // Language distribution
  languageDistribution: Record<string, number>;

  // Speaker distribution
  speakerSegments: number;
  audienceSegments: number;

  // Session metrics
  activeSessions: number;
  completedSessions: number;

  // System metrics
  cpuUsage: number;
  memoryUsage: number;
  uptime: number;
}

export interface MetricEvent {
  type: 'segment-processed' | 'api-call' | 'error' | 'session-event';
  timestamp: Date;
  data: any;
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics;
  private processingTimes: number[] = [];
  private whisperLatencies: number[] = [];
  private claudeLatencies: number[] = [];
  private startTime: Date;
  private metricsWindow: number = 3600000; // 1 hour
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.startTime = new Date();
    this.metrics = this.initializeMetrics();
    this.startCleanup();
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      totalSegments: 0,
      segmentsPerSecond: 0,
      averageProcessingTime: 0,
      medianProcessingTime: 0,
      p95ProcessingTime: 0,
      p99ProcessingTime: 0,
      averageConfidence: 0,
      lowConfidenceSegments: 0,
      whisperApiCalls: 0,
      whisperApiErrors: 0,
      whisperAverageLatency: 0,
      claudeApiCalls: 0,
      claudeApiErrors: 0,
      claudeAverageLatency: 0,
      languageDistribution: {},
      speakerSegments: 0,
      audienceSegments: 0,
      activeSessions: 0,
      completedSessions: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      uptime: 0
    };
  }

  /**
   * Record segment processing
   */
  recordSegmentProcessed(data: {
    processingTime: number;
    confidence: number;
    language: string;
    speaker: 'speaker' | 'audience';
  }): void {
    // Update counters
    this.metrics.totalSegments++;

    // Track processing time
    this.processingTimes.push(data.processingTime);
    this.metrics.averageProcessingTime = this.calculateAverage(this.processingTimes);
    this.metrics.medianProcessingTime = this.calculatePercentile(this.processingTimes, 50);
    this.metrics.p95ProcessingTime = this.calculatePercentile(this.processingTimes, 95);
    this.metrics.p99ProcessingTime = this.calculatePercentile(this.processingTimes, 99);

    // Track confidence
    if (data.confidence < 0.8) {
      this.metrics.lowConfidenceSegments++;
    }

    // Track language
    this.metrics.languageDistribution[data.language] =
      (this.metrics.languageDistribution[data.language] || 0) + 1;

    // Track speaker type
    if (data.speaker === 'speaker') {
      this.metrics.speakerSegments++;
    } else {
      this.metrics.audienceSegments++;
    }

    // Calculate segments per second
    const uptimeSeconds = (Date.now() - this.startTime.getTime()) / 1000;
    this.metrics.segmentsPerSecond = this.metrics.totalSegments / uptimeSeconds;

    // Emit event
    this.emit('metric', {
      type: 'segment-processed',
      timestamp: new Date(),
      data
    });
  }

  /**
   * Record Whisper API call
   */
  recordWhisperApiCall(latency: number, error?: boolean): void {
    this.metrics.whisperApiCalls++;

    if (error) {
      this.metrics.whisperApiErrors++;
    } else {
      this.whisperLatencies.push(latency);
      this.metrics.whisperAverageLatency = this.calculateAverage(this.whisperLatencies);
    }

    this.emit('metric', {
      type: 'api-call',
      timestamp: new Date(),
      data: { service: 'whisper', latency, error }
    });
  }

  /**
   * Record Claude API call
   */
  recordClaudeApiCall(latency: number, error?: boolean): void {
    this.metrics.claudeApiCalls++;

    if (error) {
      this.metrics.claudeApiErrors++;
    } else {
      this.claudeLatencies.push(latency);
      this.metrics.claudeAverageLatency = this.calculateAverage(this.claudeLatencies);
    }

    this.emit('metric', {
      type: 'api-call',
      timestamp: new Date(),
      data: { service: 'claude', latency, error }
    });
  }

  /**
   * Record session event
   */
  recordSessionEvent(event: 'started' | 'completed', sessionId: string): void {
    if (event === 'started') {
      this.metrics.activeSessions++;
    } else {
      this.metrics.activeSessions--;
      this.metrics.completedSessions++;
    }

    this.emit('metric', {
      type: 'session-event',
      timestamp: new Date(),
      data: { event, sessionId }
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    // Update system metrics
    this.updateSystemMetrics();

    return { ...this.metrics };
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): any {
    const metrics = this.getMetrics();

    return {
      processing: {
        total: metrics.totalSegments,
        throughput: metrics.segmentsPerSecond.toFixed(2),
        latency: {
          avg: metrics.averageProcessingTime.toFixed(0) + 'ms',
          p50: metrics.medianProcessingTime.toFixed(0) + 'ms',
          p95: metrics.p95ProcessingTime.toFixed(0) + 'ms',
          p99: metrics.p99ProcessingTime.toFixed(0) + 'ms'
        }
      },
      quality: {
        avgConfidence: (metrics.averageConfidence * 100).toFixed(1) + '%',
        lowConfidence: metrics.lowConfidenceSegments
      },
      apis: {
        whisper: {
          calls: metrics.whisperApiCalls,
          errors: metrics.whisperApiErrors,
          errorRate: this.calculateErrorRate(metrics.whisperApiCalls, metrics.whisperApiErrors),
          avgLatency: metrics.whisperAverageLatency.toFixed(0) + 'ms'
        },
        claude: {
          calls: metrics.claudeApiCalls,
          errors: metrics.claudeApiErrors,
          errorRate: this.calculateErrorRate(metrics.claudeApiCalls, metrics.claudeApiErrors),
          avgLatency: metrics.claudeAverageLatency.toFixed(0) + 'ms'
        }
      },
      languages: metrics.languageDistribution,
      speakers: {
        speaker: metrics.speakerSegments,
        audience: metrics.audienceSegments
      },
      sessions: {
        active: metrics.activeSessions,
        completed: metrics.completedSessions
      },
      system: {
        cpu: metrics.cpuUsage.toFixed(1) + '%',
        memory: metrics.memoryUsage.toFixed(1) + '%',
        uptime: this.formatUptime(metrics.uptime)
      }
    };
  }

  /**
   * Get Prometheus-compatible metrics
   */
  getPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    const lines: string[] = [];

    // Segment metrics
    lines.push('# HELP ada_interpreter_segments_total Total segments processed');
    lines.push('# TYPE ada_interpreter_segments_total counter');
    lines.push(`ada_interpreter_segments_total ${metrics.totalSegments}`);

    lines.push('# HELP ada_interpreter_segments_per_second Segments processed per second');
    lines.push('# TYPE ada_interpreter_segments_per_second gauge');
    lines.push(`ada_interpreter_segments_per_second ${metrics.segmentsPerSecond}`);

    // Processing time
    lines.push('# HELP ada_interpreter_processing_time_ms Processing time in milliseconds');
    lines.push('# TYPE ada_interpreter_processing_time_ms summary');
    lines.push(`ada_interpreter_processing_time_ms{quantile="0.5"} ${metrics.medianProcessingTime}`);
    lines.push(`ada_interpreter_processing_time_ms{quantile="0.95"} ${metrics.p95ProcessingTime}`);
    lines.push(`ada_interpreter_processing_time_ms{quantile="0.99"} ${metrics.p99ProcessingTime}`);

    // API calls
    lines.push('# HELP ada_interpreter_api_calls_total Total API calls');
    lines.push('# TYPE ada_interpreter_api_calls_total counter');
    lines.push(`ada_interpreter_api_calls_total{service="whisper"} ${metrics.whisperApiCalls}`);
    lines.push(`ada_interpreter_api_calls_total{service="claude"} ${metrics.claudeApiCalls}`);

    // API errors
    lines.push('# HELP ada_interpreter_api_errors_total Total API errors');
    lines.push('# TYPE ada_interpreter_api_errors_total counter');
    lines.push(`ada_interpreter_api_errors_total{service="whisper"} ${metrics.whisperApiErrors}`);
    lines.push(`ada_interpreter_api_errors_total{service="claude"} ${metrics.claudeApiErrors}`);

    // Sessions
    lines.push('# HELP ada_interpreter_active_sessions Active sessions');
    lines.push('# TYPE ada_interpreter_active_sessions gauge');
    lines.push(`ada_interpreter_active_sessions ${metrics.activeSessions}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.processingTimes = [];
    this.whisperLatencies = [];
    this.claudeLatencies = [];
    this.startTime = new Date();
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    return JSON.stringify(this.getMetrics(), null, 2);
  }

  /**
   * Update system metrics
   */
  private updateSystemMetrics(): void {
    // Update uptime
    this.metrics.uptime = Date.now() - this.startTime.getTime();

    // Update memory usage
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // CPU usage (simplified - would need more sophisticated tracking in production)
    this.metrics.cpuUsage = process.cpuUsage().user / 1000000; // Convert to percentage
  }

  /**
   * Calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(total: number, errors: number): string {
    if (total === 0) return '0%';
    return ((errors / total) * 100).toFixed(2) + '%';
  }

  /**
   * Format uptime
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Start cleanup routine
   */
  private startCleanup(): void {
    // Clean up old metrics every hour
    this.cleanupInterval = setInterval(() => {
      const cutoff = Date.now() - this.metricsWindow;

      // Keep only recent processing times (simple implementation)
      if (this.processingTimes.length > 10000) {
        this.processingTimes = this.processingTimes.slice(-1000);
      }

      if (this.whisperLatencies.length > 10000) {
        this.whisperLatencies = this.whisperLatencies.slice(-1000);
      }

      if (this.claudeLatencies.length > 10000) {
        this.claudeLatencies = this.claudeLatencies.slice(-1000);
      }
    }, 3600000); // Every hour
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export default PerformanceMonitor;
