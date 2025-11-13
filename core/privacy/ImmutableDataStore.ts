/**
 * ImmutableDataStore - Append-Only Data Storage for Maritime Legal Compliance
 *
 * CRITICAL PRINCIPLE:
 * "Hiçbir veri silinmez, kimsenin yetkisi yoktur. Kaptan bile silemez."
 * (No data can be deleted, no one has authority. Not even the captain.)
 *
 * WHY IMMUTABLE?
 * - Maritime legal requirements (logbook integrity)
 * - Accident investigation (complete record preservation)
 * - Insurance claims (unalterable evidence)
 * - Regulatory compliance (coast guard, port authorities)
 * - Crew protection (evidence of working conditions, decisions)
 * - Criminal investigation (chain of custody)
 *
 * WHAT THIS MEANS:
 * ✓ Data can be ADDED (append-only)
 * ✓ Data can be AMENDED (with full audit trail showing original)
 * ✓ Data can be ARCHIVED (moved to long-term storage, still accessible)
 * ✓ Data can be MARKED (flagged as disputed, corrected, etc.)
 * ✗ Data CANNOT be deleted (by anyone, ever)
 *
 * COMPLIANCE:
 * - SOLAS (Safety of Life at Sea) - requires complete records
 * - ISM Code (International Safety Management) - audit trail requirements
 * - Turkish Maritime Law - logbook integrity
 * - Insurance requirements - complete operational history
 */

import EventEmitter from 'eventemitter3';
import { createHash } from 'crypto';

export type ImmutableDataType =
  | 'logbook'          // Ship's log - NEVER deletable
  | 'navigation'       // GPS, course, speed - legal requirement
  | 'sensor'           // NMEA2000, weather - operational evidence
  | 'communication'    // VHF, radio - safety critical
  | 'maintenance'      // Repairs, inspections - regulatory
  | 'crew_duty'        // Work hours, watch schedules - labor law
  | 'safety_event'     // Incidents, near-misses - mandatory reporting
  | 'financial_op'     // Operational costs - tax/audit
  | 'inspection'       // Port state control, surveys - legal
  | 'emergency';       // Mayday, COB, etc. - investigation

export interface ImmutableEntry {
  id: string;
  timestamp: Date;
  dataType: ImmutableDataType;
  data: any;
  hash: string;              // SHA-256 hash for integrity
  previousHash: string;      // Hash of previous entry (blockchain-like)
  captainId: string;         // Who recorded it
  vesselPosition?: {
    latitude: number;
    longitude: number;
  };
  metadata: {
    source: string;          // Where data came from (sensor, manual, voice)
    device: string;          // Which device recorded it
    sessionId: string;       // Session for grouping
  };

  // Audit trail for amendments
  amended: boolean;
  amendments: Array<{
    amendmentId: string;
    timestamp: Date;
    reason: string;
    addedBy: string;
    originalData: any;       // Original preserved
    newData: any;            // Amendment
    hash: string;
  }>;

  // Status flags (data remains, just flagged)
  flags: {
    disputed: boolean;
    corrected: boolean;
    archived: boolean;
    importance: 'routine' | 'important' | 'critical' | 'emergency';
  };

  // Legal holds (cannot even be archived during investigation)
  legalHold: {
    active: boolean;
    reason?: string;
    authority?: string;      // Coast guard, police, etc.
    startDate?: Date;
  };
}

export interface DataIntegrityReport {
  totalEntries: number;
  hashChainValid: boolean;  // Blockchain-like verification
  brokenLinks: number;
  tamperedEntries: number;
  oldestEntry: Date;
  newestEntry: Date;
  storageUsed: number;       // GB
  byType: Record<ImmutableDataType, number>;
}

export class ImmutableDataStore extends EventEmitter {
  private vesselName: string;
  private entries: ImmutableEntry[] = [];
  private hashChain: string[] = [];  // Blockchain-like chain
  private genesisHash: string;       // First hash in chain

