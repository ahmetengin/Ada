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
        ],
        services: [
          'vessel-monitoring',
          'navigation-assistance',
          'provisioning',
          'document-management',
          'reservation-management',
        ],
        integrations: [
          'nmea2000',
          'weather-api',
          'marina-systems',
          'e-invoice',
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
    }, null, 2);
  }
}
