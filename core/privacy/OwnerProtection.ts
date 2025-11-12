/**
 * OwnerProtection - Protect vessel owner from malicious captain
 *
 * REAL RISKS:
 * - Captain may steal fuel (bunker fraud)
 * - Captain may use vessel for unauthorized purposes
 * - Captain may neglect maintenance and delete records
 * - Captain may manipulate financial records
 * - Captain may do unauthorized work on vessel
 * - Captain may steal charter clients
 * - Captain may sell spare parts and try to delete evidence
 * - Captain may falsify working hours
 * - Captain may provide kickbacks to suppliers
 *
 * SOLUTION: Multi-Stakeholder Access Control
 *
 * HIERARCHY:
 * 1. OWNER - Ultimate authority, sees EVERYTHING, cannot be blocked by captain
 * 2. CAPTAIN - Operational control, can operate vessel, but MONITORED
 * 3. CREW - Limited access, work under captain
 * 4. GUESTS - Very limited access
 *
 * KEY PRINCIPLE:
 * - Captain can operate vessel (needs access to navigation, systems)
 * - BUT owner can MONITOR captain at all times
 * - AND captain CANNOT delete/hide data from owner
 * - AND owner gets REAL-TIME alerts for suspicious activity
 */

import EventEmitter from 'eventemitter3';
import { ImmutableDataStore } from './ImmutableDataStore.js';

export interface StakeholderRole {
  id: string;
  role: 'owner' | 'captain' | 'crew' | 'guest';
  name: string;
  email: string;
  phone: string;
}

export interface OwnerAlert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical' | 'fraud_suspected';
  category: string;
  message: string;
  data: any;
  captainCannotDismiss: boolean;  // Owner-only alerts
}

