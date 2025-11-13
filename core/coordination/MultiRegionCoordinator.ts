/**
 * Multi-Region Marina Coordination
 * From Ada-Maritime-Ai's 13-marina, 7,000+ berth vision
 *
 * Regions: Turkey, Greece, Croatia, Italy
 * Capabilities:
 * - Cross-marina berth availability
 * - Regional pricing strategies
 * - Fleet-wide resource sharing
 * - Multi-marina journey planning
 */

import { createLogger, Logger } from '../utils/Logger.js';
import EventEmitter from 'eventemitter3';

export type Region = 'turkey' | 'greece' | 'croatia' | 'italy';

export interface Marina {
  id: string;
  name: string;
  region: Region;
  location: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  };
  berths: {
    total: number;
    available: number;
    minLength: number;
    maxLength: number;
  };
  facilities: string[];
  vhfChannel?: number;
  status: 'active' | 'maintenance' | 'closed';
}

export interface CrossMarinaBooking {
  id: string;
  customerId: string;
  marinas: string[]; // Marina IDs in journey order
  startDate: Date;
  endDate: Date;
  vesselLength: number;
  totalPrice: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

export interface RegionalMetrics {
  region: Region;
  totalMarinas: number;
  totalBerths: number;
  occupancyRate: number;
  averagePrice: number;
  topMarinas: string[];
}

/**
 * Multi-Region Marina Coordinator
 * Manages operations across multiple marinas in different regions
 */
export class MultiRegionCoordinator extends EventEmitter {
  private logger: Logger;
  private marinas: Map<string, Marina> = new Map();
  private crossMarinaBookings: Map<string, CrossMarinaBooking> = new Map();

  constructor() {
    super();
    this.logger = createLogger('Coordination:MultiRegion');
    this.initializeMarinas();
  }

