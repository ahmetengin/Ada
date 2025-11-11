/**
 * CrewManagement - Manage yacht crew members, licenses, and certifications
 */

import { CrewMember, HealthDocument, VisaInfo } from '../../../core/types.js';

export interface CrewSchedule {
  crewId: string;
  shift: 'day' | 'night' | 'standby';
  startTime: Date;
  endTime: Date;
  duties: string[];
}

export interface CrewCertification {
  type: string;
  issuingAuthority: string;
  number: string;
  issuedDate: Date;
  expiryDate: Date;
  status: 'valid' | 'expiring' | 'expired';
}

export class CrewManagement {
  private crew: Map<string, CrewMember> = new Map();
  private schedules: Map<string, CrewSchedule[]> = new Map();
  private certifications: Map<string, CrewCertification[]> = new Map();

  /**
   * Add crew member
   */
  addCrewMember(member: CrewMember): void {
    this.crew.set(member.id, member);
  }

  /**
   * Remove crew member
   */
  removeCrewMember(crewId: string): boolean {
    this.schedules.delete(crewId);
    this.certifications.delete(crewId);
    return this.crew.delete(crewId);
  }

  /**
   * Get crew member
   */
  getCrewMember(crewId: string): CrewMember | undefined {
    return this.crew.get(crewId);
  }

  /**
   * Get all crew members
   */
  getAllCrew(): CrewMember[] {
    return Array.from(this.crew.values());
  }

  /**
   * Get crew by role
   */
  getCrewByRole(role: string): CrewMember[] {
    return this.getAllCrew().filter(c => c.role === role);
  }

  /**
   * Add certification
   */
  addCertification(crewId: string, cert: CrewCertification): void {
    const certs = this.certifications.get(crewId) || [];
    certs.push(cert);
    this.certifications.set(crewId, certs);
  }

  /**
   * Check crew compliance
   */
  checkCompliance(crewId: string): {
    compliant: boolean;
    issues: string[];
    expiringDocuments: string[];
  } {
    const member = this.crew.get(crewId);
    const issues: string[] = [];
    const expiringDocuments: string[] = [];

    if (!member) {
      return { compliant: false, issues: ['Crew member not found'], expiringDocuments: [] };
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Check license
    if (!member.license) {
      issues.push('Missing license');
    }

    // Check health certificate
    if (member.healthCertificate) {
      if (member.healthCertificate.validUntil < now) {
        issues.push('Health certificate expired');
      } else if (member.healthCertificate.validUntil < thirtyDaysFromNow) {
        expiringDocuments.push('Health certificate expiring soon');
      }
    }

    // Check visa if applicable
    if (member.visa) {
      if (member.visa.validUntil < now) {
        issues.push('Visa expired');
      } else if (member.visa.validUntil < thirtyDaysFromNow) {
        expiringDocuments.push('Visa expiring soon');
      }
    }

    // Check certifications
    const certs = this.certifications.get(crewId) || [];
    certs.forEach(cert => {
      if (cert.expiryDate < now) {
        issues.push(`${cert.type} certification expired`);
      } else if (cert.expiryDate < thirtyDaysFromNow) {
        expiringDocuments.push(`${cert.type} certification expiring soon`);
      }
    });

    return {
      compliant: issues.length === 0,
      issues,
      expiringDocuments,
    };
  }

  /**
   * Create crew schedule
   */
  scheduleCrewMember(crewId: string, schedule: CrewSchedule): void {
    const schedules = this.schedules.get(crewId) || [];
    schedules.push(schedule);
    this.schedules.set(crewId, schedules);
  }

  /**
   * Get crew schedule
   */
  getCrewSchedule(crewId: string, date?: Date): CrewSchedule[] {
    const allSchedules = this.schedules.get(crewId) || [];

    if (!date) {
      return allSchedules;
    }

    return allSchedules.filter(
      s => s.startTime <= date && s.endTime >= date
    );
  }

  /**
   * Get on-duty crew
   */
  getOnDutyCrew(time: Date = new Date()): CrewMember[] {
    const onDuty: CrewMember[] = [];

    this.schedules.forEach((schedules, crewId) => {
      const currentSchedule = schedules.find(
        s => s.startTime <= time && s.endTime >= time
      );

      if (currentSchedule && currentSchedule.shift !== 'standby') {
        const member = this.crew.get(crewId);
        if (member) onDuty.push(member);
      }
    });

    return onDuty;
  }

  /**
   * Generate crew report
   */
  generateCrewReport(): {
    totalCrew: number;
    byRole: Record<string, number>;
    complianceIssues: number;
    expiringDocuments: number;
  } {
    const byRole: Record<string, number> = {};
    let complianceIssues = 0;
    let expiringDocuments = 0;

    this.crew.forEach(member => {
      byRole[member.role] = (byRole[member.role] || 0) + 1;

      const compliance = this.checkCompliance(member.id);
      if (!compliance.compliant) complianceIssues++;
      expiringDocuments += compliance.expiringDocuments.length;
    });

    return {
      totalCrew: this.crew.size,
      byRole,
      complianceIssues,
      expiringDocuments,
    };
  }
}
