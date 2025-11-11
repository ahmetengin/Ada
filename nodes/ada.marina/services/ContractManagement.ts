/**
 * ContractManagement - Manage marina contracts
 */

import { v4 as uuidv4 } from 'uuid';
import { MarinaContract } from '../../../core/types.js';

export class ContractManagement {
  private contracts: Map<string, MarinaContract> = new Map();

  /**
   * Create new contract
   */
  createContract(
    vesselId: string,
    type: MarinaContract['type'],
    startDate: Date,
    berthId: string,
    services: string[],
    amount: number,
    currency: string = 'USD'
  ): MarinaContract {
    const endDate = this.calculateEndDate(startDate, type);

    const contract: MarinaContract = {
      id: uuidv4(),
      vesselId,
      type,
      startDate,
      endDate,
      berthId,
      services,
      terms: this.generateDefaultTerms(type),
      amount,
      currency,
      status: 'draft',
    };

    this.contracts.set(contract.id, contract);
    return contract;
  }

  /**
   * Activate contract
   */
  activateContract(contractId: string): boolean {
    const contract = this.contracts.get(contractId);
    if (contract && contract.status === 'draft') {
      contract.status = 'active';
      return true;
    }
    return false;
  }

  /**
   * Terminate contract
   */
  terminateContract(contractId: string): boolean {
    const contract = this.contracts.get(contractId);
    if (contract && contract.status === 'active') {
      contract.status = 'terminated';
      return true;
    }
    return false;
  }

  /**
   * Renew contract
   */
  renewContract(contractId: string): MarinaContract | null {
    const oldContract = this.contracts.get(contractId);
    if (!oldContract) return null;

    const newContract = this.createContract(
      oldContract.vesselId,
      oldContract.type,
      oldContract.endDate,
      oldContract.berthId,
      oldContract.services,
      oldContract.amount,
      oldContract.currency
    );

    return newContract;
  }

  /**
   * Get contract
   */
  getContract(contractId: string): MarinaContract | undefined {
    return this.contracts.get(contractId);
  }

  /**
   * Get contracts by vessel
   */
  getVesselContracts(vesselId: string): MarinaContract[] {
    return Array.from(this.contracts.values()).filter(c => c.vesselId === vesselId);
  }

  /**
   * Get active contracts
   */
  getActiveContracts(): MarinaContract[] {
    return Array.from(this.contracts.values()).filter(c => c.status === 'active');
  }

  /**
   * Get expiring contracts
   */
  getExpiringContracts(daysAhead: number = 30): MarinaContract[] {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return this.getActiveContracts().filter(
      c => c.endDate >= now && c.endDate <= futureDate
    );
  }

  /**
   * Check and update expired contracts
   */
  updateExpiredContracts(): number {
    const now = new Date();
    let updated = 0;

    this.getActiveContracts().forEach(contract => {
      if (contract.endDate < now) {
        contract.status = 'expired';
        updated++;
      }
    });

    return updated;
  }

  /**
   * Calculate end date based on contract type
   */
  private calculateEndDate(startDate: Date, type: MarinaContract['type']): Date {
    const endDate = new Date(startDate);

    switch (type) {
      case 'daily':
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'weekly':
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    return endDate;
  }

  /**
   * Generate default contract terms
   */
  private generateDefaultTerms(type: MarinaContract['type']): string {
    return `
MARINA CONTRACT TERMS (${type.toUpperCase()})

1. BERTH ALLOCATION
   - Berth assigned on availability basis
   - Marina reserves right to relocate vessel if necessary

2. PAYMENT TERMS
   - Payment due at start of contract period
   - Late payments subject to 5% penalty per day

3. SERVICES
   - Services as specified in contract
   - Additional services charged separately

4. LIABILITY
   - Vessel owner responsible for vessel and crew
   - Marina not liable for damage except due to negligence

5. TERMINATION
   - Either party may terminate with 30 days notice
   - No refunds for early termination

6. COMPLIANCE
   - Vessel must comply with all maritime regulations
   - Regular inspections may be conducted

Accepted under terms of marina operations.
    `.trim();
  }

  /**
   * Generate contract report
   */
  generateReport(): {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    totalRevenue: number;
    expiringCount: number;
  } {
    const contracts = Array.from(this.contracts.values());
    const byType: Record<string, number> = {
      daily: 0,
      weekly: 0,
      monthly: 0,
      yearly: 0,
    };
    const byStatus: Record<string, number> = {
      draft: 0,
      active: 0,
      expired: 0,
      terminated: 0,
    };

    let totalRevenue = 0;

    contracts.forEach(c => {
      byType[c.type]++;
      byStatus[c.status]++;
      if (c.status === 'active') {
        totalRevenue += c.amount;
      }
    });

    return {
      total: contracts.length,
      byType,
      byStatus,
      totalRevenue,
      expiringCount: this.getExpiringContracts().length,
    };
  }
}
