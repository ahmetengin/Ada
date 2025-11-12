/**
 * Ada Observer - Zora-style intelligent yacht monitoring
 * Provides vessel state intelligence, automatic logging, and smart monitoring
 */

import { EventEmitter } from 'events';
import {
  VesselState,
  VesselStateContext,
  PrimaryNavigationData,
  SmartAnchorWatch,
  AnchorAlert,
  AutomaticLogEntry,
  VoyageJourney,
  MaintenanceTask,
  SystemMonitoring,
  AwayMode,
  ParsedNMEAData,
} from '../../../core/types.js';

export interface AdaObserverConfig {
  vesselName: string;
  bowRollerHeight: number; // meters from waterline
  enableAutoLogging?: boolean;
  enableStateDetection?: boolean;
}

export class AdaObserver extends EventEmitter {
  private config: AdaObserverConfig;

  // Current state
  private currentState: VesselStateContext;
  private previousState: VesselState = 'unknown';

  // Navigation data
  private navigationData: PrimaryNavigationData | null = null;

  // Anchor watch
  private anchorWatch: SmartAnchorWatch | null = null;

  // Logbook
  private logEntries: AutomaticLogEntry[] = [];
  private currentJourney: VoyageJourney | null = null;

  // Maintenance
  private maintenanceTasks: MaintenanceTask[] = [];

  // Away mode
  private awayMode: AwayMode | null = null;

  // Data buffer for state detection
  private dataBuffer: ParsedNMEAData[] = [];
  private stateDetectionInterval: NodeJS.Timeout | null = null;

  constructor(config: AdaObserverConfig) {
    super();
    this.config = config;

    this.currentState = {
      state: 'unknown',
      timestamp: new Date(),
      confidence: 0,
    };

    // Start state detection
    if (config.enableStateDetection !== false) {
      this.startStateDetection();
    }
  }

  /**
   * Update navigation data from NMEA2000
   */
  updateNavigationData(data: Partial<PrimaryNavigationData>): void {
    this.navigationData = {
      ...this.navigationData,
      ...data,
      timestamp: new Date(),
    } as PrimaryNavigationData;

    // Emit for real-time updates
    this.emit('navigation:update', this.navigationData);

    // Add to buffer for state detection
    this.dataBuffer.push(data as any);

    // Keep only last 100 data points
    if (this.dataBuffer.length > 100) {
      this.dataBuffer = this.dataBuffer.slice(-100);
    }
  }

  /**
   * Get current primary navigation data
   */
  getPrimaryNavigationData(): PrimaryNavigationData | null {
    return this.navigationData;
  }

  /**
   * Intelligent vessel state detection (like Zora)
   */
  private detectVesselState(): VesselStateContext {
    const now = new Date();

    if (!this.navigationData) {
      return {
        state: 'unknown',
        timestamp: now,
        confidence: 0,
      };
    }

    const { speed, position, heading, wind, depth } = this.navigationData;

    // Collect evidence for state detection
    const sog = speed?.overGround || 0;
    const stw = speed?.throughWater || 0;
    const engineRunning = this.isEngineRunning();
    const sailsUp = this.areSailsUp();
    const anchorDown = this.anchorWatch?.active || false;

    let detectedState: VesselState = 'unknown';
    let confidence = 50;

    // State detection logic
    if (anchorDown) {
      if (sog < 0.3) {
        detectedState = 'anchored';
        confidence = 95;
      } else if (sog < 1.0) {
        detectedState = 'at-anchor'; // Swinging at anchor
        confidence = 90;
      } else {
        detectedState = 'anchoring'; // Anchor dragging or setting
        confidence = 70;
      }
    } else if (sog < 0.5 && stw < 0.5) {
      detectedState = 'drifting';
      confidence = 80;
    } else if (sog > 1.0) {
      // We're moving
      if (sailsUp && engineRunning) {
        detectedState = 'underway-motorsailing';
        confidence = 95;
      } else if (sailsUp) {
        detectedState = 'underway-sailing';
        confidence = 90;
      } else if (engineRunning) {
        detectedState = 'underway-motoring';
        confidence = 90;
      } else {
        detectedState = 'drifting';
        confidence = 60;
      }
    } else {
      // Stationary but not anchored
      if (depth && depth < 5) {
        detectedState = 'docked';
        confidence = 70;
      } else {
        detectedState = 'drifting';
        confidence = 50;
      }
    }

    return {
      state: detectedState,
      timestamp: now,
      position,
      speed: { sog, stw },
      heading,
      wind,
      depth,
      engineRunning,
      sailsUp,
      anchorDown,
      confidence,
    };
  }

  /**
   * Start automatic state detection
   */
  private startStateDetection(): void {
    this.stateDetectionInterval = setInterval(() => {
      const newStateContext = this.detectVesselState();
      const previousStateValue = this.currentState.state;

      this.currentState = newStateContext;

      // Emit state change if different
      if (newStateContext.state !== previousStateValue && newStateContext.confidence > 70) {
        this.onStateChange(previousStateValue, newStateContext.state);
      }

      // Emit state update
      this.emit('state:update', this.currentState);
    }, 5000); // Every 5 seconds
  }

