/**
 * ReservationService - Manage marina reservations
 */

import { v4 as uuidv4 } from 'uuid';
import { MarinaReservation, MarinaService } from '../../../core/types.js';

export class ReservationService {
  private reservations: Map<string, MarinaReservation> = new Map();
  private services: Map<string, MarinaService> = new Map();

  /**
   * Create new reservation
   */
  createReservation(
    berthId: string,
    vesselId: string,
    vesselName: string,
    checkIn: Date,
    checkOut: Date,
    contactNode?: string
  ): MarinaReservation {
    const reservation: MarinaReservation = {
      id: uuidv4(),
      berthId,
      vesselId,
      vesselName,
      contactNode,
      checkIn,
      checkOut,
      services: [],
      status: 'pending',
      totalCost: 0,
      currency: 'USD',
    };

    this.reservations.set(reservation.id, reservation);
    return reservation;
  }

  /**
   * Confirm reservation
   */
  confirmReservation(reservationId: string): boolean {
    const reservation = this.reservations.get(reservationId);
    if (reservation && reservation.status === 'pending') {
      reservation.status = 'confirmed';
      return true;
    }
    return false;
  }

  /**
   * Activate reservation (check-in)
   */
  activateReservation(reservationId: string): boolean {
    const reservation = this.reservations.get(reservationId);
    if (reservation && reservation.status === 'confirmed') {
      reservation.status = 'active';
      return true;
    }
    return false;
  }

  /**
   * Complete reservation (check-out)
   */
  completeReservation(reservationId: string): boolean {
    const reservation = this.reservations.get(reservationId);
    if (reservation && reservation.status === 'active') {
      reservation.status = 'completed';
      return true;
    }
    return false;
  }

  /**
   * Cancel reservation
   */
  cancelReservation(reservationId: string): boolean {
    const reservation = this.reservations.get(reservationId);
    if (reservation && ['pending', 'confirmed'].includes(reservation.status)) {
      reservation.status = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * Add service to reservation
   */
  addService(reservationId: string, serviceId: string): boolean {
    const reservation = this.reservations.get(reservationId);
    const service = this.services.get(serviceId);

    if (reservation && service && service.available) {
      reservation.services.push(service);
      reservation.totalCost += service.price;
      return true;
    }
    return false;
  }

  /**
   * Register available service
   */
  registerService(service: MarinaService): void {
    this.services.set(service.id, service);
  }

  /**
   * Get available services
   */
  getAvailableServices(): MarinaService[] {
    return Array.from(this.services.values()).filter(s => s.available);
  }

  /**
   * Get reservation
   */
  getReservation(reservationId: string): MarinaReservation | undefined {
    return this.reservations.get(reservationId);
  }

  /**
   * Get reservations by status
   */
  getReservationsByStatus(status: MarinaReservation['status']): MarinaReservation[] {
    return Array.from(this.reservations.values()).filter(r => r.status === status);
  }

  /**
   * Get active reservations
   */
  getActiveReservations(): MarinaReservation[] {
    return this.getReservationsByStatus('active');
  }

  /**
   * Get reservations for vessel
   */
  getVesselReservations(vesselId: string): MarinaReservation[] {
    return Array.from(this.reservations.values()).filter(r => r.vesselId === vesselId);
  }

  /**
   * Check for conflicts
   */
  hasConflict(berthId: string, checkIn: Date, checkOut: Date): boolean {
    const berthReservations = Array.from(this.reservations.values()).filter(
      r => r.berthId === berthId && ['confirmed', 'active'].includes(r.status)
    );

    return berthReservations.some(r => {
      return (checkIn >= r.checkIn && checkIn < r.checkOut) ||
             (checkOut > r.checkIn && checkOut <= r.checkOut) ||
             (checkIn <= r.checkIn && checkOut >= r.checkOut);
    });
  }

  /**
   * Calculate reservation cost
   */
  calculateCost(
    dailyRate: number,
    checkIn: Date,
    checkOut: Date,
    services: MarinaService[]
  ): number {
    const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const berthCost = dailyRate * days;
    const serviceCost = services.reduce((sum, s) => sum + s.price, 0);

    return berthCost + serviceCost;
  }

  /**
   * Generate reservation report
   */
  generateReport(): {
    total: number;
    byStatus: Record<string, number>;
    totalRevenue: number;
    averageStay: number;
  } {
    const reservations = Array.from(this.reservations.values());
    const byStatus: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
    };

    let totalRevenue = 0;
    let totalDays = 0;

    reservations.forEach(r => {
      byStatus[r.status]++;
      if (r.status === 'completed') {
        totalRevenue += r.totalCost;
      }
      const days = (r.checkOut.getTime() - r.checkIn.getTime()) / (1000 * 60 * 60 * 24);
      totalDays += days;
    });

    return {
      total: reservations.length,
      byStatus,
      totalRevenue,
      averageStay: reservations.length > 0 ? totalDays / reservations.length : 0,
    };
  }
}