  /**
   * Initialize marina network (13 marinas from Ada-Maritime-Ai vision)
   */
  private initializeMarinas(): void {
    const marinasData: Marina[] = [
      // Turkey (3 marinas, ~1,200 berths)
      {
        id: 'wim-001',
        name: 'West Istanbul Marina',
        region: 'turkey',
        location: {
          latitude: 41.0082,
          longitude: 28.9784,
          city: 'Istanbul',
          country: 'Turkey',
        },
        berths: { total: 600, available: 120, minLength: 10, maxLength: 80 },
        facilities: ['restaurant', 'spa', 'beach_club', 'haul_out', 'concert_venue'],
        vhfChannel: 72,
        status: 'active',
      },
      {
        id: 'kalamis-001',
        name: 'Setur Kalamış Marina',
        region: 'turkey',
        location: {
          latitude: 40.9827,
          longitude: 29.0318,
          city: 'Istanbul',
          country: 'Turkey',
        },
        berths: { total: 400, available: 80, minLength: 8, maxLength: 60 },
        facilities: ['restaurant', 'market', 'fuel', 'repair'],
        vhfChannel: 72,
        status: 'active',
      },
      {
        id: 'dmarin-bodrum',
        name: 'D-Marin Turgutreis',
        region: 'turkey',
        location: {
          latitude: 37.0,
          longitude: 27.25,
          city: 'Bodrum',
          country: 'Turkey',
        },
        berths: { total: 200, available: 40, minLength: 10, maxLength: 70 },
        facilities: ['beach_club', 'restaurant', 'spa'],
        vhfChannel: 72,
        status: 'active',
      },

      // Greece (5 marinas, ~3,000 berths)
      {
        id: 'athens-001',
        name: 'Alimos Marina',
        region: 'greece',
        location: {
          latitude: 37.9138,
          longitude: 23.7253,
          city: 'Athens',
          country: 'Greece',
        },
        berths: { total: 1000, available: 200, minLength: 8, maxLength: 70 },
        facilities: ['restaurant', 'fuel', 'repair', 'chandlery'],
        vhfChannel: 9,
        status: 'active',
      },
      {
        id: 'corfu-001',
        name: 'Gouvia Marina',
        region: 'greece',
        location: {
          latitude: 39.6375,
          longitude: 19.8442,
          city: 'Corfu',
          country: 'Greece',
        },
        berths: { total: 600, available: 120, minLength: 10, maxLength: 80 },
        facilities: ['restaurant', 'market', 'fuel'],
        vhfChannel: 9,
        status: 'active',
      },
      {
        id: 'rhodes-001',
        name: 'Mandraki Marina',
        region: 'greece',
        location: {
          latitude: 36.4511,
          longitude: 28.2256,
          city: 'Rhodes',
          country: 'Greece',
        },
        berths: { total: 500, available: 100, minLength: 10, maxLength: 60 },
        facilities: ['restaurant', 'fuel', 'chandlery'],
        vhfChannel: 9,
        status: 'active',
      },
      {
        id: 'santorini-001',
        name: 'Vlychada Marina',
        region: 'greece',
        location: {
          latitude: 36.3537,
          longitude: 25.4317,
          city: 'Santorini',
          country: 'Greece',
        },
        berths: { total: 400, available: 80, minLength: 8, maxLength: 50 },
        facilities: ['restaurant', 'market'],
        vhfChannel: 9,
        status: 'active',
      },
      {
        id: 'mykonos-001',
        name: 'New Port Marina',
        region: 'greece',
        location: {
          latitude: 37.4467,
          longitude: 25.3267,
          city: 'Mykonos',
          country: 'Greece',
        },
        berths: { total: 500, available: 100, minLength: 10, maxLength: 70 },
        facilities: ['restaurant', 'beach_club', 'fuel'],
        vhfChannel: 9,
        status: 'active',
      },

      // Croatia (3 marinas, ~1,500 berths)
      {
        id: 'split-001',
        name: 'ACI Marina Split',
        region: 'croatia',
        location: {
          latitude: 43.5081,
          longitude: 16.4402,
          city: 'Split',
          country: 'Croatia',
        },
        berths: { total: 600, available: 120, minLength: 10, maxLength: 60 },
        facilities: ['restaurant', 'market', 'fuel', 'repair'],
        vhfChannel: 17,
        status: 'active',
      },
      {
        id: 'dubrovnik-001',
        name: 'ACI Marina Dubrovnik',
        region: 'croatia',
        location: {
          latitude: 42.6507,
          longitude: 18.0944,
          city: 'Dubrovnik',
          country: 'Croatia',
        },
        berths: { total: 450, available: 90, minLength: 10, maxLength: 50 },
        facilities: ['restaurant', 'fuel', 'chandlery'],
        vhfChannel: 17,
        status: 'active',
      },
      {
        id: 'zadar-001',
        name: 'Marina Zadar',
        region: 'croatia',
        location: {
          latitude: 44.1194,
          longitude: 15.2314,
          city: 'Zadar',
          country: 'Croatia',
        },
        berths: { total: 450, available: 90, minLength: 8, maxLength: 55 },
        facilities: ['restaurant', 'market', 'fuel'],
        vhfChannel: 17,
        status: 'active',
      },

      // Italy (2 marinas, ~1,300 berths)
      {
        id: 'venice-001',
        name: 'Marina di Venezia',
        region: 'italy',
        location: {
          latitude: 45.4408,
          longitude: 12.3155,
          city: 'Venice',
          country: 'Italy',
        },
        berths: { total: 800, available: 160, minLength: 10, maxLength: 70 },
        facilities: ['restaurant', 'spa', 'market', 'fuel', 'repair'],
        vhfChannel: 9,
        status: 'active',
      },
      {
        id: 'rome-001',
        name: 'Marina di Roma',
        region: 'italy',
        location: {
          latitude: 41.7155,
          longitude: 12.2594,
          city: 'Rome',
          country: 'Italy',
        },
        berths: { total: 500, available: 100, minLength: 10, maxLength: 60 },
        facilities: ['restaurant', 'beach_club', 'fuel'],
        vhfChannel: 9,
        status: 'active',
      },
    ];

    marinasData.forEach((marina) => {
      this.marinas.set(marina.id, marina);
    });

    this.logger.info('Multi-region marina network initialized', {
      total: this.marinas.size,
      regions: ['Turkey', 'Greece', 'Croatia', 'Italy'],
    });
  }

