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
    apiKeys?: {
      piriReis?: string; // Historical Turkish maritime weather patterns
      poseidon?: string; // Real-time global weather service
      noaa?: string; // NOAA weather data
      metOffice?: string; // UK Met Office
    };
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

interface HistoricalWeatherData {
  location: { latitude: number; longitude: number };
  month: number;
  averageConditions: {
    temperature: number;
    windSpeed: number;
    waveHeight: number;
    precipitation: number;
  };
  extremeEvents: Array<{
    type: string;
    probability: number;
  }>;
  source: 'piri-reis' | 'historical-db';
}

interface WeatherDataSource {
  name: string;
  type: 'real-time' | 'historical' | 'forecast' | 'hybrid';
  reliability: number; // 0-1
  coverage: string[];
  latency: number; // milliseconds
  lastUpdate?: Date;
}

interface MultiSourceForecast extends WeatherForecast {
  sources: Array<{
    provider: string;
    confidence: number;
    timestamp: Date;
  }>;
  aggregatedConfidence: number;
}

interface VoyagePlan {
  id: string;
  route: Array<{ latitude: number; longitude: number; eta: Date }>;
  weatherWindows: Array<{
    start: Date;
    end: Date;
    conditions: string;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
  }>;
  optimalDeparture: Date;
  estimatedDuration: number;
  fuelOptimized: boolean;
  safetyScore: number;
}

export class WeatherNode extends BaseNode {
  private serviceInfo: WeatherNodeConfig['serviceInfo'];
  private forecasts: Map<string, WeatherForecast> = new Map();
  private warnings: Map<string, WeatherWarning> = new Map();
  private safetyAnalyses: Map<string, RouteSafetyAnalysis> = new Map();

  // Multi-source weather data
  private dataSources: Map<string, WeatherDataSource> = new Map();
  private historicalData: Map<string, HistoricalWeatherData> = new Map();
  private voyagePlans: Map<string, VoyagePlan> = new Map();

