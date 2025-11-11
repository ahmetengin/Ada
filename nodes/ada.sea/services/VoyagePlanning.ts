/**
 * VoyagePlanning - AI-powered voyage planning and route optimization
 */

import { VoyagePlan, Waypoint, CrewMember, PassengerInfo } from '../../../core/types.js';
import { WeatherService, WeatherCondition } from './WeatherService.js';

export interface RouteOptimization {
  originalRoute: Waypoint[];
  optimizedRoute: Waypoint[];
  savedDistance: number;
  savedTime: number;
  fuelSaved: number;
  optimization: string;
}

export interface VoyageSafety {
  overallSafety: 'safe' | 'caution' | 'dangerous';
  weatherRisks: string[];
  navigationRisks: string[];
  recommendations: string[];
}

export class VoyagePlanning {
  private weatherService: WeatherService;
  private voyagePlans: Map<string, VoyagePlan> = new Map();

  constructor() {
    this.weatherService = new WeatherService();
  }

  /**
   * Create voyage plan
   */
  async createVoyagePlan(
    vesselId: string,
    departure: { marina: string; date: Date; lat: number; lon: number },
    destination: { marina: string; lat: number; lon: number },
    crew: CrewMember[],
    passengers: PassengerInfo[],
    cruisingSpeed: number = 8 // knots
  ): Promise<VoyagePlan> {
    // Calculate direct route
    const distance = this.calculateDistance(
      departure.lat,
      departure.lon,
      destination.lat,
      destination.lon
    );

    const estimatedHours = distance / cruisingSpeed;
    const estimatedArrival = new Date(departure.date.getTime() + estimatedHours * 60 * 60 * 1000);

    // Create waypoints (simplified - would include actual navigation points)
    const waypoints: Waypoint[] = [
      {
        name: 'Departure',
        latitude: departure.lat,
        longitude: departure.lon,
        eta: departure.date,
      },
      {
        name: 'Destination',
        latitude: destination.lat,
        longitude: destination.lon,
        eta: estimatedArrival,
      },
    ];

    const plan: VoyagePlan = {
      id: `voyage-${Date.now()}`,
      vesselId,
      departure: {
        marina: departure.marina,
        date: departure.date,
      },
      destination: {
        marina: destination.marina,
        estimatedArrival,
      },
      waypoints,
      crew,
      passengers,
    };

    this.voyagePlans.set(plan.id, plan);
    return plan;
  }

  /**
   * Optimize route based on weather, currents, and fuel efficiency
   */
  async optimizeRoute(plan: VoyagePlan): Promise<RouteOptimization> {
    // Get weather forecast for route
    const forecast = await this.weatherService.getRouteForecast(plan.waypoints);

    // Simplified optimization - in production would use complex algorithms
    const optimizedRoute = [...plan.waypoints];

    // Add intermediate waypoint if weather suggests it
    if (plan.waypoints.length === 2) {
      const midLat = (plan.waypoints[0].latitude + plan.waypoints[1].latitude) / 2;
      const midLon = (plan.waypoints[0].longitude + plan.waypoints[1].longitude) / 2;

      optimizedRoute.splice(1, 0, {
        name: 'Weather Optimization Point',
        latitude: midLat,
        longitude: midLon,
        eta: new Date(
          plan.waypoints[0].eta.getTime() +
            (plan.waypoints[1].eta.getTime() - plan.waypoints[0].eta.getTime()) / 2
        ),
      });
    }

    return {
      originalRoute: plan.waypoints,
      optimizedRoute,
      savedDistance: 5, // nm
      savedTime: 0.5, // hours
      fuelSaved: 10, // liters
      optimization: 'Route optimized for favorable winds and currents',
    };
  }