  /**
   * Handle vessel state changes
   */
  private onStateChange(from: VesselState, to: VesselState): void {
    this.emit('state:change', { from, to, timestamp: new Date() });

    // Auto-log state changes
    if (this.config.enableAutoLogging !== false) {
      this.createAutoLog({
        type: 'sail-change',
        notes: `Vessel state changed from ${from} to ${to}`,
      });
    }

    // Handle specific state transitions
    if (to === 'anchored' && from === 'anchoring') {
      this.emit('anchor:set', { timestamp: new Date() });
    }

    if (to === 'underway-sailing' && from === 'anchored') {
      this.startNewJourney();
    }

    if ((to === 'anchored' || to === 'docked') && from.startsWith('underway')) {
      this.endCurrentJourney();
    }
  }

  /**
   * Get current vessel state
   */
  getVesselState(): VesselStateContext {
    return this.currentState;
  }

  /**
   * Smart Anchor Watch - Like Zora's intelligent anchor alarm
   */
  startAnchorWatch(config: {
    chainLength: number;
    waterDepth: number;
    manualAdjustment?: number;
  }): SmartAnchorWatch {
    if (!this.navigationData?.position) {
      throw new Error('Cannot start anchor watch without position data');
    }

    const scope = config.chainLength / (config.waterDepth + this.config.bowRollerHeight);

    // Calculate swing radius using actual geometry
    const horizontalChain = Math.sqrt(
      config.chainLength ** 2 - (config.waterDepth + this.config.bowRollerHeight) ** 2
    );

    const swingRadius = horizontalChain + (config.manualAdjustment || 0);

    this.anchorWatch = {
      id: `anchor-${Date.now()}`,
      active: true,
      anchorPosition: { ...this.navigationData.position },
      anchorSetTime: new Date(),
      chainLength: config.chainLength,
      waterDepth: config.waterDepth,
      bowRollerHeight: this.config.bowRollerHeight,
      scope,
      swingRadius,
      currentPosition: { ...this.navigationData.position },
      distanceFromAnchor: 0,
      isDragging: false,
      alerts: [],
    };

    this.emit('anchor:watch:started', this.anchorWatch);

    // Start monitoring
    this.startAnchorMonitoring();

    // Auto-log
    this.createAutoLog({
      type: 'anchor',
      notes: `Anchor set with ${config.chainLength}m chain, depth ${config.waterDepth}m, scope ${scope.toFixed(1)}:1`,
    });

    return this.anchorWatch;
  }

