/**
 * SeaNode - AI-powered yacht management node
 * Manages yachts over 12 meters with comprehensive AI capabilities
 */

import { BaseNode, BaseNodeOptions } from '../../core/BaseNode.js';
import { VesselData, VoyagePlan, NMEA2000Data } from '../../core/types.js';
import { NMEA2000Parser, ParsedNMEAData } from './services/NMEA2000Parser.js';
import { WeatherService } from './services/WeatherService.js';
import { CrewManagement } from './services/CrewManagement.js';
import { PassengerService } from './services/PassengerService.js';
import { MenuPlanning } from './services/MenuPlanning.js';
import { VoyagePlanning } from './services/VoyagePlanning.js';
import { VHFRadioService } from './services/VHFRadioService.js';
import { VHFMessageClassifier } from './services/VHFMessageClassifier.js';
import { VHFRaceMode } from './services/VHFRaceMode.js';
import { AdaObserver } from './services/AdaObserver.js';

export interface SeaNodeConfig extends Omit<BaseNodeOptions, 'type' | 'capabilities'> {
  vessel: VesselData;
  name: string;
}

export class SeaNode extends BaseNode {
  private vessel: VesselData;

  // Services
  private nmea2000Parser: NMEA2000Parser;
  private weatherService: WeatherService;
  private crewManagement: CrewManagement;
  private passengerService: PassengerService;
  private menuPlanning: MenuPlanning;
  private voyagePlanning: VoyagePlanning;
  private vhfRadioService: VHFRadioService;
  private vhfMessageClassifier: VHFMessageClassifier;
  private vhfRaceMode?: VHFRaceMode;
  private observer: AdaObserver; // Intelligent vessel monitoring

  // State
  private currentVoyage?: VoyagePlan;
  private vesselState: Record<string, any> = {};
  private nmeaDataBuffer: ParsedNMEAData[] = [];

  constructor(config: SeaNodeConfig) {
    super({
      ...config,
      type: 'ada.sea',
      capabilities: {
        skills: [
          'yacht-management',
          'nmea2000-integration',
          'weather-monitoring',
          'crew-management',
          'passenger-management',
          'menu-planning',
          'voyage-planning',
          'marina-communication',
          'vhf-radio-monitoring',
          'emergency-detection',
          'vessel-state-intelligence',
          'smart-anchor-watch',
          'automatic-logbook',
          'maintenance-management',
          'away-mode-notifications',
        ],
        services: [
          'vessel-monitoring',
          'navigation-assistance',
          'provisioning',
          'document-management',
          'reservation-management',
          'vhf-scanner',
          'radio-transcription',
          'ada-observer',
          'primary-navigation-display',
          'smart-monitoring',
        ],
        integrations: [
          'nmea2000',
          'weather-api',
          'marina-systems',
          'e-invoice',
          'rtl-sdr',
          'vhf-radio',
        ],
      },
    });

    this.vessel = config.vessel;

    // Initialize services
    this.nmea2000Parser = new NMEA2000Parser();
    this.weatherService = new WeatherService();
    this.crewManagement = new CrewManagement();
    this.passengerService = new PassengerService();
    this.menuPlanning = new MenuPlanning();
    this.voyagePlanning = new VoyagePlanning();
    this.vhfRadioService = new VHFRadioService({
      geographicMode: 'turkey',
      autoTuneByLocation: true,
      enableVAD: true,
      enableSTT: true,
    });
    this.vhfMessageClassifier = new VHFMessageClassifier();

    // Initialize Ada Observer
    this.observer = new AdaObserver({
      vesselName: config.vessel.name,
      bowRollerHeight: 1.5, // Default 1.5m - should be configurable
      enableAutoLogging: true,
      enableStateDetection: true,
    });

    // Setup observer event handlers
    this.setupObserverHandlers();
  }