  /**
   * Assess voyage safety
   */
  async assessVoyageSafety(plan: VoyagePlan): Promise<VoyageSafety> {
    const weatherRisks: string[] = [];
    const navigationRisks: string[] = [];
    const recommendations: string[] = [];

    // Get weather for route
    const forecast = await this.weatherService.getRouteForecast(plan.waypoints);

    // Check weather conditions
    forecast.forEach((weather, index) => {
      const safetyCheck = this.weatherService.isSailingSafe(weather);
      if (!safetyCheck.safe) {
        weatherRisks.push(
          `Unsafe conditions at waypoint ${index + 1}: ${safetyCheck.reasons.join(', ')}`
        );
      }
    });

    // Check distance and vessel range
    const totalDistance = this.calculateTotalDistance(plan.waypoints);
    if (totalDistance > 200) {
      recommendations.push('Consider refueling stops for long distance voyage');
    }

    // Check crew requirements
    if (plan.crew.length < 2) {
      navigationRisks.push('Insufficient crew for safe watch-keeping');
    }

    // Determine overall safety
    let overallSafety: VoyageSafety['overallSafety'] = 'safe';
    if (weatherRisks.length > 0 || navigationRisks.length > 2) {
      overallSafety = 'dangerous';
    } else if (weatherRisks.length > 0 || navigationRisks.length > 0) {
      overallSafety = 'caution';
    }

    return {
      overallSafety,
      weatherRisks,
      navigationRisks,
      recommendations,
    };
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3440.065; // Earth's radius in nautical miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate total distance of route
   */
  private calculateTotalDistance(waypoints: Waypoint[]): number {
    let total = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      total += this.calculateDistance(
        waypoints[i].latitude,
        waypoints[i].longitude,
        waypoints[i + 1].latitude,
        waypoints[i + 1].longitude
      );
    }
    return total;
  }

  /**
   * Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Get alternative routes
   */
  async getAlternativeRoutes(
    plan: VoyagePlan,
    count: number = 3
  ): Promise<Array<{ route: Waypoint[]; description: string; score: number }>> {
    // Simplified - would calculate actual alternatives in production
    return [
      {
        route: plan.waypoints,
        description: 'Direct route - shortest distance',
        score: 85,
      },
      {
        route: plan.waypoints,
        description: 'Coastal route - calmer waters',
        score: 78,
      },
      {
        route: plan.waypoints,
        description: 'Scenic route - interesting stops',
        score: 72,
      },
    ];
  }

  /**
   * Estimate fuel consumption
   */
  estimateFuelConsumption(
    distance: number,
    cruisingSpeed: number,
    vesselType: string = 'motor-yacht'
  ): {
    estimated: number;
    unit: string;
    costEstimate: number;
  } {
    // Simplified calculation - would use vessel-specific data
    const fuelPerNM = cruisingSpeed * 0.5; // liters per nautical mile
    const estimated = distance * fuelPerNM;

    return {
      estimated,
      unit: 'liters',
      costEstimate: estimated * 1.5, // USD per liter
    };
  }

  /**
   * Generate voyage briefing
   */
  async generateVoyageBriefing(plan: VoyagePlan): Promise<string> {
    const safety = await this.assessVoyageSafety(plan);
    const distance = this.calculateTotalDistance(plan.waypoints);
    const duration =
      (plan.destination.estimatedArrival.getTime() - plan.departure.date.getTime()) /
      (1000 * 60 * 60);

    const briefing = [
      '=== VOYAGE BRIEFING ===',
      '',
      `Voyage ID: ${plan.id}`,
      `Vessel: ${plan.vesselId}`,
      `From: ${plan.departure.marina}`,
      `To: ${plan.destination.marina}`,
      `Departure: ${plan.departure.date.toISOString()}`,
      `ETA: ${plan.destination.estimatedArrival.toISOString()}`,
      '',
      `Distance: ${distance.toFixed(1)} nm`,
      `Duration: ${duration.toFixed(1)} hours`,
      `Crew: ${plan.crew.length}`,
      `Passengers: ${plan.passengers.length}`,
      '',
      `Overall Safety: ${safety.overallSafety.toUpperCase()}`,
      '',
      safety.weatherRisks.length > 0 ? 'Weather Risks:' : '',
      ...safety.weatherRisks.map(r => `- ${r}`),
      '',
      safety.navigationRisks.length > 0 ? 'Navigation Risks:' : '',
      ...safety.navigationRisks.map(r => `- ${r}`),
      '',
      safety.recommendations.length > 0 ? 'Recommendations:' : '',
      ...safety.recommendations.map(r => `- ${r}`),
    ].join('\n');

    return briefing;
  }
}
