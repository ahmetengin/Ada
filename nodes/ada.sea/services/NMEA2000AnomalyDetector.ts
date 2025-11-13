/**
 * NMEA2000 Anomaly Detection Service
 *
 * Monitors vessel engine and electrical parameters for anomalies:
 * - Engine RPM deviations
 * - Oil pressure drops
 * - Coolant temperature spikes
 * - Battery voltage irregularities
 * - Fuel flow anomalies
 *
 * Uses statistical baseline + TabPFN-2.5 ML predictions
 */

import { EventEmitter } from 'events';
import { MMSI } from '../types/AISTypes.js';

export type ParameterType =
  | 'engineRPM'
  | 'oilPressure'
  | 'coolantTemp'
  | 'batteryVoltage'
  | 'fuelFlow'
  | 'engineHours'
  | 'exhaustTemp'
  | 'alternatorVoltage'
  | 'transmissionOilPressure';

export type SeverityLevel = 'Normal' | 'Warning' | 'Alarm' | 'Critical';

export interface NMEA2000Reading {
  timestamp: Date;
  mmsi: MMSI;
  enginePosition: string; // 'port', 'starboard', 'single'
  parameters: {
    engineRPM?: number;
    oilPressure?: number; // bar
    coolantTemp?: number; // Celsius
    batteryVoltage?: number; // Volts
    fuelFlow?: number; // L/h
    engineHours?: number;
    exhaustTemp?: number; // Celsius
    alternatorVoltage?: number; // Volts
    transmissionOilPressure?: number; // bar
  };
}

export interface Baseline {
  parameterType: ParameterType;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  sampleSize: number;
  lastUpdated: Date;
  enginePosition: string;
}

export interface Anomaly {
  id: string;
  timestamp: Date;
  mmsi: MMSI;
  enginePosition: string;
  parameterType: ParameterType;
  currentValue: number;
  expectedValue: number;
  deviation: number; // Standard deviations from mean
  severity: SeverityLevel;
  message: string;
  recommendations: string[];
}

export interface AnomalyDetectionConfig {
  // Baseline learning
  minSamplesForBaseline: number; // Minimum readings before baseline is valid
  baselineUpdateInterval: number; // ms - how often to recalculate baseline

  // Detection thresholds (in standard deviations)
  warningThreshold: number; // e.g., 2 sigma
  alarmThreshold: number; // e.g., 3 sigma
  criticalThreshold: number; // e.g., 4 sigma

  // Absolute safety limits (override statistical detection)
  safetyLimits: {
    engineRPM: { min: number; max: number };
    oilPressure: { min: number; max: number };
    coolantTemp: { min: number; max: number };
    batteryVoltage: { min: number; max: number };
    exhaustTemp: { min: number; max: number };
  };

  // ML integration
  useTabPFN: boolean; // Use TabPFN-2.5 for predictions
  tabPFNConfidenceThreshold: number; // 0-1
}

export class NMEA2000AnomalyDetector extends EventEmitter {
  private config: AnomalyDetectionConfig;
  private baselines: Map<string, Baseline> = new Map(); // key: mmsi_engine_parameter
  private readingHistory: Map<string, NMEA2000Reading[]> = new Map(); // key: mmsi_engine
  private anomalyHistory: Anomaly[] = [];

  constructor(config?: Partial<AnomalyDetectionConfig>) {
    super();

    this.config = {
      minSamplesForBaseline: 50,
      baselineUpdateInterval: 3600000, // 1 hour
      warningThreshold: 2.0,
      alarmThreshold: 3.0,
      criticalThreshold: 4.0,
      safetyLimits: {
        engineRPM: { min: 600, max: 4000 },
        oilPressure: { min: 2.0, max: 6.0 }, // bar
        coolantTemp: { min: 40, max: 95 }, // Celsius
        batteryVoltage: { min: 11.5, max: 15.0 }, // Volts
        exhaustTemp: { min: 200, max: 600 }, // Celsius
      },
      useTabPFN: true,
      tabPFNConfidenceThreshold: 0.85,
      ...config,
    };

    // Start periodic baseline updates
    setInterval(() => this.updateAllBaselines(), this.config.baselineUpdateInterval);
  }

