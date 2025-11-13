/**
 * Vessel Instance Repository
 *
 * Manages vessel instances in Neo4j database
 * Stores complete vessel profiles with all relationships
 */

import neo4j, { Driver, Session } from 'neo4j-driver';
import { VesselInstance, VesselOnboardingTemplate } from '../templates/VesselOnboardingTemplate.js';
import { MMSI } from '../types/AISTypes.js';

export interface VesselQueryOptions {
  mmsi?: MMSI;
  flagState?: string;
  ownerEmail?: string;
  homePort?: string;
  status?: 'Active' | 'Inactive' | 'Maintenance' | 'Decommissioned';
}

export class VesselInstanceRepository {
  private driver: Driver;

  constructor(uri: string = 'bolt://localhost:7687', user: string = 'neo4j', password: string = 'password') {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  /**
   * Initialize database schema
   * Creates constraints and indexes
   */
  async initialize(): Promise<void> {
    const session = this.driver.session();

    try {
      // Create constraints
      await session.run(`
        CREATE CONSTRAINT vessel_mmsi_unique IF NOT EXISTS
        FOR (v:Vessel) REQUIRE v.mmsi IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT vessel_imo_unique IF NOT EXISTS
        FOR (v:Vessel) REQUIRE v.imo IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT vessel_tenant_id_unique IF NOT EXISTS
        FOR (v:Vessel) REQUIRE v.tenantId IS UNIQUE
      `);

      // Create indexes
      await session.run(`
        CREATE INDEX vessel_flag_state IF NOT EXISTS
        FOR (v:Vessel) ON (v.flagState)
      `);

      await session.run(`
        CREATE INDEX vessel_status IF NOT EXISTS
        FOR (v:Vessel) ON (v.status)
      `);

      await session.run(`
        CREATE INDEX owner_email IF NOT EXISTS
        FOR (o:Owner) ON (o.email)
      `);

      console.log('✅ Neo4j database schema initialized');
    } finally {
      await session.close();
    }
  }

  /**
   * Create vessel instance in Neo4j
   */
  async createVessel(instance: VesselInstance): Promise<VesselInstance> {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        // Create Vessel node
        CREATE (v:Vessel {
          tenantId: $tenantId,
          displayName: $displayName,
          mmsi: $mmsi,
          imo: $imo,
          callSign: $callSign,
          vesselName: $vesselName,
          flagState: $flagState,
          portOfRegistry: $portOfRegistry,
          vesselType: $vesselType,
          aisClass: $aisClass,
          length: $length,
          beam: $beam,
          draft: $draft,
          builtYear: $builtYear,
          createdAt: datetime($createdAt),
          lastUpdated: datetime($lastUpdated),
          status: $status,
          nodeId: $nodeId
        })

        // Create Owner node
        CREATE (o:Owner {
          name: $ownerName,
          email: $ownerEmail,
          phone: $ownerPhone,
          since: datetime($ownerSince)
        })

        // Create HomePort node
        CREATE (hp:HomePort {
          marina: $marina,
          berth: $berth,
          country: $country,
          latitude: $latitude,
          longitude: $longitude
        })

        // Create relationships
        CREATE (v)-[:OWNED_BY]->(o)
        CREATE (v)-[:BASED_AT]->(hp)

        RETURN v, o, hp
        `,
        {
          tenantId: instance.tenantId,
          displayName: instance.displayName,
          mmsi: instance.mmsi,
          imo: instance.onboardingData.legalIdentity.imo,
          callSign: instance.onboardingData.legalIdentity.callSign,
          vesselName: instance.onboardingData.legalIdentity.vesselName,
          flagState: instance.onboardingData.legalIdentity.flagState,
          portOfRegistry: instance.onboardingData.legalIdentity.portOfRegistry,
          vesselType: instance.onboardingData.legalIdentity.vesselType,
          aisClass: instance.onboardingData.legalIdentity.aisClass,
          length: instance.onboardingData.legalIdentity.length,
          beam: instance.onboardingData.legalIdentity.beam,
          draft: instance.onboardingData.legalIdentity.draft,
          builtYear: instance.onboardingData.legalIdentity.builtYear,
          createdAt: instance.createdAt.toISOString(),
          lastUpdated: instance.lastUpdated.toISOString(),
          status: instance.status,
          nodeId: instance.nodeId,

          // Owner
          ownerName: instance.onboardingData.ownership.currentOwner.name,
          ownerEmail: instance.onboardingData.ownership.currentOwner.email,
          ownerPhone: instance.onboardingData.ownership.currentOwner.phone,
          ownerSince: instance.onboardingData.ownership.currentOwner.since.toISOString(),

          // Home Port
          marina: instance.onboardingData.homePort.marina,
          berth: instance.onboardingData.homePort.berth || '',
          country: instance.onboardingData.homePort.country,
          latitude: instance.onboardingData.homePort.coordinates?.latitude || 0,
          longitude: instance.onboardingData.homePort.coordinates?.longitude || 0,
        }
      );

      // Store complete onboarding data as JSON
      await session.run(
        `
        MATCH (v:Vessel {mmsi: $mmsi})
        SET v.onboardingData = $onboardingDataJson
        RETURN v
        `,
        {
          mmsi: instance.mmsi,
          onboardingDataJson: JSON.stringify(instance.onboardingData),
        }
      );

      // Create Certificate nodes
      if (instance.onboardingData.certificates) {
        await this.createCertificates(session, instance);
      }

      // Create Engine nodes
      if (instance.onboardingData.specifications?.engines) {
        await this.createEngines(session, instance);
      }

      // Create Crew nodes
      if (instance.onboardingData.crew) {
        await this.createCrew(session, instance);
      }

      console.log(`✅ Vessel created: ${instance.nodeId}`);
      return instance;
    } finally {
      await session.close();
    }
  }

  /**
   * Create certificate nodes
   */
  private async createCertificates(session: Session, instance: VesselInstance): Promise<void> {
    const certs = instance.onboardingData.certificates;

    // Insurance
    if (certs?.insurance) {
      await session.run(
        `
        MATCH (v:Vessel {mmsi: $mmsi})
        CREATE (i:Insurance {
          company: $company,
          policyNumber: $policyNumber,
          coverageType: $coverageType,
          coverageAmount: $coverageAmount,
          currency: $currency,
          expiryDate: date($expiryDate)
        })
        CREATE (v)-[:HAS_INSURANCE]->(i)
        `,
        {
          mmsi: instance.mmsi,
          company: certs.insurance.company,
          policyNumber: certs.insurance.policyNumber,
          coverageType: certs.insurance.coverageType,
          coverageAmount: certs.insurance.coverageAmount,
          currency: certs.insurance.currency,
          expiryDate: certs.insurance.expiryDate,
        }
      );
    }
  }

  /**
   * Create engine nodes
   */
  private async createEngines(session: Session, instance: VesselInstance): Promise<void> {
    const engines = instance.onboardingData.specifications?.engines;

    if (!engines) return;

    for (const engine of engines) {
      await session.run(
        `
        MATCH (v:Vessel {mmsi: $mmsi})
        CREATE (e:Engine {
          position: $position,
          make: $make,
          model: $model,
          serialNumber: $serialNumber,
          horsePower: $horsePower,
          fuelType: $fuelType,
          currentHours: $currentHours
        })
        CREATE (v)-[:HAS_ENGINE]->(e)
        `,
        {
          mmsi: instance.mmsi,
          position: engine.position,
          make: engine.make,
          model: engine.model,
          serialNumber: engine.serialNumber,
          horsePower: engine.horsePower,
          fuelType: engine.fuelType,
          currentHours: engine.currentHours,
        }
      );
    }
  }

  /**
   * Create crew nodes
   */
  private async createCrew(session: Session, instance: VesselInstance): Promise<void> {
    const crew = instance.onboardingData.crew;

    if (!crew) return;

    for (const member of crew) {
      await session.run(
        `
        MATCH (v:Vessel {mmsi: $mmsi})
        CREATE (c:CrewMember {
          name: $name,
          role: $role,
          passport: $passport,
          nationality: $nationality
        })
        CREATE (v)-[:HAS_CREW]->(c)
        `,
        {
          mmsi: instance.mmsi,
          name: member.name,
          role: member.role,
          passport: member.passport,
          nationality: member.nationality,
        }
      );
    }
  }

  /**
   * Find vessel by MMSI
   */
  async findByMMSI(mmsi: MMSI): Promise<VesselInstance | null> {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (v:Vessel {mmsi: $mmsi})
        RETURN v
        `,
        { mmsi }
      );

      if (result.records.length === 0) {
        return null;
      }

      const vessel = result.records[0].get('v').properties;
      return this.mapToVesselInstance(vessel);
    } finally {
      await session.close();
    }
  }

  /**
   * Find vessel by tenant ID
   */
  async findByTenantId(tenantId: string): Promise<VesselInstance | null> {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (v:Vessel {tenantId: $tenantId})
        OPTIONAL MATCH (v)-[:OWNED_BY]->(o:Owner)
        OPTIONAL MATCH (v)-[:BASED_AT]->(hp:HomePort)
        OPTIONAL MATCH (v)-[:HAS_ENGINE]->(e:Engine)
        OPTIONAL MATCH (v)-[:HAS_CREW]->(c:CrewMember)
        RETURN v, o, hp, collect(e) as engines, collect(c) as crew
        `,
        { tenantId }
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const vessel = record.get('v').properties;
      const owner = record.get('o')?.properties;
      const homePort = record.get('hp')?.properties;
      const engines = record.get('engines');
      const crew = record.get('crew');

      return this.mapToVesselInstance(vessel, owner, homePort, engines, crew);
    } finally {
      await session.close();
    }
  }

  /**
   * Query vessels with filters
   */
  async findVessels(options: VesselQueryOptions): Promise<VesselInstance[]> {
    const session = this.driver.session();

    try {
      let whereClause = '';
      const params: any = {};

      if (options.mmsi) {
        whereClause += ' AND v.mmsi = $mmsi';
        params.mmsi = options.mmsi;
      }

      if (options.flagState) {
        whereClause += ' AND v.flagState = $flagState';
        params.flagState = options.flagState;
      }

      if (options.status) {
        whereClause += ' AND v.status = $status';
        params.status = options.status;
      }

      if (options.ownerEmail) {
        whereClause += ' AND o.email = $ownerEmail';
        params.ownerEmail = options.ownerEmail;
      }

      if (options.homePort) {
        whereClause += ' AND hp.marina CONTAINS $homePort';
        params.homePort = options.homePort;
      }

      // Remove leading AND
      if (whereClause) {
        whereClause = whereClause.substring(5);
        whereClause = 'WHERE ' + whereClause;
      }

      const result = await session.run(
        `
        MATCH (v:Vessel)
        OPTIONAL MATCH (v)-[:OWNED_BY]->(o:Owner)
        OPTIONAL MATCH (v)-[:BASED_AT]->(hp:HomePort)
        ${whereClause}
        RETURN v, o, hp
        ORDER BY v.displayName
        `,
        params
      );

      return result.records.map(record => {
        const vessel = record.get('v').properties;
        const owner = record.get('o')?.properties;
        const homePort = record.get('hp')?.properties;
        return this.mapToVesselInstance(vessel, owner, homePort);
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Update vessel status
   */
  async updateStatus(mmsi: MMSI, status: VesselInstance['status']): Promise<void> {
    const session = this.driver.session();

    try {
      await session.run(
        `
        MATCH (v:Vessel {mmsi: $mmsi})
        SET v.status = $status, v.lastUpdated = datetime()
        RETURN v
        `,
        { mmsi, status }
      );

      console.log(`✅ Vessel ${mmsi} status updated to ${status}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Update engine hours
   */
  async updateEngineHours(mmsi: MMSI, enginePosition: string, hours: number): Promise<void> {
    const session = this.driver.session();

    try {
      await session.run(
        `
        MATCH (v:Vessel {mmsi: $mmsi})-[:HAS_ENGINE]->(e:Engine {position: $position})
        SET e.currentHours = $hours, e.lastUpdated = datetime()
        RETURN e
        `,
        { mmsi, position: enginePosition, hours }
      );

      console.log(`✅ Engine hours updated: ${enginePosition} = ${hours}h`);
    } finally {
      await session.close();
    }
  }

  /**
   * Get fleet statistics
   */
  async getFleetStatistics(): Promise<any> {
    const session = this.driver.session();

    try {
      const result = await session.run(`
        MATCH (v:Vessel)
        RETURN
          count(v) as totalVessels,
          count(CASE WHEN v.status = 'Active' THEN 1 END) as activeVessels,
          collect(DISTINCT v.flagState) as flagStates,
          avg(v.length) as avgLength,
          sum(v.grossTonnage) as totalTonnage
      `);

      const record = result.records[0];
      return {
        totalVessels: record.get('totalVessels').toNumber(),
        activeVessels: record.get('activeVessels').toNumber(),
        flagStates: record.get('flagStates'),
        avgLength: record.get('avgLength'),
        totalTonnage: record.get('totalTonnage'),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Find vessels by owner
   */
  async findByOwner(ownerEmail: string): Promise<VesselInstance[]> {
    return this.findVessels({ ownerEmail });
  }

  /**
   * Delete vessel (soft delete - set status to Decommissioned)
   */
  async deleteVessel(mmsi: MMSI): Promise<void> {
    await this.updateStatus(mmsi, 'Decommissioned');
  }

  /**
   * Map Neo4j properties to VesselInstance
   */
  private mapToVesselInstance(
    vessel: any,
    owner?: any,
    homePort?: any,
    engines?: any[],
    crew?: any[]
  ): VesselInstance {
    const onboardingData = vessel.onboardingData
      ? JSON.parse(vessel.onboardingData)
      : {};

    return {
      tenantId: vessel.tenantId,
      displayName: vessel.displayName,
      mmsi: vessel.mmsi,
      onboardingData,
      createdAt: new Date(vessel.createdAt),
      createdBy: owner?.email || '',
      lastUpdated: new Date(vessel.lastUpdated),
      status: vessel.status,
      nodeId: vessel.nodeId,
    };
  }

  /**
   * Close Neo4j connection
   */
  async close(): Promise<void> {
    await this.driver.close();
    console.log('Neo4j connection closed');
  }
}