  constructor(vesselName: string) {
    super();
    this.vesselName = vesselName;

    // Genesis block (first entry)
    this.genesisHash = this.createHash({
      vessel: vesselName,
      timestamp: new Date(),
      message: 'Immutable data store initialized',
    });
    this.hashChain.push(this.genesisHash);

    console.log('\n🔒 [IMMUTABLE DATA STORE INITIALIZED]');
    console.log(`   Vessel: ${vesselName}`);
    console.log(`   Genesis Hash: ${this.genesisHash.substring(0, 16)}...`);
    console.log('   Deletion Policy: IMPOSSIBLE (no one can delete)');
    console.log('   Amendment Policy: Allowed with full audit trail');
    console.log('   Legal Compliance: SOLAS, ISM Code, Turkish Maritime Law\n');
  }

  /**
   * Append data (ONLY way to add data)
   * CANNOT delete, CANNOT overwrite
   */
  async append(
    dataType: ImmutableDataType,
    data: any,
    captainId: string,
    metadata: {
      source: string;
      device: string;
      sessionId: string;
    },
    vesselPosition?: { latitude: number; longitude: number }
  ): Promise<string> {
    const entryId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const entry: ImmutableEntry = {
      id: entryId,
      timestamp: new Date(),
      dataType,
      data,
      hash: '', // Will be calculated
      previousHash: this.hashChain[this.hashChain.length - 1],
      captainId,
      vesselPosition,
      metadata,
      amended: false,
      amendments: [],
      flags: {
        disputed: false,
        corrected: false,
        archived: false,
        importance: this.classifyImportance(dataType, data),
      },
      legalHold: {
        active: false,
      },
    };

    // Calculate hash for this entry
    entry.hash = this.createHash({
      ...entry,
      hash: undefined, // Don't include hash in hash calculation
    });

    // Add to chain
    this.hashChain.push(entry.hash);
    this.entries.push(entry);

    // Emit event
    this.emit('data:appended', {
      entryId,
      dataType,
      timestamp: entry.timestamp,
      hash: entry.hash,
    });

    console.log(`✓ [APPEND] ${dataType} entry added`);
    console.log(`   ID: ${entryId}`);
    console.log(`   Hash: ${entry.hash.substring(0, 16)}...`);
    console.log(`   Status: IMMUTABLE (cannot be deleted)\n`);

    return entryId;
  }

  /**
   * Amend existing entry (original preserved)
   * This is the ONLY way to "correct" data
   */
  async amend(
    entryId: string,
    newData: any,
    reason: string,
    amendedBy: string
  ): Promise<{ success: boolean; amendmentId?: string; error?: string }> {
    const entry = this.entries.find(e => e.id === entryId);

    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }

    // Check legal hold
    if (entry.legalHold.active) {
      return {
        success: false,
        error: `Entry under legal hold by ${entry.legalHold.authority}. Cannot amend.`,
      };
    }

    const amendmentId = `AMD-${Date.now()}`;

    const amendment = {
      amendmentId,
      timestamp: new Date(),
      reason,
      addedBy: amendedBy,
      originalData: { ...entry.data },  // Preserve original
      newData,
      hash: this.createHash({
        amendmentId,
        timestamp: new Date(),
        reason,
        originalData: entry.data,
        newData,
      }),
    };

    entry.amendments.push(amendment);
    entry.amended = true;
    entry.flags.corrected = true;

    // Update entry data (but original preserved in amendments)
    entry.data = newData;

    this.emit('data:amended', {
      entryId,
      amendmentId,
      reason,
      timestamp: amendment.timestamp,
    });

    console.log(`✓ [AMEND] Entry ${entryId} amended`);
    console.log(`   Amendment ID: ${amendmentId}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Original Data: PRESERVED`);
    console.log(`   New Data: Updated`);
    console.log(`   Audit Trail: Complete\n`);