  /**
   * Monitor anchor position
   */
  private startAnchorMonitoring(): void {
    const checkInterval = setInterval(() => {
      if (!this.anchorWatch || !this.anchorWatch.active) {
        clearInterval(checkInterval);
        return;
      }

      if (!this.navigationData?.position) {
        return;
      }

      // Calculate distance from anchor
      const distance = this.calculateDistance(
        this.anchorWatch.anchorPosition,
        this.navigationData.position
      );

      this.anchorWatch.currentPosition = { ...this.navigationData.position };
      this.anchorWatch.distanceFromAnchor = distance;

      // Check for dragging
      const previousDragging = this.anchorWatch.isDragging;
      this.anchorWatch.isDragging = distance > this.anchorWatch.swingRadius;

      if (this.anchorWatch.isDragging && !previousDragging) {
        // Started dragging
        const alert: AnchorAlert = {
          id: `alert-${Date.now()}`,
          type: 'drag',
          severity: 'critical',
          message: `Anchor drag detected! Distance: ${distance.toFixed(1)}m, Limit: ${this.anchorWatch.swingRadius.toFixed(1)}m`,
          timestamp: new Date(),
          acknowledged: false,
        };

        this.anchorWatch.alerts.push(alert);
        this.emit('anchor:drag', alert);

        // Send away mode notification if enabled
        if (this.awayMode?.enabled) {
          this.sendAwayModeNotification('anchor-drag', alert.message);
        }
      } else if (!this.anchorWatch.isDragging && previousDragging) {
        // Stopped dragging
        const alert: AnchorAlert = {
          id: `alert-${Date.now()}`,
          type: 'drag',
          severity: 'info',
          message: `Anchor holding again. Distance: ${distance.toFixed(1)}m`,
          timestamp: new Date(),
          acknowledged: false,
        };

        this.anchorWatch.alerts.push(alert);
        this.emit('anchor:holding', alert);

        if (this.awayMode?.enabled) {
          this.sendAwayModeNotification('anchor-drag', alert.message);
        }
      }

      this.emit('anchor:watch:update', this.anchorWatch);
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop anchor watch
   */
  stopAnchorWatch(): void {
    if (this.anchorWatch) {
      this.anchorWatch.active = false;
      this.emit('anchor:watch:stopped', this.anchorWatch);

      this.createAutoLog({
        type: 'anchor',
        notes: 'Anchor lifted',
      });

      this.anchorWatch = null;
    }
  }

  /**
   * Get current anchor watch
   */
  getAnchorWatch(): SmartAnchorWatch | null {
    return this.anchorWatch;
  }

  /**
   * Create automatic log entry
   */
  createAutoLog(entry: Partial<AutomaticLogEntry>): AutomaticLogEntry {
    const logEntry: AutomaticLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date(),
      type: entry.type || 'manual',
      vesselState: this.currentState.state,
      position: this.navigationData?.position || { latitude: 0, longitude: 0 },
      weather: entry.weather,
      notes: entry.notes,
      voiceTranscription: entry.voiceTranscription,
      photos: entry.photos,
      sailConfiguration: entry.sailConfiguration,
      engineHours: entry.engineHours,
      fuelConsumed: entry.fuelConsumed,
      distance: entry.distance,
    };

    this.logEntries.push(logEntry);

    // Add to current journey if active
    if (this.currentJourney) {
      this.currentJourney.logEntries.push(logEntry);
    }

    this.emit('log:entry', logEntry);

    return logEntry;
  }

  /**
   * Get log entries
   */
  getLogEntries(limit?: number): AutomaticLogEntry[] {
    if (limit) {
      return this.logEntries.slice(-limit);
    }
    return this.logEntries;
  }

  /**
   * Start new journey
   */
  private startNewJourney(): void {
    if (!this.navigationData?.position) {
      return;
    }

    this.currentJourney = {
      id: `journey-${Date.now()}`,
      startTime: new Date(),
      startPosition: { ...this.navigationData.position },
      route: [
        {
          ...this.navigationData.position,
          timestamp: new Date(),
        },
      ],
      distance: 0,
      maxSpeed: 0,
      avgSpeed: 0,
      vesselStates: [this.currentState.state],
      logEntries: [],
      weatherConditions: [],
    };

    this.emit('journey:started', this.currentJourney);
  }

  /**
   * End current journey
   */
  private endCurrentJourney(): void {
    if (!this.currentJourney || !this.navigationData?.position) {
      return;
    }

    this.currentJourney.endTime = new Date();
    this.currentJourney.endPosition = { ...this.navigationData.position };

    this.emit('journey:ended', this.currentJourney);

    // Archive journey
    this.currentJourney = null;
  }

  /**
   * Away Mode - Send notifications when off boat
   */
  enableAwayMode(config: AwayMode): void {
    this.awayMode = {
      ...config,
      enabled: true,
      activatedAt: new Date(),
    };

    this.emit('away:mode:enabled', this.awayMode);

    this.createAutoLog({
      type: 'manual',
      notes: 'Away mode activated',
    });
  }

  /**
   * Disable away mode
   */
  disableAwayMode(): void {
    if (this.awayMode) {
      this.awayMode.enabled = false;
      this.emit('away:mode:disabled');

      this.createAutoLog({
        type: 'manual',
        notes: 'Away mode deactivated',
      });
    }
  }

  /**
   * Send away mode notification
   */
  private sendAwayModeNotification(type: string, message: string): void {
    if (!this.awayMode?.enabled) {
      return;
    }

    const notification = {
      type,
      message,
      timestamp: new Date(),
      contacts: this.awayMode.contacts,
      preferences: this.awayMode.notificationPreferences,
    };

    this.emit('away:notification', notification);

    // TODO: Integrate with SMS/Email service
    console.log('📧 Away Mode Notification:', notification);
  }

  /**
   * Helper: Calculate distance between two positions (Haversine formula)
   */
  private calculateDistance(
    pos1: { latitude: number; longitude: number },
    pos2: { latitude: number; longitude: number }
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (pos1.latitude * Math.PI) / 180;
    const φ2 = (pos2.latitude * Math.PI) / 180;
    const Δφ = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
    const Δλ = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Helper: Check if engine is running (from NMEA data)
   */
  private isEngineRunning(): boolean {
    // TODO: Implement based on NMEA engine RPM data
    return false;
  }

  /**
   * Helper: Check if sails are up
   */
  private areSailsUp(): boolean {
    // TODO: Implement based on sail sensors or manual input
    return false;
  }

  /**
   * Get current journey
   */
  getCurrentJourney(): VoyageJourney | null {
    return this.currentJourney;
  }

  /**
   * Maintenance Management
   */
  addMaintenanceTask(task: Omit<MaintenanceTask, 'id'>): MaintenanceTask {
    const newTask: MaintenanceTask = {
      id: `maint-${Date.now()}`,
      ...task,
    };

    this.maintenanceTasks.push(newTask);
    this.emit('maintenance:task:added', newTask);

    return newTask;
  }

  /**
   * Get maintenance tasks
   */
  getMaintenanceTasks(status?: MaintenanceTask['status']): MaintenanceTask[] {
    if (status) {
      return this.maintenanceTasks.filter(t => t.status === status);
    }
    return this.maintenanceTasks;
  }

  /**
   * Update maintenance task
   */
  updateMaintenanceTask(id: string, updates: Partial<MaintenanceTask>): MaintenanceTask | null {
    const task = this.maintenanceTasks.find(t => t.id === id);
    if (!task) {
      return null;
    }

    Object.assign(task, updates);
    this.emit('maintenance:task:updated', task);

    return task;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.stateDetectionInterval) {
      clearInterval(this.stateDetectionInterval);
    }
  }
}
