/**
 * WeatherNode - AI-powered weather forecasting and maritime safety node
 * Provides weather forecasts, route safety analysis, and storm warnings
 */

import { BaseNode, BaseNodeOptions } from '../../core/BaseNode.js';
import { v4 as uuidv4 } from 'uuid';

export interface WeatherNodeConfig extends Omit<BaseNodeOptions, 'type' | 'capabilities'> {
  serviceInfo: {
    provider: string;
    coverage: string[];
  };
}

interface WeatherForecast {
  id: string;
  location: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  timestamp: Date;
  validUntil: Date;
  conditions: {
    temperature: number;
    windSpeed: number;
    windDirection: number;
    waveHeight: number;
    visibility: number;
    precipitation: number;
    humidity: number;
    pressure: number;
    cloudCover: number;
  };
  description: string;
  warnings: WeatherWarning[];
}

interface WeatherWarning {
  id: string;
  type: 'storm' | 'gale' | 'fog' | 'ice' | 'tsunami' | 'general';
  severity: 'low' | 'medium' | 'high' | 'extreme';
  title: string;
  description: string;
  validFrom: Date;
  validUntil: Date;
  affectedAreas: string[];
}

interface RouteSafetyAnalysis {
  routeId: string;
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  departureTime: Date;
  estimatedDuration: number;
  safetyRating: 'safe' | 'caution' | 'unsafe' | 'dangerous';
  risks: string[];
  recommendations: string[];
  alternativeRoutes?: any[];
  forecasts: WeatherForecast[];
}

export class WeatherNode extends BaseNode {
  private serviceInfo: WeatherNodeConfig['serviceInfo'];
  private forecasts: Map<string, WeatherForecast> = new Map();
  private warnings: Map<string, WeatherWarning> = new Map();
  private safetyAnalyses: Map<string, RouteSafetyAnalysis> = new Map();

  constructor(config: WeatherNodeConfig) {
    super({
      ...config,
      type: 'ada.weather',
      capabilities: {
        skills: [
          'weather-forecasting',
          'route-safety-analysis',
          'storm-tracking',
          'marine-weather',
          'wind-prediction',
          'wave-forecasting',
          'visibility-assessment',
          'emergency-alerts',
        ],
        services: [
          'weather-api',
          'safety-recommendations',
          'route-planning-support',
          'real-time-alerts',
          'historical-data',
          'climate-analysis',
        ],
        integrations: [
          'ada.sea',
          'ada.marina',
          'noaa-weather',
          'met-office',
          'satellite-systems',
        ],
      },
    });

    this.serviceInfo = config.serviceInfo;
    this.initializeWarnings();
  }

  /**
   * Initialize the Weather node
   */
  async initialize(): Promise<void> {
    this.logEvent('Weather node initializing', { service: this.serviceInfo });
    this.setupWeatherHandlers();
    this.logEvent('Weather node initialized', { id: this.identity.id });
  }