  /**
   * Process new NMEA2000 reading
   */
  async processReading(reading: NMEA2000Reading): Promise<Anomaly[]> {
    const detectedAnomalies: Anomaly[] = [];

    // Store reading in history
    this.storeReading(reading);

    // Check each parameter for anomalies
    for (const [paramType, value] of Object.entries(reading.parameters)) {
      if (value === undefined || value === null) continue;

      const anomaly = await this.detectAnomaly(
        reading.mmsi,
        reading.enginePosition,
        paramType as ParameterType,
        value,
        reading.timestamp
      );

      if (anomaly) {
        detectedAnomalies.push(anomaly);
        this.anomalyHistory.push(anomaly);

        // Emit event
        this.emit('anomaly:detected', anomaly);

        // Emit severity-specific events
        if (anomaly.severity === 'Critical') {
          this.emit('anomaly:critical', anomaly);
        } else if (anomaly.severity === 'Alarm') {
          this.emit('anomaly:alarm', anomaly);
        } else if (anomaly.severity === 'Warning') {
          this.emit('anomaly:warning', anomaly);
        }
      }
    }

    // Update baselines periodically
    this.updateBaselinesForVessel(reading.mmsi, reading.enginePosition);

    return detectedAnomalies;
  }

  /**
   * Detect anomaly for a specific parameter
   */
  private async detectAnomaly(
    mmsi: MMSI,
    enginePosition: string,
    paramType: ParameterType,
    currentValue: number,
    timestamp: Date
  ): Promise<Anomaly | null> {
    // 1. Check absolute safety limits first
    const safetyViolation = this.checkSafetyLimits(paramType, currentValue);
    if (safetyViolation) {
      return this.createAnomaly(
        mmsi,
        enginePosition,
        paramType,
        currentValue,
        currentValue, // no expected value for safety violation
        0,
        'Critical',
        safetyViolation.message,
        safetyViolation.recommendations,
        timestamp
      );
    }

    // 2. Get baseline for this parameter
    const baseline = this.getBaseline(mmsi, enginePosition, paramType);

    if (!baseline) {
      // Not enough data for baseline yet
      return null;
    }

    // 3. Calculate deviation
    const deviation = Math.abs(currentValue - baseline.mean) / baseline.stdDev;

    // 4. Determine severity
    let severity: SeverityLevel = 'Normal';
    if (deviation >= this.config.criticalThreshold) {
      severity = 'Critical';
    } else if (deviation >= this.config.alarmThreshold) {
      severity = 'Alarm';
    } else if (deviation >= this.config.warningThreshold) {
      severity = 'Warning';
    }

    if (severity === 'Normal') {
      return null; // No anomaly
    }

    // 5. Optional: Use TabPFN for ML-based prediction
    if (this.config.useTabPFN) {
      const mlPrediction = await this.predictWithTabPFN(
        mmsi,
        enginePosition,
        paramType,
        currentValue
      );

      if (mlPrediction && mlPrediction.confidence > this.config.tabPFNConfidenceThreshold) {
        // TabPFN confirms anomaly
        severity = mlPrediction.severity;
      }
    }

    // 6. Create anomaly object
    const { message, recommendations } = this.generateAnomalyMessage(
      paramType,
      currentValue,
      baseline.mean,
      deviation,
      severity
    );

    return this.createAnomaly(
      mmsi,
      enginePosition,
      paramType,
      currentValue,
      baseline.mean,
      deviation,
      severity,
      message,
      recommendations,
      timestamp
    );
  }

  /**
   * Check absolute safety limits
   */
  private checkSafetyLimits(
    paramType: ParameterType,
    value: number
  ): { message: string; recommendations: string[] } | null {
    const limits = this.config.safetyLimits[paramType as keyof typeof this.config.safetyLimits];

    if (!limits) return null;

    if (value < limits.min) {
      return {
        message: `${paramType} critically low: ${value.toFixed(2)} (minimum: ${limits.min})`,
        recommendations: this.getSafetyRecommendations(paramType, 'low'),
      };
    }

    if (value > limits.max) {
      return {
        message: `${paramType} critically high: ${value.toFixed(2)} (maximum: ${limits.max})`,
        recommendations: this.getSafetyRecommendations(paramType, 'high'),
      };
    }

    return null;
  }