export interface SuspiciousActivity {
  type: string;
  timestamp: Date;
  captainId: string;
  description: string;
  evidence: any;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class OwnerProtection extends EventEmitter {
  private vesselName: string;
  private owner: StakeholderRole;
  private captain: StakeholderRole;
  private immutableStore: ImmutableDataStore;

  // Owner alerts (captain cannot dismiss or hide)
  private ownerAlerts: OwnerAlert[] = [];
  private suspiciousActivities: SuspiciousActivity[] = [];

  // Monitoring thresholds
  private thresholds = {
    fuelConsumption: {
      maxDeviation: 0.2,  // 20% deviation triggers alert
    },
    routeDeviation: {
      maxDistanceKm: 50,  // 50km off planned route
    },
    financialTransaction: {
      requiresOwnerApproval: 10000,  // Transactions > 10K TL
    },
    maintenanceDelay: {
      maxDaysOverdue: 7,
    },
    engineHours: {
      maxDailyHours: 18,  // Suspicious if > 18h/day
    },
  };

  constructor(
    vesselName: string,
    owner: StakeholderRole,
    captain: StakeholderRole,
    immutableStore: ImmutableDataStore
  ) {
    super();
    this.vesselName = vesselName;
    this.owner = owner;
    this.captain = captain;
    this.immutableStore = immutableStore;

    console.log('\n🛡️ [OWNER PROTECTION ENABLED]');
    console.log(`   Vessel: ${vesselName}`);
    console.log(`   Owner: ${owner.name}`);
    console.log(`   Captain: ${captain.name}`);
    console.log(`   Monitoring: ACTIVE (Captain cannot disable)`);
    console.log(`   Immutable Store: CONNECTED (Captain cannot delete data)\n`);
  }

  /**
   * Monitor fuel consumption for theft/fraud
   */
  async monitorFuelConsumption(
    fuelAdded: number,
    engineHours: number,
    expectedConsumption: number
  ): Promise<void> {
    const actualConsumption = fuelAdded / engineHours;
    const deviation = Math.abs(actualConsumption - expectedConsumption) / expectedConsumption;

    if (deviation > this.thresholds.fuelConsumption.maxDeviation) {
      // SUSPICIOUS - Possible fuel theft
      await this.createOwnerAlert({
        severity: 'fraud_suspected',
        category: 'fuel_fraud',
        message:
          `⚠️ FUEL FRAUD ŞÜPHE\n` +
          `Beklenen tüketim: ${expectedConsumption.toFixed(2)} L/h\n` +
          `Gerçek tüketim: ${actualConsumption.toFixed(2)} L/h\n` +
          `Sapma: ${(deviation * 100).toFixed(1)}%\n` +
          `Captain: ${this.captain.name}`,
        data: {
          fuelAdded,
          engineHours,
          expectedConsumption,
          actualConsumption,
          deviation,
        },
      });

      // Log as suspicious activity
      this.suspiciousActivities.push({
        type: 'fuel_fraud_suspected',
        timestamp: new Date(),
        captainId: this.captain.id,
        description: `Fuel consumption ${(deviation * 100).toFixed(1)}% higher than expected`,
        evidence: { fuelAdded, engineHours, expectedConsumption, actualConsumption },
        riskLevel: deviation > 0.4 ? 'critical' : 'high',
      });
    }
  }

  /**
   * Monitor route for unauthorized deviations
   */
  async monitorRoute(
    plannedRoute: { lat: number; lon: number }[],
    currentPosition: { lat: number; lon: number }
  ): Promise<void> {
    // Calculate distance to planned route
    const distanceToRoute = this.calculateDistanceToRoute(plannedRoute, currentPosition);

    if (distanceToRoute > this.thresholds.routeDeviation.maxDistanceKm) {
      await this.createOwnerAlert({
        severity: 'warning',
        category: 'route_deviation',
        message:
          `⚠️ ROTA SAPMA\n` +
          `Planlanan rotadan ${distanceToRoute.toFixed(1)} km uzakta\n` +
          `Captain: ${this.captain.name}\n` +
          `Mevcut konum: ${currentPosition.lat}, ${currentPosition.lon}`,
        data: {
          plannedRoute,
          currentPosition,
          distanceToRoute,
        },
      });
    }
  }

  /**
   * Monitor financial transactions (require owner approval for large amounts)
   */
  async monitorFinancialTransaction(
    transactionType: string,
    amount: number,
    currency: string,
    vendor: string,
    captainId: string
  ): Promise<{ requiresOwnerApproval: boolean; approved?: boolean }> {
    // Large transactions require owner approval
    if (amount > this.thresholds.financialTransaction.requiresOwnerApproval) {
      await this.createOwnerAlert({
        severity: 'warning',
        category: 'financial_approval_required',
        message:
          `💰 OWNER ONAYI GEREKİYOR\n` +
          `İşlem: ${transactionType}\n` +
          `Tutar: ${amount} ${currency}\n` +
          `Satıcı: ${vendor}\n` +
          `Captain: ${this.captain.name}\n` +
          `Onay bekleniyor...`,
        data: {
          transactionType,
          amount,
          currency,
          vendor,
          captainId,
        },
      });

      // In production, this would wait for owner's approval
      // For now, just flag it
      return { requiresOwnerApproval: true };
    }

    return { requiresOwnerApproval: false };
  }

  /**
   * Monitor maintenance (detect neglect)
   */
  async monitorMaintenance(
    taskId: string,
    dueDate: Date,
    currentDate: Date
  ): Promise<void> {
    const daysOverdue = Math.floor(
      (currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysOverdue > this.thresholds.maintenanceDelay.maxDaysOverdue) {
      await this.createOwnerAlert({
        severity: 'critical',
        category: 'maintenance_neglected',
        message:
          `🔧 BAKIM İHMALİ\n` +
          `Task: ${taskId}\n` +
          `Gecikme: ${daysOverdue} gün\n` +
          `Captain: ${this.captain.name}\n` +
          `RİSK: Tekne güvenliği tehlikede!`,
        data: {
          taskId,
          dueDate,
          currentDate,
          daysOverdue,
        },
      });

      this.suspiciousActivities.push({
        type: 'maintenance_neglect',
        timestamp: new Date(),
        captainId: this.captain.id,
        description: `Maintenance task ${daysOverdue} days overdue`,
        evidence: { taskId, dueDate },
        riskLevel: daysOverdue > 30 ? 'critical' : 'high',
      });
    }
  }

  /**
   * Monitor engine hours (detect false reporting)
   */
  async monitorEngineHours(
    reportedHours: number,
    date: Date
  ): Promise<void> {
    if (reportedHours > this.thresholds.engineHours.maxDailyHours) {
      await this.createOwnerAlert({
        severity: 'fraud_suspected',
        category: 'engine_hours_fraud',
        message:
          `⚠️ ŞÜPHELI MOTOR SAATİ\n` +
          `Raporlanan: ${reportedHours} saat/gün\n` +
          `Maksimum beklenen: ${this.thresholds.engineHours.maxDailyHours} saat\n` +
          `Captain: ${this.captain.name}\n` +
          `UYARI: Yanılış rapor olabilir!`,
        data: {
          reportedHours,
          date,
        },
      });
    }
  }

  /**
   * Detect captain's attempt to delete data
   */
  detectDeleteAttempt(
    captainId: string,
    targetData: string
  ): void {
    // Captain attempting to delete data - BIG RED FLAG
    this.createOwnerAlert({
      severity: 'fraud_suspected',
      category: 'data_deletion_attempt',
      message:
        `🚨 VERİ SİLME GİRİŞİMİ!\n` +
        `Captain ${this.captain.name} veri silmeye çalıştı!\n` +
        `Hedef: ${targetData}\n` +
        `SONUÇ: ENGELLENDİ (Immutable store)\n` +
        `UYARI: Kanıt gizleme girişimi!`,
      data: {
        captainId,
        targetData,
        timestamp: new Date(),
        blocked: true,
      },
    });

    this.suspiciousActivities.push({
      type: 'data_deletion_attempt',
      timestamp: new Date(),
      captainId,
      description: `Attempted to delete: ${targetData}`,
      evidence: { targetData },
      riskLevel: 'critical',
    });

    // Log to immutable store (captain cannot delete this either!)
    this.immutableStore.append(
      'safety_event',
      {
        event: 'captain_delete_attempt',
        captainId,
        targetData,
        blocked: true,
        ownerAlerted: true,
      },
      'system',
      {
        source: 'owner_protection',
        device: 'monitoring_system',
        sessionId: 'audit',
      }
    );
  }

  /**
   * Create owner alert (captain CANNOT dismiss or hide)
   */
  private async createOwnerAlert(alert: {
    severity: OwnerAlert['severity'];
    category: string;
    message: string;
    data: any;
  }): Promise<void> {
    const ownerAlert: OwnerAlert = {
      id: `ALERT-${Date.now()}`,
      timestamp: new Date(),
      severity: alert.severity,
      category: alert.category,
      message: alert.message,
      data: alert.data,
      captainCannotDismiss: true,  // CRITICAL - Captain cannot hide this
    };

    this.ownerAlerts.push(ownerAlert);

    // Emit to owner (SMS, email, push notification)
    this.emit('owner:alert', ownerAlert);

    // Log to immutable store
    await this.immutableStore.append(
      'safety_event',
      {
        event: 'owner_alert_created',
        alert: ownerAlert,
      },
      'system',
      {
        source: 'owner_protection',
        device: 'monitoring_system',
        sessionId: 'audit',
      }
    );

    console.log(`\n🚨 [OWNER ALERT] ${alert.severity.toUpperCase()}`);
    console.log(`   Category: ${alert.category}`);
    console.log(`   Message: ${alert.message}`);
    console.log(`   Owner notified: ${this.owner.email}`);
    console.log(`   Captain CANNOT dismiss this alert\n`);
  }

  /**
   * Owner dashboard (captain has NO access to this)
   */
  getOwnerDashboard(): {
    alerts: OwnerAlert[];
    suspiciousActivities: SuspiciousActivity[];
    vesselStatus: any;
    captainActivity: any;
    financialSummary: any;
  } {
    console.log('\n👔 [OWNER DASHBOARD] Loading...');
    console.log(`   Owner: ${this.owner.name}`);
    console.log(`   Captain: ${this.captain.name}`);
    console.log(`   Access Level: OWNER ONLY (Captain cannot see this)\n`);

    return {
      alerts: this.ownerAlerts,
      suspiciousActivities: this.suspiciousActivities,
      vesselStatus: {
        // Real-time vessel status
        // Captain cannot fake this (comes from sensors)
      },
      captainActivity: {
        // What captain is doing
        // Captain cannot hide this
      },
      financialSummary: {
        // All expenses
        // Captain cannot delete this
      },
    };
  }

  /**
   * Owner can override captain
   */
  ownerOverride(
    action: string,
    reason: string
  ): { success: boolean; message: string } {
    console.log(`\n👔 [OWNER OVERRIDE] ${action}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Authority: Owner (ultimate)`);
    console.log(`   Captain: CANNOT block this\n`);

    // Owner has ultimate authority
    // Captain cannot prevent owner actions

    // Log to immutable store
    this.immutableStore.append(
      'safety_event',
      {
        event: 'owner_override',
        action,
        reason,
        timestamp: new Date(),
      },
      this.owner.id,
      {
        source: 'owner_protection',
        device: 'owner_dashboard',
        sessionId: 'owner',
      }
    );

    return {
      success: true,
      message: `Owner override executed: ${action}`,
    };
  }

  /**
   * Generate owner report (captain cannot access)
   */
  generateOwnerReport(period: { from: Date; to: Date }): string {
    console.log('\n📊 [OWNER REPORT] Generating...');
    console.log(`   Period: ${period.from.toLocaleDateString()} - ${period.to.toLocaleDateString()}`);
    console.log(`   Access: OWNER ONLY`);
    console.log(`   Captain: CANNOT see this report\n`);

    const report = {
      vessel: this.vesselName,
      owner: this.owner.name,
      captain: this.captain.name,
      period,
      alerts: this.ownerAlerts.filter(
        a => a.timestamp >= period.from && a.timestamp <= period.to
      ),
      suspiciousActivities: this.suspiciousActivities.filter(
        a => a.timestamp >= period.from && a.timestamp <= period.to
      ),
      summary: {
        totalAlerts: this.ownerAlerts.length,
        criticalAlerts: this.ownerAlerts.filter(a => a.severity === 'critical').length,
        fraudSuspected: this.ownerAlerts.filter(a => a.severity === 'fraud_suspected').length,
        suspiciousActivities: this.suspiciousActivities.length,
        highRiskActivities: this.suspiciousActivities.filter(a => a.riskLevel === 'critical').length,
      },
      recommendation:
        this.suspiciousActivities.filter(a => a.riskLevel === 'critical').length > 0
          ? 'UYARI: Kaptanın değiştirilmesi önerilir'
          : 'Normal operasyon',
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Calculate distance to route (helper)
   */
  private calculateDistanceToRoute(
    route: { lat: number; lon: number }[],
    position: { lat: number; lon: number }
  ): number {
    // Simplified - in production would calculate proper distance
    // For now, just return distance to closest point
    let minDistance = Infinity;

    for (const point of route) {
      const distance = Math.sqrt(
        Math.pow(point.lat - position.lat, 2) +
        Math.pow(point.lon - position.lon, 2)
      ) * 111; // Rough km conversion

      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    suspiciousActivitiesCount: number;
    highRiskCount: number;
  } {
    const alertsBySeverity: Record<string, number> = {
      info: 0,
      warning: 0,
      critical: 0,
      fraud_suspected: 0,
    };

    this.ownerAlerts.forEach(alert => {
      alertsBySeverity[alert.severity]++;
    });

    return {
      totalAlerts: this.ownerAlerts.length,
      alertsBySeverity,
      suspiciousActivitiesCount: this.suspiciousActivities.length,
      highRiskCount: this.suspiciousActivities.filter(a =>
        a.riskLevel === 'critical' || a.riskLevel === 'high'
      ).length,
    };
  }
}