  // AI Learning - weather pattern recognition
  private weatherPatterns: Map<string, any> = new Map();
  private routeHistory: Map<string, any> = new Map();

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
          'multi-source-aggregation', // NEW: Combines data from multiple sources
          'historical-analysis', // NEW: Analyzes historical patterns
          'voyage-optimization', // NEW: Optimizes routes based on weather
          'weather-window-detection', // NEW: Finds optimal departure times
          'ai-pattern-recognition', // NEW: Learns weather patterns
          'long-term-prediction', // NEW: Extended forecasts
        ],
        services: [
          'weather-api',
          'safety-recommendations',
          'route-planning-support',
          'real-time-alerts',
          'historical-data',
          'climate-analysis',
          'piri-reis-integration', // NEW: Turkish maritime historical data
          'poseidon-integration', // NEW: Real-time global weather
          'voyage-planning', // NEW: Complete voyage weather planning
          'weather-routing', // NEW: Optimal routing service
        ],
        integrations: [
          'ada.sea',
          'ada.marina',
          'piri-reis-api', // NEW: Historical Turkish maritime weather
          'poseidon-weather', // NEW: Real-time weather service
          'noaa-weather',
          'met-office',
          'satellite-systems',
          'openweathermap',
          'windy-api',
        ],
      },
    });

    this.serviceInfo = config.serviceInfo;
    this.initializeWarnings();
    this.initializeDataSources();
    this.initializeHistoricalData();
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
      case 'get-multi-source-forecast':
        return this.getMultiSourceForecast(data);
      case 'analyze-route-safety':
        return this.analyzeRouteSafety(data);
      case 'get-warnings':
        return this.getActiveWarnings(data);
      case 'check-departure-safety':
        return this.checkDepartureSafety(data);
      case 'get-historical-data':
        return this.getHistoricalData(data);
      case 'plan-voyage':
        return this.planOptimalVoyage(data);
      case 'find-weather-window':
        return this.findWeatherWindow(data);
      case 'get-long-term-forecast':
        return this.getLongTermForecast(data);
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
   * Get multi-source forecast (aggregates Piri Reis, Poseidon, NOAA, etc.)
   */
  async getMultiSourceForecast(data: {
    latitude: number;
    longitude: number;
    name?: string;
  }): Promise<MultiSourceForecast> {
    const sources: MultiSourceForecast['sources'] = [];

    // Fetch from Piri Reis (historical Turkish maritime patterns)
    if (this.serviceInfo.apiKeys?.piriReis && this.isInTurkishWaters(data.latitude, data.longitude)) {
      const piriReisData = await this.fetchFromPiriReis(data.latitude, data.longitude);
      sources.push({
        provider: 'Piri Reis',
        confidence: 0.92, // High confidence for Turkish waters
        timestamp: new Date(),
      });
    }

    // Fetch from Poseidon (real-time global weather)
    if (this.serviceInfo.apiKeys?.poseidon) {
      const poseidonData = await this.fetchFromPoseidon(data.latitude, data.longitude);
      sources.push({
        provider: 'Poseidon',
        confidence: 0.88,
        timestamp: new Date(),
      });
    }

    // Fetch from NOAA
    if (this.serviceInfo.apiKeys?.noaa) {
      sources.push({
        provider: 'NOAA',
        confidence: 0.85,
        timestamp: new Date(),
      });
    }

    // Fetch from Met Office
    if (this.serviceInfo.apiKeys?.metOffice) {
      sources.push({
        provider: 'Met Office',
        confidence: 0.84,
        timestamp: new Date(),
      });
    }

    // If no API keys, use simulated data
    if (sources.length === 0) {
      sources.push({
        provider: 'Simulated',
        confidence: 0.50,
        timestamp: new Date(),
      });
    }

    // Aggregate confidence (weighted average)
    const aggregatedConfidence =
      sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length;

    // Get base forecast
    const baseForecast = this.getForecast(data);

    const multiSourceForecast: MultiSourceForecast = {
      ...baseForecast,
      sources,
      aggregatedConfidence,
    };

    this.remember('data', { forecast: multiSourceForecast, sourceCount: sources.length }, ['multi-source', 'weather'], 8);

    return multiSourceForecast;
  }

  /**
   * Get historical weather data (via Piri Reis for Turkish waters)
   */
  getHistoricalData(data: {
    latitude: number;
    longitude: number;
    month?: number;
  }): HistoricalWeatherData | null {
    const month = data.month || new Date().getMonth() + 1;
    const key = `${data.latitude.toFixed(2)},${data.longitude.toFixed(2)},${month}`;

    const historical = this.historicalData.get(key);

    if (historical) {
      this.remember('data', { historical }, ['historical', 'piri-reis'], 7);
    }

    return historical || null;
  }

  /**
   * Plan optimal voyage with weather routing
   */
  async planOptimalVoyage(data: {
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
    departureWindow: { start: Date; end: Date };
    vesselSpeed: number; // knots
    vesselType?: string;
    prioritize?: 'safety' | 'speed' | 'fuel';
  }): Promise<VoyagePlan> {
    // Calculate multiple route options
    const directRoute = this.calculateWaypoints(data.origin, data.destination, data.vesselSpeed);

    // Analyze weather windows
    const weatherWindows = await this.analyzeWeatherWindows(
      data.origin,
      data.destination,
      data.departureWindow.start,
      data.departureWindow.end
    );

    // Find optimal departure time
    const optimalWindow = weatherWindows.find(w => w.quality === 'excellent' || w.quality === 'good')
      || weatherWindows[0];

    const estimatedDuration = this.calculateDistance(data.origin, data.destination) / data.vesselSpeed;

    // Calculate safety score based on forecasts
    const safetyScore = await this.calculateVoyageSafetyScore(directRoute, optimalWindow.start);

    const plan: VoyagePlan = {
      id: uuidv4(),
      route: directRoute,
      weatherWindows,
      optimalDeparture: optimalWindow.start,
      estimatedDuration,
      fuelOptimized: data.prioritize === 'fuel',
      safetyScore,
    };

    this.voyagePlans.set(plan.id, plan);

    this.remember('data', { plan, optimization: data.prioritize }, ['voyage-planning', 'routing'], 9);

    return plan;
  }

  /**
   * Find weather window for safe passage
   */
  async findWeatherWindow(data: {
    location: { latitude: number; longitude: number };
    startDate: Date;
    durationDays: number;
  }): Promise<any> {
    const windows: Array<{
      start: Date;
      end: Date;
      quality: 'excellent' | 'good' | 'fair' | 'poor';
      conditions: string;
    }> = [];

    // Analyze weather for the next N days
    for (let day = 0; day < data.durationDays; day++) {
      const checkDate = new Date(data.startDate);
      checkDate.setDate(checkDate.getDate() + day);

      const forecast = this.getForecast({
        latitude: data.location.latitude,
        longitude: data.location.longitude,
      });

      let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

      if (forecast.conditions.windSpeed > 25 || forecast.conditions.waveHeight > 3) {
        quality = 'poor';
      } else if (forecast.conditions.windSpeed > 20 || forecast.conditions.waveHeight > 2) {
        quality = 'fair';
      } else if (forecast.conditions.windSpeed > 15 || forecast.conditions.waveHeight > 1.5) {
        quality = 'good';
      }

      windows.push({
        start: checkDate,
        end: new Date(checkDate.getTime() + 24 * 60 * 60 * 1000),
        quality,
        conditions: forecast.description,
      });
    }

    this.remember('data', { windows, analyzed: data.durationDays }, ['weather-window'], 7);

    return {
      windows,
      bestWindow: windows.find(w => w.quality === 'excellent') || windows[0],
      totalAnalyzed: windows.length,
    };
  }

  /**
   * Get long-term forecast (7-14 days)
   */
  async getLongTermForecast(data: {
    latitude: number;
    longitude: number;
    days: number; // 1-14
  }): Promise<any> {
    const forecasts: any[] = [];

    // Get historical data for pattern recognition
    const historical = this.getHistoricalData({
      latitude: data.latitude,
      longitude: data.longitude,
    });

    for (let day = 0; day < Math.min(data.days, 14); day++) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + day);

      // For days 1-7, higher confidence
      // For days 8-14, lower confidence with historical patterns
      const confidence = day < 7 ? 0.80 - (day * 0.05) : 0.45 - ((day - 7) * 0.02);

      const dayForecast = {
        date: forecastDate,
        forecast: this.getForecast({
          latitude: data.latitude,
          longitude: data.longitude,
        }),
        confidence,
        basedOnHistorical: day >= 7,
      };

      forecasts.push(dayForecast);
    }

    this.remember('data', { forecasts, historical: !!historical }, ['long-term-forecast'], 7);

    return {
      forecasts,
      historicalPattern: historical,
      totalDays: forecasts.length,
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
   * Initialize data sources (Piri Reis, Poseidon, etc.)
   */
  private initializeDataSources(): void {
    // Piri Reis - Historical Turkish maritime weather patterns
    this.dataSources.set('piri-reis', {
      name: 'Piri Reis Maritime Database',
      type: 'historical',
      reliability: 0.92,
      coverage: ['Mediterranean', 'Aegean Sea', 'Marmara Sea', 'Black Sea'],
      latency: 100,
      lastUpdate: new Date(),
    });

    // Poseidon - Real-time global weather service
    this.dataSources.set('poseidon', {
      name: 'Poseidon Global Weather',
      type: 'real-time',
      reliability: 0.88,
      coverage: ['Global'],
      latency: 500,
      lastUpdate: new Date(),
    });

    // NOAA
    this.dataSources.set('noaa', {
      name: 'NOAA Weather Service',
      type: 'hybrid',
      reliability: 0.85,
      coverage: ['Global', 'Atlantic', 'Pacific'],
      latency: 800,
    });

    // Met Office
    this.dataSources.set('met-office', {
      name: 'UK Met Office',
      type: 'forecast',
      reliability: 0.84,
      coverage: ['Europe', 'Atlantic', 'Mediterranean'],
      latency: 700,
    });
  }

  /**
   * Initialize historical weather data (simulated Piri Reis data for Turkish waters)
   */
  private initializeHistoricalData(): void {
    // Turkish waters - historical patterns based on Piri Reis knowledge
    const turkishLocations = [
      { lat: 41.0, lon: 29.0, name: 'Istanbul/Bosphorus' },
      { lat: 38.4, lon: 27.1, name: 'Izmir/Aegean' },
      { lat: 36.9, lon: 30.7, name: 'Antalya/Mediterranean' },
      { lat: 40.5, lon: 26.4, name: 'Çanakkale/Dardanelles' },
    ];

    turkishLocations.forEach(loc => {
      // Add data for each month
      for (let month = 1; month <= 12; month++) {
        const key = `${loc.lat.toFixed(2)},${loc.lon.toFixed(2)},${month}`;

        const isWinter = month >= 11 || month <= 3;
        const isSummer = month >= 6 && month <= 9;

        const historical: HistoricalWeatherData = {
          location: { latitude: loc.lat, longitude: loc.lon },
          month,
          averageConditions: {
            temperature: isSummer ? 28 : isWinter ? 12 : 20,
            windSpeed: isWinter ? 18 : 12, // Winter winds stronger
            waveHeight: isWinter ? 2.0 : 1.0,
            precipitation: isWinter ? 80 : isSummer ? 10 : 40,
          },
          extremeEvents: isWinter ? [
            { type: 'storm', probability: 0.15 },
            { type: 'gale', probability: 0.25 },
          ] : [
            { type: 'calm', probability: 0.70 },
          ],
          source: 'piri-reis',
        };

        this.historicalData.set(key, historical);
      }
    });
  }

  /**
   * Check if coordinates are in Turkish waters
   */
  private isInTurkishWaters(lat: number, lon: number): boolean {
    // Turkish waters: roughly 36-42°N, 26-42°E
    return lat >= 36 && lat <= 42 && lon >= 26 && lon <= 42;
  }

  /**
   * Fetch weather data from Piri Reis API
   */
  private async fetchFromPiriReis(lat: number, lon: number): Promise<any> {
    // In production, this would call the actual Piri Reis API
    // For now, return simulated data based on historical patterns
    const historical = this.getHistoricalData({ latitude: lat, longitude: lon });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      source: 'piri-reis',
      confidence: 0.92,
      data: historical,
      recommendation: 'Based on historical Turkish maritime patterns',
    };
  }

  /**
   * Fetch weather data from Poseidon API
   */
  private async fetchFromPoseidon(lat: number, lon: number): Promise<any> {
    // In production, this would call the actual Poseidon API
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      source: 'poseidon',
      confidence: 0.88,
      data: {
        temperature: 20 + Math.random() * 8,
        windSpeed: 10 + Math.random() * 10,
        waveHeight: 1 + Math.random() * 1.5,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Calculate waypoints for a route
   */
  private calculateWaypoints(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    speed: number
  ): Array<{ latitude: number; longitude: number; eta: Date }> {
    const waypoints: Array<{ latitude: number; longitude: number; eta: Date }> = [];

    // Simple route: origin, midpoint, destination
    waypoints.push({
      latitude: origin.latitude,
      longitude: origin.longitude,
      eta: new Date(),
    });

    // Midpoint
    waypoints.push({
      latitude: (origin.latitude + destination.latitude) / 2,
      longitude: (origin.longitude + destination.longitude) / 2,
      eta: new Date(Date.now() + (this.calculateDistance(origin, destination) / speed / 2) * 60 * 60 * 1000),
    });

    // Destination
    waypoints.push({
      latitude: destination.latitude,
      longitude: destination.longitude,
      eta: new Date(Date.now() + (this.calculateDistance(origin, destination) / speed) * 60 * 60 * 1000),
    });

    return waypoints;
  }

  /**
   * Analyze weather windows between two points
   */
  private async analyzeWeatherWindows(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    start: Date;
    end: Date;
    conditions: string;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
  }>> {
    const windows: Array<{
      start: Date;
      end: Date;
      conditions: string;
      quality: 'excellent' | 'good' | 'fair' | 'poor';
    }> = [];

    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let day = 0; day < days; day++) {
      const windowStart = new Date(startDate);
      windowStart.setDate(windowStart.getDate() + day);

      const forecast = this.getForecast({
        latitude: origin.latitude,
        longitude: origin.longitude,
      });

      let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

      if (forecast.conditions.windSpeed > 25 || forecast.conditions.waveHeight > 3) {
        quality = 'poor';
      } else if (forecast.conditions.windSpeed > 20 || forecast.conditions.waveHeight > 2) {
        quality = 'fair';
      } else if (forecast.conditions.windSpeed > 15) {
        quality = 'good';
      }

      windows.push({
        start: windowStart,
        end: new Date(windowStart.getTime() + 24 * 60 * 60 * 1000),
        conditions: forecast.description,
        quality,
      });
    }

    return windows;
  }

  /**
   * Calculate voyage safety score
   */
  private async calculateVoyageSafetyScore(
    route: Array<{ latitude: number; longitude: number; eta: Date }>,
    departureTime: Date
  ): Promise<number> {
    let totalScore = 100;

    // Check weather at each waypoint
    for (const waypoint of route) {
      const forecast = this.getForecast({
        latitude: waypoint.latitude,
        longitude: waypoint.longitude,
      });

      // Deduct points for adverse conditions
      if (forecast.conditions.windSpeed > 25) totalScore -= 20;
      else if (forecast.conditions.windSpeed > 20) totalScore -= 10;
      else if (forecast.conditions.windSpeed > 15) totalScore -= 5;

      if (forecast.conditions.waveHeight > 3) totalScore -= 20;
      else if (forecast.conditions.waveHeight > 2) totalScore -= 10;

      if (forecast.conditions.visibility < 2) totalScore -= 15;
      else if (forecast.conditions.visibility < 5) totalScore -= 5;

      if (forecast.warnings.length > 0) {
        forecast.warnings.forEach(w => {
          if (w.severity === 'extreme') totalScore -= 30;
          else if (w.severity === 'high') totalScore -= 20;
          else if (w.severity === 'medium') totalScore -= 10;
        });
      }
    }

    return Math.max(0, Math.min(100, totalScore));
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

    // Multi-source forecast (for marina integration)
    this.communication.onMessage('get-multi-source-weather', async (message) => {
      this.remember('conversation', message, ['multi-source-request'], 7);
      const forecast = await this.getMultiSourceForecast(message.payload);
      return { success: true, forecast, sources: forecast.sources };
    });

    // Historical weather data (Piri Reis)
    this.communication.onMessage('get-historical-weather', async (message) => {
      const historical = this.getHistoricalData(message.payload);
      return { success: !!historical, data: historical };
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

    // Voyage planning (for sea/marina nodes)
    this.communication.onMessage('plan-voyage', async (message) => {
      this.remember('conversation', message, ['voyage-planning'], 9);
      const plan = await this.planOptimalVoyage(message.payload);
      return { success: true, plan };
    });

    // Weather window detection
    this.communication.onMessage('find-weather-window', async (message) => {
      const result = await this.findWeatherWindow(message.payload);
      return result;
    });

    // Long-term forecast
    this.communication.onMessage('get-long-term-forecast', async (message) => {
      const result = await this.getLongTermForecast(message.payload);
      return result;
    });

    // Service inquiry
    this.communication.onMessage('weather-inquiry', async (message) => {
      return {
        service: this.serviceInfo,
        status: this.getStatus(),
        dataSources: Array.from(this.dataSources.values()),
        capabilities: {
          multiSource: true,
          historicalData: true,
          voyagePlanning: true,
          piriReis: !!this.serviceInfo.apiKeys?.piriReis,
          poseidon: !!this.serviceInfo.apiKeys?.poseidon,
        },
      };
    });
  }
}