  /**
   * Get safety recommendations
   */
  private getSafetyRecommendations(paramType: ParameterType, condition: 'low' | 'high'): string[] {
    const recommendations: Record<ParameterType, { low: string[]; high: string[] }> = {
      engineRPM: {
        low: ['Check for engine stall', 'Verify throttle position', 'Check fuel supply'],
        high: ['Reduce throttle immediately', 'Check for runaway engine', 'Verify governor'],
      },
      oilPressure: {
        low: [
          '🚨 STOP ENGINE IMMEDIATELY',
          'Check oil level',
          'Inspect for leaks',
          'Check oil pump',
        ],
        high: ['Check oil pressure sensor', 'Verify oil viscosity', 'Check oil filter'],
      },
      coolantTemp: {
        low: ['Check thermostat', 'Verify coolant circulation'],
        high: [
          'Reduce engine load',
          'Check coolant level',
          'Inspect water pump',
          'Check heat exchanger',
          'Verify impeller condition',
        ],
      },
      batteryVoltage: {
        low: ['Check alternator', 'Verify battery condition', 'Check for electrical loads'],
        high: ['Check voltage regulator', 'Verify alternator output', 'Inspect wiring'],
      },
      exhaustTemp: {
        low: ['Check exhaust sensors', 'Verify engine load'],
        high: [
          'Reduce engine load',
          'Check cooling system',
          'Inspect exhaust system',
          'Verify turbocharger',
        ],
      },
      fuelFlow: {
        low: ['Check fuel filters', 'Verify fuel supply', 'Inspect fuel pump'],
        high: ['Check for fuel leaks', 'Verify injectors', 'Inspect fuel pressure regulator'],
      },
      engineHours: {
        low: ['Verify hour meter', 'Check for tampering'],
        high: ['Schedule maintenance', 'Review service intervals'],
      },
      alternatorVoltage: {
        low: ['Check alternator belt', 'Verify alternator output', 'Inspect connections'],
        high: ['Check voltage regulator', 'Inspect alternator diodes', 'Verify battery state'],
      },
      transmissionOilPressure: {
        low: ['Check transmission oil level', 'Inspect for leaks', 'Verify oil pump'],
        high: ['Check pressure sensor', 'Verify transmission operation'],
      },
    };

    return recommendations[paramType]?.[condition] || ['Consult service manual', 'Contact mechanic'];
  }

  /**
   * Generate anomaly message
   */
  private generateAnomalyMessage(
    paramType: ParameterType,
    currentValue: number,
    expectedValue: number,
    deviation: number,
    severity: SeverityLevel
  ): { message: string; recommendations: string[] } {
    const direction = currentValue > expectedValue ? 'high' : 'low';
    const emoji = severity === 'Critical' ? '🚨' : severity === 'Alarm' ? '⚠️' : '⚡';

    const message = `${emoji} ${paramType} ${direction}: ${currentValue.toFixed(2)} (expected: ${expectedValue.toFixed(2)}, deviation: ${deviation.toFixed(2)}σ)`;

    const recommendations = this.getSafetyRecommendations(paramType, direction);

    return { message, recommendations };
  }

  /**
   * Create anomaly object
   */
  private createAnomaly(
    mmsi: MMSI,
    enginePosition: string,
    parameterType: ParameterType,
    currentValue: number,
    expectedValue: number,
    deviation: number,
    severity: SeverityLevel,
    message: string,
    recommendations: string[],
    timestamp: Date
  ): Anomaly {
    return {
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      mmsi,
      enginePosition,
      parameterType,
      currentValue,
      expectedValue,
      deviation,
      severity,
      message,
      recommendations,
    };
  }

  /**
   * Store reading in history
   */
  private storeReading(reading: NMEA2000Reading): void {
    const key = `${reading.mmsi}_${reading.enginePosition}`;

    if (!this.readingHistory.has(key)) {
      this.readingHistory.set(key, []);
    }

    const history = this.readingHistory.get(key)!;
    history.push(reading);

    // Keep last 1000 readings
    if (history.length > 1000) {
      history.shift();
    }
  }

  /**
   * Get baseline for parameter
   */
  private getBaseline(mmsi: MMSI, enginePosition: string, paramType: ParameterType): Baseline | null {
    const key = `${mmsi}_${enginePosition}_${paramType}`;
    return this.baselines.get(key) || null;
  }

  /**
   * Update baselines for vessel
   */
  private updateBaselinesForVessel(mmsi: MMSI, enginePosition: string): void {
    const key = `${mmsi}_${enginePosition}`;
    const history = this.readingHistory.get(key);

    if (!history || history.length < this.config.minSamplesForBaseline) {
      return; // Not enough data
    }

    // Calculate baseline for each parameter
    const parameterTypes: ParameterType[] = [
      'engineRPM',
      'oilPressure',
      'coolantTemp',
      'batteryVoltage',
      'fuelFlow',
      'exhaustTemp',
      'alternatorVoltage',
      'transmissionOilPressure',
    ];

    for (const paramType of parameterTypes) {
      this.calculateBaseline(mmsi, enginePosition, paramType, history);
    }
  }

  /**
   * Calculate baseline statistics
   */
  private calculateBaseline(
    mmsi: MMSI,
    enginePosition: string,
    paramType: ParameterType,
    history: NMEA2000Reading[]
  ): void {
    const values = history
      .map(r => r.parameters[paramType])
      .filter(v => v !== undefined && v !== null) as number[];

    if (values.length < this.config.minSamplesForBaseline) {
      return;
    }

    // Calculate statistics
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);

