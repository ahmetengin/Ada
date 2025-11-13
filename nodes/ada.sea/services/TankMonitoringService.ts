/**
 * Tank Monitoring Service
 *
 * Real-time monitoring of vessel tanks with WebSocket broadcast:
 * - Fresh water
 * - Fuel (diesel/petrol)
 * - Black water (sewage holding tank)
 * - Grey water (galley/shower drainage)
 * - LPG (liquefied petroleum gas)
 *
 * Features:
 * - Real-time level monitoring
 * - Low/high level alarms
 * - Consumption rate calculations
 * - Time-to-empty predictions
 * - WebSocket broadcast to clients
 * - Historical data logging
 */

import { EventEmitter } from 'events';
import { WebSocketServer, WebSocket } from 'ws';
import { MMSI } from '../types/AISTypes.js';

export type TankType = 'freshWater' | 'fuel' | 'blackWater' | 'greyWater' | 'lpg';

export type FuelType = 'diesel' | 'petrol' | 'lpg';

export interface TankConfiguration {
  tankId: string;
  tankType: TankType;
  name: string; // e.g., "Port Fresh Water", "Main Fuel Tank"
  capacity: number; // liters
  usableCapacity: number; // liters (accounting for sediment, pickup height)
  shape: 'rectangular' | 'cylindrical' | 'custom';

  // Sensor configuration
  sensorType: 'capacitive' | 'ultrasonic' | 'pressure' | 'float';
  sensorMin: number; // Raw sensor value at empty
  sensorMax: number; // Raw sensor value at full

  // Calibration points (for non-linear tanks)
  calibration?: Array<{
    sensorValue: number;
    liters: number;
  }>;

  // Fuel-specific
  fuelType?: FuelType;

  // Location
  location: 'port' | 'starboard' | 'center' | 'stern' | 'bow';
}

export interface TankReading {
  timestamp: Date;
  tankId: string;
  mmsi: MMSI;

  // Raw data
  sensorValue: number;

  // Calculated data
  liters: number;
  percentage: number; // 0-100

  // Status
  temperature?: number; // Celsius (important for fuel)
  quality?: 'good' | 'degraded' | 'contaminated'; // For water
}

export interface TankStatus {
  tankId: string;
  tankType: TankType;
  name: string;

  // Current state
  currentLiters: number;
  currentPercentage: number;
  capacity: number;

  // Alarms
  isLowLevel: boolean;
  isHighLevel: boolean;
  isCriticallyLow: boolean;

  // Consumption
  consumptionRate: number; // liters/hour
  timeToEmpty?: number; // hours (null if filling)

  // Last update
  lastUpdate: Date;

  // Temperature (for fuel)
  temperature?: number;
}

export interface TankAlarm {
  id: string;
  timestamp: Date;
  tankId: string;
  mmsi: MMSI;
  tankType: TankType;
  alarmType: 'low' | 'critically-low' | 'high' | 'sensor-fault' | 'contamination';
  severity: 'warning' | 'alarm' | 'critical';
  message: string;
  currentLevel: number;
  currentPercentage: number;
}

export interface TankMonitoringConfig {
  // Alarm thresholds
  lowLevelThreshold: {
    freshWater: number; // percentage
    fuel: number;
    lpg: number;
  };
  criticalLowThreshold: {
    freshWater: number;
    fuel: number;
    lpg: number;
  };
  highLevelThreshold: {
    blackWater: number; // percentage
    greyWater: number;
  };

  // Consumption calculation
  consumptionWindowMinutes: number; // Time window for rate calculation

  // WebSocket
  wsPort: number;
  broadcastIntervalMs: number; // How often to broadcast updates

  // Data retention
  historyRetentionDays: number;
}

