/**
 * BerthManagement - Manage marina berths and availability
 */

import { Berth } from '../../../core/types.js';

export class BerthManagement {
  private berths: Map<string, Berth> = new Map();

  /**
   * Add berth to marina
   */
  addBerth(berth: Berth): void {
    this.berths.set(berth.id, berth);
  }

  /**
   * Remove berth
   */
  removeBerth(berthId: string): boolean {
    return this.berths.delete(berthId);
  }

  /**
   * Get berth by ID
   */
  getBerth(berthId: string): Berth | undefined {
    return this.berths.get(berthId);
  }

  /**
   * Get all berths
   */
  getAllBerths(): Berth[] {
    return Array.from(this.berths.values());
  }

  /**
   * Find available berths
   */
  findAvailableBerths(requirements: {
    minLength: number;
    minWidth?: number;
    minDepth?: number;
    amenities?: string[];
  }): Berth[] {
    return this.getAllBerths().filter(berth => {
      if (berth.status !== 'available') return false;
      if (berth.length < requirements.minLength) return false;
      if (requirements.minWidth && berth.width < requirements.minWidth) return false;
      if (requirements.minDepth && berth.depth < requirements.minDepth) return false;

      if (requirements.amenities) {
        const hasAllAmenities = requirements.amenities.every(a =>
          berth.amenities.includes(a)
        );
        if (!hasAllAmenities) return false;
      }

      return true;
    });
  }

  /**
   * Update berth status
   */
  updateBerthStatus(
    berthId: string,
    status: Berth['status']
  ): boolean {
    const berth = this.berths.get(berthId);
    if (berth) {
      berth.status = status;
      return true;
    }
    return false;
  }

  /**
   * Get berths by status
   */
  getBerthsByStatus(status: Berth['status']): Berth[] {
    return this.getAllBerths().filter(b => b.status === status);
  }

  /**
   * Calculate occupancy rate
   */
  getOccupancyRate(): {
    total: number;
    occupied: number;
    available: number;
    reserved: number;
    rate: number;
  } {
    const berths = this.getAllBerths();
    const total = berths.length;
    const occupied = berths.filter(b => b.status === 'occupied').length;
    const available = berths.filter(b => b.status === 'available').length;
    const reserved = berths.filter(b => b.status === 'reserved').length;

    return {
      total,
      occupied,
      available,
      reserved,
      rate: total > 0 ? (occupied / total) * 100 : 0,
    };
  }

  /**
   * Get revenue statistics
   */
  getRevenueStats(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): {
    potential: number;
    actual: number;
    currency: string;
  } {
    const occupiedBerths = this.getBerthsByStatus('occupied');
    let actual = 0;
    let potential = 0;

    const priceKey = period;

    this.getAllBerths().forEach(berth => {
      potential += berth.price[priceKey];
      if (berth.status === 'occupied') {
        actual += berth.price[priceKey];
      }
    });

    return {
      potential,
      actual,
      currency: occupiedBerths.length > 0 ? occupiedBerths[0].price.currency : 'USD',
    };
  }

  /**
   * Find best berth for vessel
   */
  findBestBerth(vesselLength: number, vesselBeam: number, vesselDraft: number): Berth | null {
    const suitable = this.findAvailableBerths({
      minLength: vesselLength,
      minWidth: vesselBeam,
      minDepth: vesselDraft,
    });

    if (suitable.length === 0) return null;

    // Sort by size (prefer smallest suitable berth)
    suitable.sort((a, b) => {
      const aSize = a.length * a.width;
      const bSize = b.length * b.width;
      return aSize - bSize;
    });

    return suitable[0];
  }
}