  /**
   * Process weather-related tasks
   */
  async processTask(task: any): Promise<any> {
    const { type, data } = task;

    switch (type) {
      case 'get-forecast':
        return this.getForecast(data);
      case 'analyze-route-safety':
        return this.analyzeRouteSafety(data);
      case 'get-warnings':
        return this.getActiveWarnings(data);
      case 'check-departure-safety':
        return this.checkDepartureSafety(data);
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Get node status
   */
  getStatus(): Record<string, any> {
    const activeWarnings = Array.from(this.warnings.values())
      .filter(w => w.validUntil > new Date());

    const severeWarnings = activeWarnings.filter(
      w => w.severity === 'high' || w.severity === 'extreme'
    ).length;

    return {
      service: this.serviceInfo,
      totalForecasts: this.forecasts.size,
      activeWarnings: activeWarnings.length,
      severeWarnings,
      safetyAnalyses: this.safetyAnalyses.size,
      coverage: this.serviceInfo.coverage,
    };
  }

  /**
   * Get weather forecast
   */
  getForecast(data: {
    latitude: number;
    longitude: number;
    name?: string;
  }): WeatherForecast {
    // Simulate weather forecast generation
    const forecast: WeatherForecast = {
      id: uuidv4(),
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        name: data.name,
      },
      timestamp: new Date(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      conditions: {
        temperature: 18 + Math.random() * 10, // 18-28°C
        windSpeed: 5 + Math.random() * 15, // 5-20 knots
        windDirection: Math.floor(Math.random() * 360), // 0-360°
        waveHeight: 0.5 + Math.random() * 2, // 0.5-2.5m
        visibility: 8 + Math.random() * 2, // 8-10 nautical miles
        precipitation: Math.random() * 5, // 0-5mm
        humidity: 60 + Math.random() * 30, // 60-90%
        pressure: 1010 + Math.random() * 20, // 1010-1030 hPa
        cloudCover: Math.random() * 100, // 0-100%
      },
      description: this.generateWeatherDescription(),
      warnings: this.getRelevantWarnings(data.latitude, data.longitude),
    };

    this.forecasts.set(forecast.id, forecast);

    this.remember('data', { forecast }, ['weather', 'forecast'], 7);

    return forecast;
  }

  /**
   * Analyze route safety
   */
  analyzeRouteSafety(data: {
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
    departureTime: Date;
    vesselType?: string;
  }): RouteSafetyAnalysis {
    const distance = this.calculateDistance(data.origin, data.destination);
    const estimatedDuration = distance / 6; // Assume 6 knots average speed (hours)

    // Get forecasts along the route
    const forecasts: WeatherForecast[] = [
      this.getForecast({ ...data.origin, name: 'Origin' }),
      this.getForecast({ ...data.destination, name: 'Destination' }),
    ];

    // Analyze safety
    const risks: string[] = [];
    let safetyLevel = 0; // 0=safe, 1=caution, 2=unsafe, 3=dangerous

    forecasts.forEach(forecast => {
      if (forecast.conditions.windSpeed > 25) {
        risks.push('High winds expected');
        safetyLevel = Math.max(safetyLevel, 2); // unsafe
      }
      if (forecast.conditions.waveHeight > 3) {
        risks.push('High waves expected');
        safetyLevel = Math.max(safetyLevel, 1); // caution
      }
      if (forecast.conditions.visibility < 2) {
        risks.push('Poor visibility');
        safetyLevel = Math.max(safetyLevel, 1); // caution
      }
      if (forecast.warnings.some(w => w.severity === 'high' || w.severity === 'extreme')) {
        risks.push('Severe weather warnings active');
        safetyLevel = Math.max(safetyLevel, 3); // dangerous
      }
    });

    const safetyRating: RouteSafetyAnalysis['safetyRating'] =
      safetyLevel === 3 ? 'dangerous' :
      safetyLevel === 2 ? 'unsafe' :
      safetyLevel === 1 ? 'caution' : 'safe';

    const recommendations: string[] = [];
    if (safetyRating === 'caution') {
      recommendations.push('Monitor weather closely');
      recommendations.push('Consider delaying departure by 6-12 hours');
    } else if (safetyRating === 'unsafe' || safetyRating === 'dangerous') {
      recommendations.push('DO NOT DEPART - Dangerous conditions');
      recommendations.push('Wait for weather improvement');
      recommendations.push('Consider alternative routes');
    } else {
      recommendations.push('Conditions favorable for departure');
      recommendations.push('Standard safety precautions apply');
    }

    const analysis: RouteSafetyAnalysis = {
      routeId: uuidv4(),
      origin: data.origin,
      destination: data.destination,
      departureTime: data.departureTime,
      estimatedDuration,
      safetyRating,
      risks,
      recommendations,
      forecasts,
    };

    this.safetyAnalyses.set(analysis.routeId, analysis);

    this.remember('data', { analysis }, ['route-safety'], 8);

    return analysis;
  }

  /**
   * Get active warnings
   */
  getActiveWarnings(data?: { area?: string }): WeatherWarning[] {
    let warnings = Array.from(this.warnings.values())
      .filter(w => w.validUntil > new Date());

    if (data?.area) {
      warnings = warnings.filter(w =>
        w.affectedAreas.some(a => a.toLowerCase().includes(data.area!.toLowerCase()))
      );
    }

    return warnings.sort((a, b) => {
      const severityOrder = { extreme: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Check departure safety
   */
  checkDepartureSafety(data: {
    location: { latitude: number; longitude: number };
    departureTime: Date;
  }): any {
    const forecast = this.getForecast(data.location);

    let safe = true;
    const issues: string[] = [];

    if (forecast.conditions.windSpeed > 20) {
      safe = false;
      issues.push(`High winds: ${forecast.conditions.windSpeed.toFixed(1)} knots`);
    }

    if (forecast.conditions.waveHeight > 2.5) {
      safe = false;
      issues.push(`High waves: ${forecast.conditions.waveHeight.toFixed(1)}m`);
    }

    if (forecast.conditions.visibility < 3) {
      safe = false;
      issues.push(`Low visibility: ${forecast.conditions.visibility.toFixed(1)} nm`);
    }

    if (forecast.warnings.length > 0) {
      safe = false;
      issues.push(`Active warnings: ${forecast.warnings.map(w => w.title).join(', ')}`);
    }

    return {
      safe,
      forecast,
      issues,
      recommendation: safe
        ? 'Conditions suitable for departure'
        : 'Delay departure until conditions improve',
    };
  }

  /**
   * Calculate distance between two points (simplified)
   */
  private calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    // Haversine formula (simplified for demo)
    const lat1 = (point1.latitude * Math.PI) / 180;
    const lat2 = (point2.latitude * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return 3440 * c; // Distance in nautical miles
  }

  /**
   * Generate weather description
   */
  private generateWeatherDescription(): string {
    const descriptions = [
      'Partly cloudy with gentle breeze',
      'Clear skies with light winds',
      'Overcast with moderate winds',
      'Sunny with calm seas',
      'Light rain with moderate breeze',
      'Fair weather conditions',
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  /**
   * Get relevant warnings for location
   */
  private getRelevantWarnings(latitude: number, longitude: number): WeatherWarning[] {
    // For demo, return warnings that might affect the area
    return Array.from(this.warnings.values())
      .filter(w => w.validUntil > new Date())
      .slice(0, 2); // Return max 2 warnings
  }

  /**
   * Initialize sample warnings
   */
  private initializeWarnings(): void {
    // Keep warnings map empty initially - will be populated dynamically
    // Add a sample warning for demonstration
    const sampleWarning: WeatherWarning = {
      id: uuidv4(),
      type: 'general',
      severity: 'low',
      title: 'Weather Monitoring Active',
      description: 'Routine weather monitoring in effect. No immediate threats.',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      affectedAreas: ['Mediterranean', 'Aegean Sea', 'Marmara Sea'],
    };

    this.warnings.set(sampleWarning.id, sampleWarning);
  }

  /**
   * Setup weather-specific message handlers
   */
  private setupWeatherHandlers(): void {
    // Weather forecast request
    this.communication.onMessage('get-weather', async (message) => {
      this.remember('conversation', message, ['weather-request'], 6);
      const forecast = this.getForecast(message.payload);
      return { success: true, forecast };
    });

    // Route safety check
    this.communication.onMessage('check-route-safety', async (message) => {
      this.remember('conversation', message, ['safety-check'], 8);
      const analysis = this.analyzeRouteSafety(message.payload);
      return { success: true, analysis };
    });

    // Departure safety check
    this.communication.onMessage('check-departure', async (message) => {
      const result = this.checkDepartureSafety(message.payload);
      return result;
    });

    // Weather warnings request
    this.communication.onMessage('get-warnings', async (message) => {
      const warnings = this.getActiveWarnings(message.payload);
      return { warnings };
    });

    // Service inquiry
    this.communication.onMessage('weather-inquiry', async (message) => {
      return {
        service: this.serviceInfo,
        status: this.getStatus(),
      };
    });
  }
}