export class TankMonitoringService extends EventEmitter {
  private config: TankMonitoringConfig;
  private tanks: Map<string, TankConfiguration> = new Map(); // key: tankId
  private currentReadings: Map<string, TankReading> = new Map(); // key: tankId
  private readingHistory: Map<string, TankReading[]> = new Map(); // key: tankId
  private alarms: TankAlarm[] = [];

  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private broadcastInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<TankMonitoringConfig>) {
    super();

    this.config = {
      lowLevelThreshold: {
        freshWater: 20, // 20%
        fuel: 25, // 25%
        lpg: 25,
      },
      criticalLowThreshold: {
        freshWater: 10, // 10%
        fuel: 15, // 15%
        lpg: 15,
      },
      highLevelThreshold: {
        blackWater: 90, // 90%
        greyWater: 85, // 85%
      },
      wsPort: 8765,
      broadcastIntervalMs: 5000, // 5 seconds
      consumptionWindowMinutes: 60, // 1 hour
      historyRetentionDays: 30,
      ...config,
    };
  }

  /**
   * Initialize WebSocket server
   */
  async startWebSocketServer(): Promise<void> {
    if (this.wss) {
      console.log('⚠️ WebSocket server already running');
      return;
    }

    this.wss = new WebSocketServer({ port: this.config.wsPort });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`📡 Tank monitoring client connected (total: ${this.clients.size})`);

      // Send current status immediately
      this.sendCurrentStatus(ws);

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`📡 Tank monitoring client disconnected (total: ${this.clients.size})`);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    // Start periodic broadcast
    this.broadcastInterval = setInterval(() => {
      this.broadcastToClients();
    }, this.config.broadcastIntervalMs);

    console.log(`✅ Tank monitoring WebSocket server started on port ${this.config.wsPort}`);
  }

  /**
   * Stop WebSocket server
   */
  async stopWebSocketServer(): Promise<void> {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
    console.log('WebSocket server stopped');
  }

  /**
   * Register tank configuration
   */
  registerTank(config: TankConfiguration): void {
    this.tanks.set(config.tankId, config);
    this.readingHistory.set(config.tankId, []);

    console.log(`✅ Tank registered: ${config.name} (${config.capacity}L ${config.tankType})`);

    this.emit('tank:registered', config);
  }

  /**
   * Process tank reading
   */
  async processReading(
    mmsi: MMSI,
    tankId: string,
    sensorValue: number,
    temperature?: number
  ): Promise<TankStatus> {
    const tank = this.tanks.get(tankId);

    if (!tank) {
      throw new Error(`Tank not found: ${tankId}`);
    }

    // Convert sensor value to liters
    const liters = this.sensorToLiters(tank, sensorValue);
    const percentage = (liters / tank.capacity) * 100;

    const reading: TankReading = {
      timestamp: new Date(),
      tankId,
      mmsi,
      sensorValue,
      liters,
      percentage,
      temperature,
    };

    // Store reading
    this.currentReadings.set(tankId, reading);
    this.storeReadingHistory(tankId, reading);

    // Calculate consumption rate
    const consumptionRate = this.calculateConsumptionRate(tankId);

    // Check for alarms
    const alarms = this.checkAlarms(tank, reading);

    // Emit events
    this.emit('tank:reading', reading);

    if (alarms.length > 0) {
      alarms.forEach(alarm => {
        this.alarms.push(alarm);
        this.emit('tank:alarm', alarm);

        if (alarm.severity === 'critical') {
          this.emit('tank:alarm:critical', alarm);
        }
      });
    }

    // Calculate time to empty
    let timeToEmpty: number | undefined;
    if (consumptionRate > 0 && (tank.tankType === 'freshWater' || tank.tankType === 'fuel' || tank.tankType === 'lpg')) {
      timeToEmpty = liters / consumptionRate; // hours
    }

    const status: TankStatus = {
      tankId,
      tankType: tank.tankType,
      name: tank.name,
      currentLiters: liters,
      currentPercentage: percentage,
      capacity: tank.capacity,
      isLowLevel: this.isLowLevel(tank, percentage),
      isHighLevel: this.isHighLevel(tank, percentage),
      isCriticallyLow: this.isCriticallyLow(tank, percentage),
      consumptionRate,
      timeToEmpty,
      lastUpdate: reading.timestamp,
      temperature,
    };

    return status;
  }

  /**
   * Convert sensor reading to liters
   */
  private sensorToLiters(tank: TankConfiguration, sensorValue: number): number {
    // Handle calibration curve if available
    if (tank.calibration && tank.calibration.length > 0) {
      return this.interpolateCalibration(tank.calibration, sensorValue);
    }

    // Linear interpolation
    const percentage = (sensorValue - tank.sensorMin) / (tank.sensorMax - tank.sensorMin);
    const liters = percentage * tank.usableCapacity;

    // Clamp to valid range
    return Math.max(0, Math.min(tank.usableCapacity, liters));
  }

  /**
   * Interpolate calibration curve
   */
  private interpolateCalibration(
    calibration: Array<{ sensorValue: number; liters: number }>,
    sensorValue: number
  ): number {
    // Sort calibration points
    const sorted = calibration.sort((a, b) => a.sensorValue - b.sensorValue);

    // Handle out of range
    if (sensorValue <= sorted[0].sensorValue) return sorted[0].liters;
    if (sensorValue >= sorted[sorted.length - 1].sensorValue) return sorted[sorted.length - 1].liters;

    // Find surrounding points
    for (let i = 0; i < sorted.length - 1; i++) {
      const p1 = sorted[i];
      const p2 = sorted[i + 1];

      if (sensorValue >= p1.sensorValue && sensorValue <= p2.sensorValue) {
        // Linear interpolation between p1 and p2
        const t = (sensorValue - p1.sensorValue) / (p2.sensorValue - p1.sensorValue);
        return p1.liters + t * (p2.liters - p1.liters);
      }
    }

    return 0;
  }

  /**
   * Store reading in history
   */
  private storeReadingHistory(tankId: string, reading: TankReading): void {
    const history = this.readingHistory.get(tankId)!;
    history.push(reading);

    // Limit history size (keep last 30 days at 5-second intervals = ~518,400 readings)
    // For practical purposes, keep last 10,000 readings per tank
    if (history.length > 10000) {
      history.shift();
    }
  }

  /**
   * Calculate consumption rate (liters/hour)
   */
  private calculateConsumptionRate(tankId: string): number {
    const history = this.readingHistory.get(tankId);

    if (!history || history.length < 2) {
      return 0;
    }

    // Get readings within consumption window
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.consumptionWindowMinutes * 60 * 1000);

    const recentReadings = history.filter(r => r.timestamp >= windowStart);

    if (recentReadings.length < 2) {
      return 0;
    }

    // Calculate rate from first to last reading in window
    const first = recentReadings[0];
    const last = recentReadings[recentReadings.length - 1];

    const litersDiff = first.liters - last.liters; // Positive = consumption
    const timeDiffHours = (last.timestamp.getTime() - first.timestamp.getTime()) / (1000 * 3600);

    if (timeDiffHours === 0) return 0;

    const rate = litersDiff / timeDiffHours;

    // Return 0 if filling (negative rate)
    return Math.max(0, rate);
  }

  /**
   * Check for alarms
   */
  private checkAlarms(tank: TankConfiguration, reading: TankReading): TankAlarm[] {
    const alarms: TankAlarm[] = [];

    // Low level alarms (water, fuel, LPG)
    if (
      tank.tankType === 'freshWater' ||
      tank.tankType === 'fuel' ||
      tank.tankType === 'lpg'
    ) {
      const criticalThreshold = this.config.criticalLowThreshold[tank.tankType];
      const lowThreshold = this.config.lowLevelThreshold[tank.tankType];

      if (reading.percentage <= criticalThreshold) {
        alarms.push({
          id: `alarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: reading.timestamp,
          tankId: tank.tankId,
          mmsi: reading.mmsi,
          tankType: tank.tankType,
          alarmType: 'critically-low',
          severity: 'critical',
          message: `🚨 ${tank.name} critically low: ${reading.liters.toFixed(1)}L (${reading.percentage.toFixed(1)}%)`,
          currentLevel: reading.liters,
          currentPercentage: reading.percentage,
        });
      } else if (reading.percentage <= lowThreshold) {
        alarms.push({
          id: `alarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: reading.timestamp,
          tankId: tank.tankId,
          mmsi: reading.mmsi,
          tankType: tank.tankType,
          alarmType: 'low',
          severity: 'warning',
          message: `⚠️ ${tank.name} low: ${reading.liters.toFixed(1)}L (${reading.percentage.toFixed(1)}%)`,
          currentLevel: reading.liters,
          currentPercentage: reading.percentage,
        });
      }
    }

    // High level alarms (black water, grey water)
    if (tank.tankType === 'blackWater' || tank.tankType === 'greyWater') {
      const highThreshold = this.config.highLevelThreshold[tank.tankType];

      if (reading.percentage >= highThreshold) {
        alarms.push({
          id: `alarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: reading.timestamp,
          tankId: tank.tankId,
          mmsi: reading.mmsi,
          tankType: tank.tankType,
          alarmType: 'high',
          severity: 'alarm',
          message: `⚠️ ${tank.name} almost full: ${reading.liters.toFixed(1)}L (${reading.percentage.toFixed(1)}%) - Pump out soon!`,
          currentLevel: reading.liters,
          currentPercentage: reading.percentage,
        });
      }
    }

    return alarms;
  }

  /**
   * Check if tank is at low level
   */
  private isLowLevel(tank: TankConfiguration, percentage: number): boolean {
    const threshold = this.config.lowLevelThreshold[tank.tankType as keyof typeof this.config.lowLevelThreshold];
    return threshold !== undefined && percentage <= threshold;
  }

  /**
   * Check if tank is critically low
   */
  private isCriticallyLow(tank: TankConfiguration, percentage: number): boolean {
    const threshold = this.config.criticalLowThreshold[tank.tankType as keyof typeof this.config.criticalLowThreshold];
    return threshold !== undefined && percentage <= threshold;
  }

  /**
   * Check if tank is at high level
   */
  private isHighLevel(tank: TankConfiguration, percentage: number): boolean {
    const threshold = this.config.highLevelThreshold[tank.tankType as keyof typeof this.config.highLevelThreshold];
    return threshold !== undefined && percentage >= threshold;
  }

  /**
   * Get current status for all tanks
   */
  getAllTankStatus(mmsi: MMSI): TankStatus[] {
    const statuses: TankStatus[] = [];

    for (const [tankId, tank] of this.tanks.entries()) {
      const reading = this.currentReadings.get(tankId);

      if (!reading) continue;

      const consumptionRate = this.calculateConsumptionRate(tankId);
      let timeToEmpty: number | undefined;

      if (consumptionRate > 0) {
        timeToEmpty = reading.liters / consumptionRate;
      }

      statuses.push({
        tankId,
        tankType: tank.tankType,
        name: tank.name,
        currentLiters: reading.liters,
        currentPercentage: reading.percentage,
        capacity: tank.capacity,
        isLowLevel: this.isLowLevel(tank, reading.percentage),
        isHighLevel: this.isHighLevel(tank, reading.percentage),
        isCriticallyLow: this.isCriticallyLow(tank, reading.percentage),
        consumptionRate,
        timeToEmpty,
        lastUpdate: reading.timestamp,
        temperature: reading.temperature,
      });
    }

    return statuses;
  }

  /**
   * Get tank status by ID
   */
  getTankStatus(tankId: string): TankStatus | null {
    const tank = this.tanks.get(tankId);
    const reading = this.currentReadings.get(tankId);

    if (!tank || !reading) return null;

    const consumptionRate = this.calculateConsumptionRate(tankId);
    let timeToEmpty: number | undefined;

    if (consumptionRate > 0) {
      timeToEmpty = reading.liters / consumptionRate;
    }

    return {
      tankId,
      tankType: tank.tankType,
      name: tank.name,
      currentLiters: reading.liters,
      currentPercentage: reading.percentage,
      capacity: tank.capacity,
      isLowLevel: this.isLowLevel(tank, reading.percentage),
      isHighLevel: this.isHighLevel(tank, reading.percentage),
      isCriticallyLow: this.isCriticallyLow(tank, reading.percentage),
      consumptionRate,
      timeToEmpty,
      lastUpdate: reading.timestamp,
      temperature: reading.temperature,
    };
  }

  /**
   * Get active alarms
   */
  getActiveAlarms(mmsi?: MMSI): TankAlarm[] {
    if (mmsi) {
      return this.alarms.filter(a => a.mmsi === mmsi);
    }
    return this.alarms;
  }

  /**
   * Clear alarms
   */
  clearAlarms(tankId?: string): void {
    if (tankId) {
      this.alarms = this.alarms.filter(a => a.tankId !== tankId);
    } else {
      this.alarms = [];
    }
  }

  /**
   * Send current status to specific client
   */
  private sendCurrentStatus(ws: WebSocket): void {
    const status = Array.from(this.tanks.keys()).map(tankId => this.getTankStatus(tankId));

    const message = JSON.stringify({
      type: 'tank-status',
      timestamp: new Date(),
      data: status,
    });

    ws.send(message);
  }

  /**
   * Broadcast to all connected clients
   */
  private broadcastToClients(): void {
    if (this.clients.size === 0) return;

    const status = Array.from(this.tanks.keys()).map(tankId => this.getTankStatus(tankId));

    const message = JSON.stringify({
      type: 'tank-status',
      timestamp: new Date(),
      data: status,
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Get consumption statistics
   */
  getConsumptionStatistics(tankId: string, hours: number = 24): {
    averageRate: number; // L/h
    totalConsumed: number; // L
    peakRate: number; // L/h
    minLevel: number; // L
    maxLevel: number; // L
  } | null {
    const history = this.readingHistory.get(tankId);

    if (!history || history.length < 2) return null;

    const since = new Date(Date.now() - hours * 3600 * 1000);
    const readings = history.filter(r => r.timestamp >= since);

    if (readings.length < 2) return null;

    const first = readings[0];
    const last = readings[readings.length - 1];

    const totalConsumed = Math.max(0, first.liters - last.liters);
    const timeDiffHours = (last.timestamp.getTime() - first.timestamp.getTime()) / (1000 * 3600);
    const averageRate = totalConsumed / timeDiffHours;

    // Calculate peak rate (max rate over 15-minute windows)
    let peakRate = 0;
    for (let i = 1; i < readings.length; i++) {
      const r1 = readings[i - 1];
      const r2 = readings[i];
      const diff = Math.max(0, r1.liters - r2.liters);
      const time = (r2.timestamp.getTime() - r1.timestamp.getTime()) / (1000 * 3600);
      const rate = diff / time;
      peakRate = Math.max(peakRate, rate);
    }

    const levels = readings.map(r => r.liters);
    const minLevel = Math.min(...levels);
    const maxLevel = Math.max(...levels);

    return {
      averageRate,
      totalConsumed,
      peakRate,
      minLevel,
      maxLevel,
    };
  }

  /**
   * Export tank data
   */
  exportData(tankId: string): string {
    const tank = this.tanks.get(tankId);
    const history = this.readingHistory.get(tankId);
    const status = this.getTankStatus(tankId);

    return JSON.stringify(
      {
        tank,
        currentStatus: status,
        history,
      },
      null,
      2
    );
  }
}
