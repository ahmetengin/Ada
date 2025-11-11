/**
 * PassengerService - Manage yacht passengers and their requirements
 */

import { PassengerInfo } from '../../../core/types.js';

export interface PassengerPreferences {
  passengerId: string;
  dietaryRestrictions: string[];
  allergies: string[];
  cabinPreferences: string[];
  activities: string[];
  specialRequests: string[];
}

export interface PassengerManifest {
  voyageId: string;
  passengers: PassengerInfo[];
  embarkationDate: Date;
  disembarkationDate: Date;
  totalPassengers: number;
}

export class PassengerService {
  private passengers: Map<string, PassengerInfo> = new Map();
  private preferences: Map<string, PassengerPreferences> = new Map();
  private manifests: Map<string, PassengerManifest> = new Map();

  /**
   * Add passenger
   */
  addPassenger(passenger: PassengerInfo): void {
    this.passengers.set(passenger.id, passenger);
  }

  /**
   * Remove passenger
   */
  removePassenger(passengerId: string): boolean {
    this.preferences.delete(passengerId);
    return this.passengers.delete(passengerId);
  }

  /**
   * Get passenger
   */
  getPassenger(passengerId: string): PassengerInfo | undefined {
    return this.passengers.get(passengerId);
  }

  /**
   * Get all passengers
   */
  getAllPassengers(): PassengerInfo[] {
    return Array.from(this.passengers.values());
  }

  /**
   * Set passenger preferences
   */
  setPreferences(preferences: PassengerPreferences): void {
    this.preferences.set(preferences.passengerId, preferences);
  }

  /**
   * Get passenger preferences
   */
  getPreferences(passengerId: string): PassengerPreferences | undefined {
    return this.preferences.get(passengerId);
  }

  /**
   * Create passenger manifest
   */
  createManifest(
    voyageId: string,
    passengerIds: string[],
    embarkationDate: Date,
    disembarkationDate: Date
  ): PassengerManifest {
    const passengers = passengerIds
      .map(id => this.passengers.get(id))
      .filter((p): p is PassengerInfo => p !== undefined);

    const manifest: PassengerManifest = {
      voyageId,
      passengers,
      embarkationDate,
      disembarkationDate,
      totalPassengers: passengers.length,
    };

    this.manifests.set(voyageId, manifest);
    return manifest;
  }

  /**
   * Check passenger document validity
   */
  checkDocumentValidity(passengerId: string, destinationCountry?: string): {
    valid: boolean;
    issues: string[];
    warnings: string[];
  } {
    const passenger = this.passengers.get(passengerId);
    const issues: string[] = [];
    const warnings: string[] = [];

    if (!passenger) {
      return { valid: false, issues: ['Passenger not found'], warnings: [] };
    }

    const now = new Date();
    const sixMonthsFromNow = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    // Check passport (most countries require 6 months validity)
    if (!passenger.passport) {
      issues.push('Passport information missing');
    }

    // Check visa if destination specified
    if (destinationCountry && passenger.visa) {
      if (passenger.visa.country !== destinationCountry) {
        issues.push(`Visa for ${destinationCountry} required`);
      } else if (passenger.visa.validUntil < now) {
        issues.push('Visa expired');
      } else if (passenger.visa.validUntil < sixMonthsFromNow) {
        warnings.push('Visa expiring within 6 months');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * Get passengers with dietary restrictions
   */
  getPassengersWithDietaryRestrictions(): Array<{
    passenger: PassengerInfo;
    restrictions: string[];
  }> {
    const result: Array<{ passenger: PassengerInfo; restrictions: string[] }> = [];

    this.preferences.forEach((prefs, passengerId) => {
      if (prefs.dietaryRestrictions.length > 0 || prefs.allergies.length > 0) {
        const passenger = this.passengers.get(passengerId);
        if (passenger) {
          result.push({
            passenger,
            restrictions: [...prefs.dietaryRestrictions, ...prefs.allergies],
          });
        }
      }
    });

    return result;
  }

  /**
   * Get passengers by nationality
   */
  getPassengersByNationality(nationality: string): PassengerInfo[] {
    return this.getAllPassengers().filter(p => p.nationality === nationality);
  }

  /**
   * Generate passenger report
   */
  generatePassengerReport(): {
    totalPassengers: number;
    byNationality: Record<string, number>;
    withDietaryRestrictions: number;
    withSpecialRequirements: number;
    documentIssues: number;
  } {
    const byNationality: Record<string, number> = {};
    let withDietaryRestrictions = 0;
    let withSpecialRequirements = 0;
    let documentIssues = 0;

    this.passengers.forEach(passenger => {
      byNationality[passenger.nationality] = (byNationality[passenger.nationality] || 0) + 1;

      const prefs = this.preferences.get(passenger.id);
      if (prefs) {
        if (prefs.dietaryRestrictions.length > 0 || prefs.allergies.length > 0) {
          withDietaryRestrictions++;
        }
        if (prefs.specialRequests.length > 0) {
          withSpecialRequirements++;
        }
      }

      const docCheck = this.checkDocumentValidity(passenger.id);
      if (!docCheck.valid) documentIssues++;
    });

    return {
      totalPassengers: this.passengers.size,
      byNationality,
      withDietaryRestrictions,
      withSpecialRequirements,
      documentIssues,
    };
  }
}