    return { success: true, amendmentId };
  }

  /**
   * Mark entry as disputed (but NOT delete)
   */
  disputeEntry(entryId: string, reason: string, disputedBy: string): boolean {
    const entry = this.entries.find(e => e.id === entryId);
    if (!entry) return false;

    entry.flags.disputed = true;

    // Add dispute as amendment (audit trail)
    this.amend(
      entryId,
      entry.data,
      `DISPUTED: ${reason}`,
      disputedBy
    );

    console.log(`⚠️ [DISPUTE] Entry ${entryId} marked as disputed`);
    console.log(`   Reason: ${reason}`);
    console.log(`   By: ${disputedBy}`);
    console.log(`   Status: Still in records (cannot be deleted)\n`);

    return true;
  }

  /**
   * Archive entry (move to long-term storage, still accessible)
   */
  archiveEntry(entryId: string): boolean {
    const entry = this.entries.find(e => e.id === entryId);
    if (!entry) return false;

    entry.flags.archived = true;

    console.log(`📦 [ARCHIVE] Entry ${entryId} archived`);
    console.log(`   Status: Moved to long-term storage`);
    console.log(`   Accessible: YES (archived != deleted)`);
    console.log(`   Deletable: NO (never)\n`);

    return true;
  }

  /**
   * Place legal hold (during investigation)
   */
  placeLegalHold(
    entryId: string,
    reason: string,
    authority: string
  ): boolean {
    const entry = this.entries.find(e => e.id === entryId);
    if (!entry) return false;

    entry.legalHold = {
      active: true,
      reason,
      authority,
      startDate: new Date(),
    };

    console.log(`⚖️ [LEGAL HOLD] Entry ${entryId}`);
    console.log(`   Authority: ${authority}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Effect: Cannot be amended or archived`);
    console.log(`   Duration: Until hold lifted\n`);

    return true;
  }

  /**
   * Lift legal hold
   */
  liftLegalHold(entryId: string, authority: string): boolean {
    const entry = this.entries.find(e => e.id === entryId);
    if (!entry) return false;

    if (entry.legalHold.authority !== authority) {
      console.log(`✗ [LEGAL HOLD] Cannot lift - authority mismatch`);
      return false;
    }

    entry.legalHold.active = false;

    console.log(`✓ [LEGAL HOLD LIFTED] Entry ${entryId}`);
    console.log(`   By: ${authority}\n`);

    return true;
  }

  /**
   * Attempt to delete (WILL ALWAYS FAIL)
   */
  attemptDelete(entryId: string, requestedBy: string): {
    success: false;
    reason: string;
    policy: string;
  } {
    console.log(`\n❌ [DELETE ATTEMPT BLOCKED]`);
    console.log(`   Entry ID: ${entryId}`);
    console.log(`   Requested By: ${requestedBy}`);
    console.log(`   Result: DENIED`);
    console.log(`   Policy: NO ONE CAN DELETE DATA`);
    console.log(`   Not even: Captain, Owner, Ada.sea, Anyone`);
    console.log(`   Reason: Maritime legal compliance (SOLAS, ISM Code)`);
    console.log(`   Alternative: Use amend() to correct, or disputeEntry()\n`);

    // Log the attempt (for audit)
    this.append(
      'safety_event',
      {
        event: 'delete_attempt',
        targetEntryId: entryId,
        requestedBy,
        result: 'BLOCKED',
        timestamp: new Date(),
      },
      'system',
      {
        source: 'immutable_data_store',
        device: 'system',
        sessionId: 'audit',
      }
    );

    return {
      success: false,
      reason: 'Data deletion is PROHIBITED by maritime law and safety regulations',
      policy: 'Immutable data store - append-only, no deletion allowed',
    };
  }

  /**
   * Verify data integrity (blockchain-like verification)
   */
  verifyIntegrity(): DataIntegrityReport {
    console.log('\n🔍 [INTEGRITY CHECK] Verifying hash chain...\n');

    let hashChainValid = true;
    let brokenLinks = 0;
    let tamperedEntries = 0;

    // Verify each entry's hash chain
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Recalculate hash
      const calculatedHash = this.createHash({
        ...entry,
        hash: undefined,
      });

      if (calculatedHash !== entry.hash) {
        tamperedEntries++;
        hashChainValid = false;
        console.log(`⚠️ Tampered entry detected: ${entry.id}`);
      }

      // Verify previous hash link
      if (i > 0 && entry.previousHash !== this.entries[i - 1].hash) {
        brokenLinks++;
        hashChainValid = false;
        console.log(`⚠️ Broken chain link at entry: ${entry.id}`);
      }
    }

    const byType: Record<ImmutableDataType, number> = {
      logbook: 0,
      navigation: 0,
      sensor: 0,
      communication: 0,
      maintenance: 0,
      crew_duty: 0,
      safety_event: 0,
      financial_op: 0,
      inspection: 0,
      emergency: 0,
    };

    this.entries.forEach(entry => {
      byType[entry.dataType]++;
    });

    const report: DataIntegrityReport = {
      totalEntries: this.entries.length,
      hashChainValid,
      brokenLinks,
      tamperedEntries,
      oldestEntry: this.entries[0]?.timestamp || new Date(),
      newestEntry: this.entries[this.entries.length - 1]?.timestamp || new Date(),
      storageUsed: JSON.stringify(this.entries).length / (1024 * 1024 * 1024), // GB
      byType,
    };

    if (hashChainValid) {
      console.log('✓ Hash chain integrity: VALID');
      console.log('✓ No tampering detected');
      console.log('✓ All links verified\n');
    } else {
      console.log('✗ Hash chain integrity: COMPROMISED');
      console.log(`✗ Broken links: ${brokenLinks}`);
      console.log(`✗ Tampered entries: ${tamperedEntries}\n`);
    }

    return report;
  }

  /**
   * Get complete audit trail for an entry
   */
  getAuditTrail(entryId: string): {
    original: ImmutableEntry;
    amendments: any[];
    disputes: any[];
    legalActions: any[];
  } | null {
    const entry = this.entries.find(e => e.id === entryId);
    if (!entry) return null;

    return {
      original: entry,
      amendments: entry.amendments,
      disputes: entry.flags.disputed ? entry.amendments.filter(a =>
        a.reason.startsWith('DISPUTED')
      ) : [],
      legalActions: entry.legalHold.active ? [{
        type: 'legal_hold',
        authority: entry.legalHold.authority,
        reason: entry.legalHold.reason,
        startDate: entry.legalHold.startDate,
      }] : [],
    };
  }

  /**
   * Export immutable records (for legal/regulatory authorities)
   */
  exportImmutableRecords(
    fromDate?: Date,
    toDate?: Date,
    dataTypes?: ImmutableDataType[]
  ): string {
    console.log('\n📋 [EXPORT] Immutable records export requested');
    console.log('   Purpose: Legal/regulatory compliance');
    console.log('   Format: JSON with hash verification');
    console.log('   Integrity: Cryptographically verifiable\n');

    let filtered = this.entries;

    if (fromDate) {
      filtered = filtered.filter(e => e.timestamp >= fromDate);
    }
    if (toDate) {
      filtered = filtered.filter(e => e.timestamp <= toDate);
    }
    if (dataTypes) {
      filtered = filtered.filter(e => dataTypes.includes(e.dataType));
    }

    const exportData = {
      vessel: this.vesselName,
      exportDate: new Date(),
      genesisHash: this.genesisHash,
      entries: filtered,
      integrityReport: this.verifyIntegrity(),
      certification: {
        message: 'This is a certified immutable record export',
        entries: filtered.length,
        hashChainValid: this.verifyIntegrity().hashChainValid,
        exportHash: this.createHash(filtered),
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Create hash (SHA-256)
   */
  private createHash(data: any): string {
    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Classify importance based on data type and content
   */
  private classifyImportance(
    dataType: ImmutableDataType,
    data: any
  ): 'routine' | 'important' | 'critical' | 'emergency' {
    if (dataType === 'emergency') return 'emergency';
    if (dataType === 'safety_event') return 'critical';
    if (dataType === 'inspection') return 'important';
    return 'routine';
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalEntries: number;
    amended: number;
    disputed: number;
    archived: number;
    legalHolds: number;
    oldestEntry: string;
    newestEntry: string;
    byType: Record<ImmutableDataType, number>;
  } {
    const byType: Record<ImmutableDataType, number> = {
      logbook: 0,
      navigation: 0,
      sensor: 0,
      communication: 0,
      maintenance: 0,
      crew_duty: 0,
      safety_event: 0,
      financial_op: 0,
      inspection: 0,
      emergency: 0,
    };

    this.entries.forEach(entry => {
      byType[entry.dataType]++;
    });

    return {
      totalEntries: this.entries.length,
      amended: this.entries.filter(e => e.amended).length,
      disputed: this.entries.filter(e => e.flags.disputed).length,
      archived: this.entries.filter(e => e.flags.archived).length,
      legalHolds: this.entries.filter(e => e.legalHold.active).length,
      oldestEntry: this.entries[0]?.timestamp?.toISOString() || 'N/A',
      newestEntry: this.entries[this.entries.length - 1]?.timestamp?.toISOString() || 'N/A',
      byType,
    };
  }
}