  /**
   * Initialize the Sea node
   */
  async initialize(): Promise<void> {
    this.logEvent('Sea node initializing', { vessel: this.vessel });

    // Set up message handlers for marina communication
    this.setupMarinaHandlers();

    // Set up NMEA2000 data processing
    this.setupNMEAProcessing();

    // Set up VHF radio monitoring
    this.setupVHFRadioHandlers();

    this.logEvent('Sea node initialized', { id: this.identity.id });
  }

  /**
   * Process tasks specific to yacht management
   */
  async processTask(task: any): Promise<any> {
    const { type, data } = task;

    switch (type) {
      case 'plan-voyage':
        return await this.planVoyage(data);

      case 'monitor-vessel':
        return this.getVesselStatus();

      case 'manage-crew':
        return this.manageCrewTask(data);

      case 'manage-passengers':
        return this.managePassengerTask(data);

      case 'plan-menu':
        return this.planMenuTask(data);

      case 'request-marina-service':
        return await this.requestMarinaService(data);

      case 'check-weather':
        return await this.checkWeatherTask(data);

      case 'vhf-radio':
        return await this.manageVHFRadioTask(data);

      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Get node status
   */
  getStatus(): Record<string, any> {
    return {
      vessel: this.vessel,
      currentVoyage: this.currentVoyage,
      vesselState: this.vesselState,
      crew: this.crewManagement.generateCrewReport(),
      passengers: this.passengerService.generatePassengerReport(),
      lastNMEAUpdate: this.nmeaDataBuffer.length > 0
        ? this.nmeaDataBuffer[this.nmeaDataBuffer.length - 1].timestamp
        : null,
    };
  }

  /**
   * Process NMEA2000 data
   */
  processNMEA2000Data(data: NMEA2000Data): void {
    const parsed = this.nmea2000Parser.parse(data);

    if (parsed) {
      this.nmeaDataBuffer.push(parsed);

      // Keep only last 100 messages
      if (this.nmeaDataBuffer.length > 100) {
        this.nmeaDataBuffer.shift();
      }

      // Update vessel state
      this.vesselState = this.nmea2000Parser.aggregateToVesselState(this.nmeaDataBuffer);

      // Update Observer with navigation data
      if (this.vesselState) {
        this.observer.updateNavigationData({
          heading: {
            magnetic: this.vesselState.heading?.magnetic || 0,
            true: this.vesselState.heading?.true || 0,
          },
          wind: {
            apparentSpeed: this.vesselState.wind?.apparentSpeed || 0,
            apparentAngle: this.vesselState.wind?.apparentAngle || 0,
            trueSpeed: this.vesselState.wind?.trueSpeed || 0,
            trueAngle: this.vesselState.wind?.trueAngle || 0,
          },
          depth: this.vesselState.depth || 0,
          speed: {
            throughWater: this.vesselState.speed?.stw || 0,
            overGround: this.vesselState.speed?.sog || 0,
          },
          position: {
            latitude: this.vesselState.position?.latitude || 0,
            longitude: this.vesselState.position?.longitude || 0,
          },
          autopilot: this.vesselState.autopilot,
          timestamp: new Date(),
        });
      }

      // Check for alerts
      const alerts = this.nmea2000Parser.checkAlerts(this.vesselState);
      if (alerts.length > 0) {
        alerts.forEach(alert => {
          this.remember('event', alert, ['alert', alert.severity], 8);
          this.emit('alert', alert);
        });
      }

      this.updateActivity();
    }
  }

  /**
   * Plan a voyage
   */
  async planVoyage(data: {
    departure: { marina: string; date: Date; lat: number; lon: number };
    destination: { marina: string; lat: number; lon: number };
    cruisingSpeed?: number;
  }): Promise<VoyagePlan> {
    const crew = this.crewManagement.getAllCrew();
    const passengers = this.passengerService.getAllPassengers();

    const plan = await this.voyagePlanning.createVoyagePlan(
      this.vessel.name,
      data.departure,
      data.destination,
      crew,
      passengers,
      data.cruisingSpeed
    );

    // Assess safety
    const safety = await this.voyagePlanning.assessVoyageSafety(plan);

    // Optimize route
    const optimization = await this.voyagePlanning.optimizeRoute(plan);

    // Plan menu
    const duration = Math.ceil(
      (plan.destination.estimatedArrival.getTime() - plan.departure.date.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const menus = this.menuPlanning.generateVoyageMenu(
      plan.departure.date,
      duration,
      passengers.length,
      crew.length
    );

    // Generate provisioning list
    const provisioning = this.menuPlanning.generateProvisioningList(
      plan.id,
      menus,
      crew.length + passengers.length
    );

    this.currentVoyage = plan;

    // Remember this voyage
    this.remember(
      'data',
      {
        plan,
        safety,
        optimization,
        provisioning,
      },
      ['voyage', 'planning'],
      9
    );

    // Generate briefing
    const briefing = await this.voyagePlanning.generateVoyageBriefing(plan);

    return {
      ...plan,
      safety,
      optimization,
      provisioning,
      briefing,
    } as any;
  }

  /**
   * Request service from marina
   */
  async requestMarinaService(data: {
    marinaId: string;
    serviceType: string;
    details: any;
  }): Promise<any> {
    // Find marina node
    const marinaNodes = BaseNode.findNodesByType('ada.marina');
    const marina = marinaNodes.find(n => n.getIdentity().id === data.marinaId);

    if (!marina) {
      throw new Error(`Marina not found: ${data.marinaId}`);
    }

    // Request service
    const response = await this.requestFromNode(
      data.marinaId,
      'service-request',
      {
        vesselName: this.vessel.name,
        vesselLength: this.vessel.length,
        serviceType: data.serviceType,
        details: data.details,
        requestingNode: this.identity.id,
      }
    );

    this.remember('data', { marinaRequest: data, response }, ['marina', 'service'], 7);

    return response;
  }

  /**
   * Get vessel status
   */
  getVesselStatus(): Record<string, any> {
    return {
      vessel: this.vessel,
      state: this.vesselState,
      voyage: this.currentVoyage,
      crew: this.crewManagement.getAllCrew(),
      passengers: this.passengerService.getAllPassengers(),
      lastUpdate: new Date(),
    };
  }

  /**
   * Manage crew task
   */
  private manageCrewTask(data: any): any {
    const { action, ...params } = data;

    switch (action) {
      case 'add':
        this.crewManagement.addCrewMember(params.member);
        return { success: true, message: 'Crew member added' };

      case 'check-compliance':
        return this.crewManagement.checkCompliance(params.crewId);

      case 'report':
        return this.crewManagement.generateCrewReport();

      default:
        throw new Error(`Unknown crew action: ${action}`);
    }
  }

  /**
   * Manage passenger task
   */
  private managePassengerTask(data: any): any {
    const { action, ...params } = data;

    switch (action) {
      case 'add':
        this.passengerService.addPassenger(params.passenger);
        return { success: true, message: 'Passenger added' };

      case 'check-documents':
        return this.passengerService.checkDocumentValidity(
          params.passengerId,
          params.destinationCountry
        );

      case 'report':
        return this.passengerService.generatePassengerReport();

      default:
        throw new Error(`Unknown passenger action: ${action}`);
    }
  }

  /**
   * Plan menu task
   */
  private planMenuTask(data: any): any {
    const { action, ...params } = data;

    switch (action) {
      case 'generate':
        return this.menuPlanning.generateVoyageMenu(
          params.startDate,
          params.duration,
          params.passengerCount,
          params.crewCount,
          params.dietaryRestrictions
        );

      case 'provisioning':
        return this.menuPlanning.generateProvisioningList(
          params.voyageId,
          params.menus,
          params.peopleCount
        );

      default:
        throw new Error(`Unknown menu action: ${action}`);
    }
  }

  /**
   * Check weather task
   */
  private async checkWeatherTask(data: any): Promise<any> {
    const { action, ...params } = data;

    switch (action) {
      case 'current':
        return await this.weatherService.getCurrentWeather(params.latitude, params.longitude);

      case 'forecast':
        return await this.weatherService.getRouteForecast(params.waypoints);

      case 'alerts':
        return await this.weatherService.getWeatherAlerts(params.latitude, params.longitude);

      default:
        throw new Error(`Unknown weather action: ${action}`);
    }
  }

  /**
   * Setup handlers for marina communication
   */
  private setupMarinaHandlers(): void {
    // Handle marina service confirmations
    this.communication.onMessagePattern(/^marina-/, async (message) => {
      this.remember('conversation', message, ['marina'], 6);
      return { received: true, timestamp: new Date() };
    });

    // Handle berth availability queries
    this.communication.onMessage('berth-available', async (message) => {
      return {
        vessel: this.vessel,
        requirements: {
          length: this.vessel.length,
          beam: this.vessel.beam,
          draft: this.vessel.draft,
        },
      };
    });
  }

  /**
   * Setup NMEA2000 data processing
   */
  private setupNMEAProcessing(): void {
    // In production, this would connect to actual NMEA2000 network
    // For now, just set up the processing pipeline
    this.emit('nmea-ready');
  }

  /**
   * Setup VHF radio event handlers
   */
  private setupVHFRadioHandlers(): void {
    // Handle VHF transmissions
    this.vhfRadioService.on('transmission:detected', (transmission) => {
      // Classify the transmission
      const classification = this.vhfMessageClassifier.classify(transmission);

      // Pass to race mode if active
      if (this.vhfRaceMode && this.vhfRaceMode.isRaceModeActive()) {
        this.vhfRaceMode.processTransmission(transmission);
      }

      // Remember important transmissions
      if (classification.priority === 'urgent' || classification.priority === 'high') {
        this.remember('event', {
          type: 'vhf-transmission',
          transmission,
          classification,
        }, ['vhf', 'radio', classification.type], 8);
      }

      // Emit for other systems
      this.emit('vhf:transmission', { transmission, classification });
    });

    // Handle emergency alerts
    this.vhfRadioService.on('alert:emergency', (alert) => {
      this.remember('event', {
        type: 'emergency-alert',
        alert,
      }, ['vhf', 'emergency', 'alert'], 10);

      // Emit critical alert
      this.emit('alert', {
        severity: 'critical',
        source: 'vhf-radio',
        message: alert.message,
        data: alert,
      });
    });

    // Handle critical alerts
    this.vhfRadioService.on('alert:critical', (alert) => {
      this.remember('event', {
        type: 'critical-alert',
        alert,
      }, ['vhf', 'critical', 'alert'], 9);

      this.emit('alert', {
        severity: 'warning',
        source: 'vhf-radio',
        message: alert.message,
        data: alert,
      });
    });

    // Handle location updates from NMEA for VHF auto-tuning
    this.on('location:update', (location) => {
      if (location.latitude && location.longitude) {
        this.vhfRadioService.updateLocation(location.latitude, location.longitude);
      }
    });

    this.emit('vhf-ready');
  }

  /**
   * Manage VHF radio task
   */
  private async manageVHFRadioTask(data: any): Promise<any> {
    const { action, ...params } = data;

    switch (action) {
      case 'start-scanner':
        await this.vhfRadioService.startScanning();
        return { success: true, message: 'VHF scanner started' };

      case 'stop-scanner':
        await this.vhfRadioService.stopScanning();
        return { success: true, message: 'VHF scanner stopped' };

      case 'get-state':
        return this.vhfRadioService.getState();

      case 'get-transmissions':
        return this.vhfRadioService.getTransmissions(params.limit || 50);

      case 'get-alerts':
        return this.vhfRadioService.getAlerts();

      case 'get-statistics':
        return this.vhfRadioService.getStatistics();

      case 'set-channels':
        this.vhfRadioService.setActiveChannels(params.channels);
        return { success: true, message: 'Active channels updated' };

      case 'update-location':
        this.vhfRadioService.updateLocation(params.latitude, params.longitude);
        return { success: true, message: 'Location updated' };

      case 'classify-transmission':
        const transmission = params.transmission;
        const classification = this.vhfMessageClassifier.classify(transmission);
        return { transmission, classification };

      case 'export-data':
        return this.vhfRadioService.exportData();

      case 'activate-race-mode':
        return this.activateRaceMode(params);

      case 'deactivate-race-mode':
        return this.deactivateRaceMode();

      case 'get-race-events':
        if (!this.vhfRaceMode) {
          return { error: 'Race mode not active' };
        }
        return this.vhfRaceMode.getRaceEvents();

      case 'get-race-summary':
        if (!this.vhfRaceMode) {
          return { error: 'Race mode not active' };
        }
        return this.vhfRaceMode.getRaceSummary();

      default:
        throw new Error(`Unknown VHF radio action: ${action}`);
    }
  }

  /**
   * Activate race mode for VHF monitoring
   */
  private activateRaceMode(params: {
    raceName: string;
    committeeChannel?: number;
    fleetChannel?: number;
    startTime?: string;
    courseMarks?: string[];
  }): any {
    this.vhfRaceMode = new VHFRaceMode({
      raceName: params.raceName,
      raceChannels: [6, 73, 72], // Standard race channels
      committeeChannel: params.committeeChannel || 73,
      fleetChannel: params.fleetChannel || 6,
      startTime: params.startTime ? new Date(params.startTime) : undefined,
      courseMarks: params.courseMarks,
    });

    // Setup race event handlers
    this.setupRaceModeHandlers();

    // Activate race mode
    this.vhfRaceMode.activate();

    // Set VHF scanner to race channels
    this.vhfRadioService.setActiveChannels(this.vhfRaceMode.getRaceChannels());

    this.remember('event', {
      type: 'race-mode-activated',
      raceName: params.raceName,
    }, ['vhf', 'race'], 9);

    return {
      success: true,
      message: 'Race mode activated',
      channels: this.vhfRaceMode.getRaceChannels(),
    };
  }

  /**
   * Deactivate race mode
   */
  private deactivateRaceMode(): any {
    if (!this.vhfRaceMode) {
      return { error: 'Race mode not active' };
    }

    this.vhfRaceMode.deactivate();
    this.vhfRaceMode = undefined;

    // Reset to normal channel priority
    const config = this.vhfRadioService.getStatistics();
    // Back to geographic mode

    return {
      success: true,
      message: 'Race mode deactivated',
    };
  }

  /**
   * Setup race mode event handlers
   */
  private setupRaceModeHandlers(): void {
    if (!this.vhfRaceMode) {
      return;
    }

    // Warning signal (5 minutes)
    this.vhfRaceMode.on('race:warning_signal', (data) => {
      this.remember('event', {
        type: 'race-warning-signal',
        class: data.class,
        event: data.event,
      }, ['vhf', 'race', 'start-sequence'], 9);

      this.emit('race:warning', data);
    });

    // Preparatory signal (4 minutes)
    this.vhfRaceMode.on('race:preparatory_signal', (data) => {
      this.remember('event', {
        type: 'race-preparatory-signal',
        class: data.class,
        event: data.event,
      }, ['vhf', 'race', 'start-sequence'], 9);

      this.emit('race:preparatory', data);
    });

    // One minute signal
    this.vhfRaceMode.on('race:one_minute_signal', (data) => {
      this.remember('event', {
        type: 'race-one-minute-signal',
        class: data.class,
        event: data.event,
      }, ['vhf', 'race', 'start-sequence'], 10);

      this.emit('race:one_minute', data);
    });

    // START!
    this.vhfRaceMode.on('race:start', (data) => {
      this.remember('event', {
        type: 'race-start',
        class: data.class,
        event: data.event,
        sequence: data.sequence,
      }, ['vhf', 'race', 'start'], 10);

      this.emit('race:start', data);
      this.emit('alert', {
        severity: 'info',
        source: 'vhf-race',
        message: `Race start for ${data.class}!`,
        data,
      });
    });

    // General recall
    this.vhfRaceMode.on('race:general_recall', (event) => {
      this.remember('event', {
        type: 'race-general-recall',
        event,
      }, ['vhf', 'race', 'recall'], 9);

      this.emit('race:general_recall', event);
      this.emit('alert', {
        severity: 'warning',
        source: 'vhf-race',
        message: 'General Recall!',
        data: event,
      });
    });

    // Abandonment
    this.vhfRaceMode.on('race:abandonment', (event) => {
      this.remember('event', {
        type: 'race-abandonment',
        event,
      }, ['vhf', 'race', 'abandonment'], 9);

      this.emit('race:abandonment', event);
      this.emit('alert', {
        severity: 'warning',
        source: 'vhf-race',
        message: 'Race Abandoned',
        data: event,
      });
    });

    // Course change
    this.vhfRaceMode.on('race:course_change', (event) => {
      this.remember('event', {
        type: 'race-course-change',
        event,
      }, ['vhf', 'race', 'course'], 8);

      this.emit('race:course_change', event);
    });

    // Mark rounding
    this.vhfRaceMode.on('race:mark_rounding', (event) => {
      this.remember('event', {
        type: 'race-mark-rounding',
        event,
      }, ['vhf', 'race', 'mark'], 7);

      this.emit('race:mark_rounding', event);
    });

    // Fleet comms
    this.vhfRaceMode.on('race:fleet_comms', (data) => {
      this.emit('race:fleet_comms', data);
    });
  }

  /**
   * Setup Observer event handlers
   */
  private setupObserverHandlers(): void {
    // State changes
    this.observer.on('state:change', (change) => {
      this.logEvent('Vessel state changed', { from: change.from, to: change.to });
      this.emit('observer:state-change', change);
    });

    // State updates
    this.observer.on('state:update', (state) => {
      this.emit('observer:state-update', state);
    });

    // Navigation updates
    this.observer.on('navigation:update', (data) => {
      this.emit('observer:navigation-update', data);
    });

    // Anchor events
    this.observer.on('anchor:watch:started', (watch) => {
      this.logEvent('Anchor watch started', watch);
      this.emit('observer:anchor-watch-started', watch);
    });

    this.observer.on('anchor:drag', (alert) => {
      this.logEvent('⚠️ ANCHOR DRAG DETECTED', alert);
      this.emit('alert', {
        severity: 'critical',
        source: 'anchor-watch',
        message: alert.message,
        data: alert,
      });
    });

    this.observer.on('anchor:holding', (alert) => {
      this.logEvent('Anchor holding again', alert);
      this.emit('observer:anchor-holding', alert);
    });

    // Journey events
    this.observer.on('journey:started', (journey) => {
      this.logEvent('Journey started', journey);
      this.emit('observer:journey-started', journey);
    });

    this.observer.on('journey:ended', (journey) => {
      this.logEvent('Journey ended', journey);
      this.emit('observer:journey-ended', journey);
    });

    // Log entries
    this.observer.on('log:entry', (entry) => {
      this.remember('data', entry, ['logbook', entry.type], 7);
      this.emit('observer:log-entry', entry);
    });

    // Away mode notifications
    this.observer.on('away:notification', (notification) => {
      this.logEvent('Away mode notification', notification);
      // TODO: Send actual SMS/Email
      this.emit('observer:away-notification', notification);
    });
  }

  /**
   * Get Ada Observer instance
   */
  getObserver(): AdaObserver {
    return this.observer;
  }

  /**
   * Export yacht data
   */
  exportVesselData(): string {
    return JSON.stringify({
      vessel: this.vessel,
      identity: this.identity,
      currentVoyage: this.currentVoyage,
      vesselState: this.vesselState,
      crew: this.crewManagement.getAllCrew(),
      passengers: this.passengerService.getAllPassengers(),
      observerState: this.observer.getVesselState(),
      navigationData: this.observer.getPrimaryNavigationData(),
      anchorWatch: this.observer.getAnchorWatch(),
    }, null, 2);
  }
}