  /**
   * Search for available berths across all regions
   */
  searchBerths(
    vesselLength: number,
    startDate: Date,
    endDate: Date,
    preferredRegions?: Region[]
  ): Marina[] {
    const available: Marina[] = [];

    for (const marina of this.marinas.values()) {
      // Filter by region if specified
      if (preferredRegions && !preferredRegions.includes(marina.region)) {
        continue;
      }

      // Check vessel length compatibility
      if (vesselLength < marina.berths.minLength || vesselLength > marina.berths.maxLength) {
        continue;
      }

      // Check availability
      if (marina.berths.available > 0 && marina.status === 'active') {
        available.push(marina);
      }
    }

    this.logger.info('Berth search completed', {
      vesselLength,
      found: available.length,
      regions: preferredRegions,
    });

    return available.sort((a, b) => b.berths.available - a.berths.available);
  }

  /**
   * Plan multi-marina journey
   */
  planJourney(
    vesselLength: number,
    route: Region[],
    daysPerRegion: number[]
  ): { marinas: Marina[]; totalDistance: number; estimatedCost: number } {
    const selectedMarinas: Marina[] = [];

    route.forEach((region, index) => {
      const regionMarinas = this.getRegionalMarinas(region);
      if (regionMarinas.length > 0) {
        // Select best marina in region (by availability)
        const bestMarina = regionMarinas.sort((a, b) => b.berths.available - a.berths.available)[0];
        selectedMarinas.push(bestMarina);
      }
    });

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 0; i < selectedMarinas.length - 1; i++) {
      const dist = this.calculateDistance(
        selectedMarinas[i].location,
        selectedMarinas[i + 1].location
      );
      totalDistance += dist;
    }

    // Estimate cost (rough calculation)
    const estimatedCost = selectedMarinas.reduce((sum, marina, index) => {
      const days = daysPerRegion[index] || 1;
      const dailyRate = this.getRegionalBasePrice(marina.region);
      return sum + dailyRate * vesselLength * days;
    }, 0);

    return {
      marinas: selectedMarinas,
      totalDistance: Math.round(totalDistance),
      estimatedCost: Math.round(estimatedCost),
    };
  }

  /**
   * Get marinas in specific region
   */
  getRegionalMarinas(region: Region): Marina[] {
    return Array.from(this.marinas.values()).filter((m) => m.region === region && m.status === 'active');
  }

  /**
   * Get regional metrics
   */
  getRegionalMetrics(region: Region): RegionalMetrics {
    const regionalMarinas = this.getRegionalMarinas(region);

    const totalBerths = regionalMarinas.reduce((sum, m) => sum + m.berths.total, 0);
    const availableBerths = regionalMarinas.reduce((sum, m) => sum + m.berths.available, 0);
    const occupancyRate = totalBerths > 0 ? ((totalBerths - availableBerths) / totalBerths) * 100 : 0;

    return {
      region,
      totalMarinas: regionalMarinas.length,
      totalBerths,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      averagePrice: this.getRegionalBasePrice(region),
      topMarinas: regionalMarinas
        .sort((a, b) => b.berths.total - a.berths.total)
        .slice(0, 3)
        .map((m) => m.name),
    };
  }

  /**
   * Get all regional metrics
   */
  getAllRegionalMetrics(): RegionalMetrics[] {
    return (['turkey', 'greece', 'croatia', 'italy'] as Region[]).map((region) =>
      this.getRegionalMetrics(region)
    );
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const dLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.latitude * Math.PI) / 180) *
        Math.cos((point2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get regional base price per meter per day
   */
  private getRegionalBasePrice(region: Region): number {
    const prices: Record<Region, number> = {
      turkey: 5, // EUR equivalent
      greece: 8,
      croatia: 7,
      italy: 10,
    };
    return prices[region];
  }

  /**
   * Get total network capacity
   */
  getTotalCapacity(): {
    totalMarinas: number;
    totalBerths: number;
    availableBerths: number;
    regions: number;
  } {
    const totalBerths = Array.from(this.marinas.values()).reduce((sum, m) => sum + m.berths.total, 0);
    const availableBerths = Array.from(this.marinas.values()).reduce(
      (sum, m) => sum + m.berths.available,
      0
    );

    return {
      totalMarinas: this.marinas.size,
      totalBerths,
      availableBerths,
      regions: 4, // Turkey, Greece, Croatia, Italy
    };
  }
}

// Singleton instance
export const multiRegionCoordinator = new MultiRegionCoordinator();