    const baseline: Baseline = {
      parameterType: paramType,
      mean,
      stdDev,
      min,
      max,
      sampleSize: values.length,
      lastUpdated: new Date(),
      enginePosition,
    };

    const key = `${mmsi}_${enginePosition}_${paramType}`;
    this.baselines.set(key, baseline);

    console.log(`📊 Baseline updated: ${key} (mean: ${mean.toFixed(2)}, σ: ${stdDev.toFixed(2)})`);
  }

  /**
   * Update all baselines
   */
  private updateAllBaselines(): void {
    console.log('🔄 Updating all baselines...');

    for (const [key, history] of this.readingHistory.entries()) {
      const [mmsi, enginePosition] = key.split('_');
      this.updateBaselinesForVessel(mmsi as MMSI, enginePosition);
    }
  }

  /**
   * Predict with TabPFN-2.5 (ML integration)
   */
  private async predictWithTabPFN(
    mmsi: MMSI,
    enginePosition: string,
    paramType: ParameterType,
    currentValue: number
  ): Promise<{ severity: SeverityLevel; confidence: number } | null> {
    // TODO: Integration with TabPFN-2.5 adapter
    // For now, return null (statistical detection only)
    // See: /adapters/tabpfn/TabPFNAdapter.ts for implementation

    // Example integration:
    // const tabpfn = new TabPFNAdapter();
    // const features = this.extractFeatures(mmsi, enginePosition, paramType);
    // const prediction = await tabpfn.predict(features);
    // return { severity: prediction.class, confidence: prediction.probability };

    return null;
  }

  /**
   * Get anomalies for vessel
   */
  getAnomalies(
    mmsi: MMSI,
    options?: {
      enginePosition?: string;
      severity?: SeverityLevel;
      since?: Date;
    }
  ): Anomaly[] {
    let anomalies = this.anomalyHistory.filter(a => a.mmsi === mmsi);

    if (options?.enginePosition) {
      anomalies = anomalies.filter(a => a.enginePosition === options.enginePosition);
    }

    if (options?.severity) {
      anomalies = anomalies.filter(a => a.severity === options.severity);
    }

    if (options?.since) {
      anomalies = anomalies.filter(a => a.timestamp >= options.since!);
    }

    return anomalies.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get baseline statistics
   */
  getBaselineStats(mmsi: MMSI, enginePosition: string): Baseline[] {
    const baselines: Baseline[] = [];

    for (const [key, baseline] of this.baselines.entries()) {
      if (key.startsWith(`${mmsi}_${enginePosition}_`)) {
        baselines.push(baseline);
      }
    }

    return baselines;
  }

  /**
   * Get anomaly statistics
   */
  getAnomalyStatistics(mmsi: MMSI): {
    totalAnomalies: number;
    bySeverity: Record<SeverityLevel, number>;
    byParameter: Record<ParameterType, number>;
    last24Hours: number;
  } {
    const anomalies = this.getAnomalies(mmsi);

    const bySeverity: Record<SeverityLevel, number> = {
      Normal: 0,
      Warning: 0,
      Alarm: 0,
      Critical: 0,
    };

    const byParameter: Record<string, number> = {};

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600 * 1000);
    let last24Hours = 0;

    anomalies.forEach(a => {
      bySeverity[a.severity]++;
      byParameter[a.parameterType] = (byParameter[a.parameterType] || 0) + 1;
      if (a.timestamp >= twentyFourHoursAgo) {
        last24Hours++;
      }
    });

    return {
      totalAnomalies: anomalies.length,
      bySeverity,
      byParameter: byParameter as Record<ParameterType, number>,
      last24Hours,
    };
  }

  /**
   * Clear anomaly history
   */
  clearHistory(mmsi?: MMSI): void {
    if (mmsi) {
      this.anomalyHistory = this.anomalyHistory.filter(a => a.mmsi !== mmsi);
    } else {
      this.anomalyHistory = [];
    }
  }

  /**
   * Export anomaly report
   */
  exportReport(mmsi: MMSI): string {
    const anomalies = this.getAnomalies(mmsi);
    const stats = this.getAnomalyStatistics(mmsi);

    const report = {
      mmsi,
      generatedAt: new Date(),
      statistics: stats,
      anomalies: anomalies.map(a => ({
        timestamp: a.timestamp,
        severity: a.severity,
        parameter: a.parameterType,
        value: a.currentValue,
        expected: a.expectedValue,
        deviation: a.deviation,
        message: a.message,
        recommendations: a.recommendations,
      })),
    };

    return JSON.stringify(report, null, 2);
  }
}
