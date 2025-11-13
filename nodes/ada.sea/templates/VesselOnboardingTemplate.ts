/**
 * Vessel Onboarding Template
 *
 * This template defines ALL data fields that must be filled when creating
 * a new Ada.Sea vessel instance (tenant).
 *
 * Usage:
 * 1. User creates new vessel: ada.sea.<TENANT_ID>
 * 2. System presents this template
 * 3. User fills all required (*) and optional fields
 * 4. System validates and creates vessel instance
 *
 * Example tenant IDs:
 * - ada.sea.beneteau-oceanis-51-271001234
 * - ada.sea.my-yacht-name-mmsi
 */

import {
  VesselLegalIdentity,
  AISClass,
  ShipType,
  MMSI,
  IMONumber,
} from '../types/AISTypes.js';

/**
 * SECTION 1: LEGAL IDENTITY (MANDATORY)
 * All fields marked with * are REQUIRED
 */
export interface VesselOnboardingTemplate {
  /**
   * === LEGAL IDENTITY & REGISTRATION ===
   * Required by international maritime law
   */
  legalIdentity: {
    // * REQUIRED - Primary identifiers
    mmsi: MMSI;                    // * 9-digit MMSI (e.g., '271001234')
    imo: IMONumber;                // * IMO number (e.g., 'IMO1234567')
    callSign: string;              // * Radio call sign (e.g., 'TCAB1234')
    vesselName: string;            // * Official registered name

    // * REQUIRED - Flag state & registration
    flagState: string;             // * ISO 3166-1 alpha-3 (e.g., 'TUR', 'GRC')
    portOfRegistry: string;        // * Home port (e.g., 'Istanbul')
    registrationNumber: string;    // * National reg number (e.g., 'TR-IST-12345')

    // * REQUIRED - Classification
    vesselType: ShipType;          // * Ship type code
    aisClass: AISClass;            // * AIS Class A or B

    // * REQUIRED - Dimensions
    length: number;                // * Overall length (meters)
    beam: number;                  // * Beam (meters)
    draft: number;                 // * Draft (meters)
    height?: number;               // Height above waterline (meters)

    // Optional - Tonnage
    grossTonnage?: number;         // GT (required if >100)
    netTonnage?: number;           // NT
    deadweight?: number;           // DWT (cargo capacity)

    // * REQUIRED - Dates
    builtYear: number;             // Year of construction
    registrationDate: Date;        // Registration date
    aisTransponderInstalled: Date; // AIS installation date

    // * REQUIRED - Compliance
    solasCompliant: boolean;       // SOLAS convention (mandatory >300 GT)
    ispaCompliant?: boolean;       // ISPS code
    marsecLevel?: 1 | 2 | 3;       // Maritime Security Level
  };

  /**
   * === CERTIFICATES & DOCUMENTS ===
   */
  certificates: {
    // Seaworthiness Certificate
    seaworthiness: {
      documentNumber: string;
      issueDate: Date;
      expiryDate: Date;
      issuedBy: string;             // e.g., 'Turkish Maritime Administration'
      fileUrl?: string;             // PDF/scan
    };

    // Registration Certificate (Ruhsat)
    registration: {
      ruhsatNo: string;             // * REQUIRED for Turkish vessels
      issueDate: Date;
      vesselType: 'Ticari' | 'Turizm' | 'Özel';
      ownerName: string;
      ownerTC_Passport: string;
      fileUrl?: string;
    };

    // Insurance (REQUIRED)
    insurance: {
      company: string;              // * Insurance company
      policyNumber: string;         // * Policy number
      coverageType: 'Hull & Machinery' | 'P&I' | 'Comprehensive';
      coverageAmount: number;
      currency: string;
      startDate: Date;
      expiryDate: Date;
      deductible: number;
      contactEmergency: string;     // 24/7 emergency contact
      fileUrl?: string;
    };

    // MARPOL (Environmental)
    marpol?: {
      annexI_OilPollution: boolean;
      annexIV_Sewage: boolean;
      annexV_Garbage: boolean;
      certificateNumber: string;
      expiryDate: Date;
      fileUrl?: string;
    };

    // Safety Certificate
    safety: {
      lifeRaftCertified: boolean;
      lifeRaftExpiry: Date;
      lifeRaftCapacity: number;
      lifeJacketsCount: number;

      fireExtinguishers: Array<{
        type: 'CO2' | 'Foam' | 'Powder' | 'Water';
        location: string;
        lastInspection: Date;
        nextInspection: Date;
      }>;

      flares: Array<{
        type: 'Parachute' | 'Hand' | 'Smoke';
        quantity: number;
        expiryDate: Date;
      }>;

      epirb?: {
        registered: boolean;
        mmsi: string;
        batteryExpiry: Date;
        testDate: Date;
      };
    };

    // Radio License
    radio: {
      licenseNumber: string;
      callSign: string;             // Same as legalIdentity.callSign
      issueDate: Date;
      expiryDate: Date;
      equipment: string[];          // ['VHF', 'AIS', 'EPIRB', 'SART']
      fileUrl?: string;
    };

    // Taxes
    taxes: {
      annualTax: {
        amount: number;
        currency: string;
        dueDate: Date;
        paid: boolean;
        receiptNumber?: string;
      };
    };

    // Turkey-specific: Mavi Kart (Blue Card)
    maviKart?: {
      cardNumber: string;
      holderName: string;
      holderTC: string;
      issueDate: Date;
      expiryDate: Date;
      fileUrl?: string;
    };

    // Greece-specific: Deka Tax
    dekaTax?: {
      paid: boolean;
      amount: number;
      validFrom: Date;
      validUntil: Date;
      receiptNumber: string;
      fileUrl?: string;
    };
  };

  /**
   * === VESSEL SPECIFICATIONS ===
   */
  specifications: {
    // Manufacturer info
    manufacturer: string;           // e.g., 'Beneteau'
    model: string;                  // e.g., 'Oceanis 51.1'
    hullNumber: string;             // HIN (Hull Identification Number)

    // Hull
    hullType: 'Monohull' | 'Catamaran' | 'Trimaran' | 'Motor Yacht';
    hullMaterial: 'Fiberglass' | 'Aluminum' | 'Steel' | 'Carbon' | 'Wood';
    keel: 'Fin' | 'Wing' | 'Bilge' | 'Centerboard' | 'None';

    // Propulsion
    propulsion: 'Sail' | 'Motor' | 'Sail + Motor';

    engines?: Array<{
      position: 'Port' | 'Starboard' | 'Main' | 'Center';
      make: string;               // e.g., 'Yanmar'
      model: string;              // e.g., '4JH57'
      serialNumber: string;
      horsePower: number;
      fuelType: 'Diesel' | 'Gasoline' | 'Electric' | 'Hybrid';
      year: number;
      hoursAtPurchase: number;
      currentHours: number;
    }>;

    generator?: {
      make: string;
      model: string;
      kw: number;
      hoursAtPurchase: number;
      currentHours: number;
    };

    // Tanks
    tanks: {
      freshWater: {
        capacity: number;           // liters
        tankCount: number;
        locations: string[];        // ['Forward', 'Aft']
      };

      fuel: {
        capacity: number;           // liters
        fuelType: 'Diesel' | 'Gasoline';
        tankCount: number;
        locations: string[];
      };

      blackWater: {
        capacity: number;           // liters
        holdingTank: boolean;
        pumpOut: boolean;
      };

      greyWater?: {
        capacity: number;
        separateSystem: boolean;
      };

      lpg?: {
        capacity: number;           // kg
        bottleCount: number;
      };
    };

    // Sailing equipment (for sailboats)
    sailing?: {
      sails: Array<{
        type: 'Main' | 'Genoa' | 'Jib' | 'Spinnaker' | 'Gennaker' | 'Storm Jib' | 'Code Zero';
        manufacturer: string;
        material: 'Dacron' | 'Mylar' | 'Carbon' | 'Kevlar';
        area: number;               // m²
        year: number;
        condition: 'New' | 'Excellent' | 'Good' | 'Fair' | 'Replace';
      }>;

      mast: {
        material: 'Aluminum' | 'Carbon';
        height: number;             // meters above waterline
      };

      rigging: {
        standingRiggingMaterial: 'Stainless Steel' | 'Rod Rigging';
        lastReplacementDate: Date;
        nextInspectionDue: Date;
      };
    };

    // Anchor system
    anchoring: {
      primary: {
        type: 'CQR' | 'Bruce' | 'Rocna' | 'Delta' | 'Danforth' | 'Spade' | 'Ultra';
        weight: number;             // kg
        chain: {
          length: number;           // meters
          diameter: number;         // mm
          material: 'Galvanized' | 'Stainless';
          marked: boolean;          // Color-coded every 5m
        };
      };

      secondary?: {
        type: string;
        weight: number;
        chain_rope: string;
      };

      windlass: {
        make: string;
        model: string;
        motorType: 'Electric' | 'Hydraulic' | 'Manual';
        controlLocation: string[];  // ['Helm', 'Bow']
      };
    };

    // Electronics & Navigation
    electronics: {
      chartplotter?: Array<{
        make: string;
        model: string;
        screenSize: number;         // inches
        location: string;
      }>;

      radar?: {
        make: string;
        model: string;
        range: number;              // nautical miles
      };

      autopilot?: {
        make: string;
        model: string;
        type: 'Wheel' | 'Tiller' | 'Hydraulic';
      };

      vhf: Array<{
        make: string;
        model: string;
        dsc: boolean;               // Digital Selective Calling
        location: string;
      }>;

      ais: {
        make: string;
        model: string;
        class: 'A' | 'B';
        mmsi: string;               // Same as legalIdentity.mmsi
      };

      gps: Array<{
        make: string;
        model: string;
        location: string;
      }>;

      depthSounder: {
        make: string;
        transducerType: 'Through-hull' | 'Transom';
      };

      windInstrument: {
        make: string;
        masthead: boolean;
      };

      nmea: {
        nmea2000: boolean;
        nmea0183: boolean;
        backbone: string;           // 'SimNet', 'SeaTalk NG', etc.
      };
    };

    // Electrical
    electrical: {
      batteries: Array<{
        bank: 'House' | 'Engine Start' | 'Bow Thruster';
        type: 'AGM' | 'Lithium' | 'Lead Acid' | 'Gel';
        voltage: 12 | 24 | 48;
        capacity: number;           // Ah
        quantity: number;
        installDate: Date;
      }>;

      solarPanels?: {
        totalWatts: number;
        panelCount: number;
        controller: string;
      };

      windGenerator?: {
        make: string;
        watts: number;
      };

      inverter?: {
        make: string;
        watts: number;
        voltage: string;            // '12V to 220V'
      };

      shorepower: {
        voltage: 220 | 110;
        amperage: number;
        inlets: number;
      };
    };

    // Accommodations
    accommodations: {
      cabins: number;
      berths: number;
      heads: number;
      showers: number;
    };
  };

  /**
   * === OWNERSHIP & HISTORY ===
   */
  ownership: {
    currentOwner: {
      name: string;
      tc_passport: string;
      email: string;
      phone: string;
      address: string;
      since: Date;
    };

    purchaseInfo: {
      purchaseDate: Date;
      purchasePrice: number;
      currency: string;
      broker?: string;
      survey: {
        surveyDate: Date;
        surveyor: string;
        valuation: number;
        fileUrl?: string;
      };
    };

    // Previous owners (for vessel history)
    previousOwners?: Array<{
      name: string;
      period: { from: Date; to: Date };
      notes?: string;
    }>;
  };

  /**
   * === HOME PORT & BASE ===
   */
  homePort: {
    marina: string;               // e.g., 'Milta Bodrum Marina'
    berth?: string;               // Berth number
    country: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };

    contract?: {
      type: 'Annual' | 'Seasonal' | 'Monthly';
      startDate: Date;
      endDate: Date;
      cost: number;
      currency: string;
    };
  };

  /**
   * === CREW (Optional) ===
   */
  crew?: Array<{
    name: string;
    role: 'Captain' | 'First Mate' | 'Engineer' | 'Chef' | 'Deckhand' | 'Steward/ess';
    passport: string;
    nationality: string;

    certificates?: {
      stcw?: {
        number: string;
        expiryDate: Date;
      };

      yachtmasterLicense?: {
        type: string;
        number: string;
        expiryDate: Date;
      };

      medical?: {
        type: string;
        expiryDate: Date;
      };
    };

    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
    };
  }>;

  /**
   * === MAINTENANCE SCHEDULE ===
   * Pre-configured maintenance intervals
   */
  maintenanceSchedule: {
    // Engine maintenance
    engineMaintenance: Array<{
      engineName: string;           // 'Port Engine', 'Starboard Engine'
      schedule: Array<{
        task: string;               // 'Oil Change', 'Impeller', 'Belt'
        intervalHours: number;      // Every X engine hours
        lastDone?: Date;
        lastDoneHours?: number;
        nextDueHours: number;
      }>;
    }>;

    // Annual maintenance
    annualTasks: Array<{
      task: string;                 // 'Antifouling', 'Anodes', 'Through-hulls'
      season: 'Spring' | 'Fall' | 'Any';
      lastDone?: Date;
      nextDue: Date;
      estimatedCost: number;
    }>;

    // Periodic inspections
    inspections: Array<{
      item: string;                 // 'Standing Rigging', 'Through-hulls', 'Seacocks'
      intervalYears: number;
      lastInspection?: Date;
      nextInspection: Date;
    }>;
  };

  /**
   * === SPARE PARTS INVENTORY ===
   * Critical spares kept onboard
   */
  sparePartsInventory?: Array<{
    category: 'Engine' | 'Electrical' | 'Plumbing' | 'Sailing' | 'Safety';
    item: string;
    partNumber: string;
    manufacturer: string;
    quantity: number;
    location: string;               // Where stored onboard
    cost: number;
    supplier: string;
    supplierContact: string;
  }>;

  /**
   * === INSURANCE CLAIMS HISTORY ===
   */
  insuranceHistory?: Array<{
    date: Date;
    type: 'Grounding' | 'Collision' | 'Storm Damage' | 'Theft' | 'Fire' | 'Mechanical';
    description: string;
    claimAmount: number;
    paidAmount: number;
    settled: boolean;
    settledDate?: Date;
  }>;

  /**
   * === PROVISIONING PREFERENCES ===
   * For galley management
   */
  provisioningPreferences?: {
    defaultCuisine: string[];       // ['Mediterranean', 'Turkish', 'International']
    dietaryRestrictions: string[];  // ['Vegetarian', 'Halal', 'Gluten-Free']
    alcoholOnboard: boolean;

    suppliers: Array<{
      category: 'Fresh Produce' | 'Meat' | 'Seafood' | 'Dry Goods' | 'Beverages';
      supplierName: string;
      contact: string;
      location: string;
    }>;
  };

  /**
   * === EMERGENCY CONTACTS ===
   */
  emergencyContacts: {
    owner: {
      name: string;
      phone: string;
      email: string;
    };

    localContacts: Array<{
      name: string;
      relationship: string;         // 'Marina Manager', 'Local Agent', 'Mechanic'
      phone: string;
      email: string;
      location: string;
    }>;

    // Country-specific emergency numbers
    emergencyNumbers: {
      coastGuard: string;           // Turkey: '158', Greece: '108'
      police: string;
      medical: string;
      marinaSecurity?: string;
    };

    // Service providers
    serviceProviders: {
      mechanic?: {
        name: string;
        phone: string;
        specialty: string;
      };

      rigger?: {
        name: string;
        phone: string;
      };

      electronics?: {
        name: string;
        phone: string;
      };

      sailmaker?: {
        name: string;
        phone: string;
      };
    };
  };

  /**
   * === CUSTOM FIELDS ===
   * Tenant-specific additional data
   */
  customFields?: Record<string, any>;
}

/**
 * Validation status for onboarding
 */
export interface OnboardingValidation {
  complete: boolean;
  missingRequired: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Vessel instance configuration
 * Generated after onboarding is complete
 */
export interface VesselInstance {
  tenantId: string;                 // e.g., 'beneteau-oceanis-51-271001234'
  displayName: string;              // e.g., 'My Yacht Name'
  mmsi: string;                     // Primary identifier

  onboardingData: VesselOnboardingTemplate;

  // System metadata
  createdAt: Date;
  createdBy: string;
  lastUpdated: Date;
  status: 'Active' | 'Inactive' | 'Maintenance' | 'Decommissioned';

  // Ada.Sea node ID
  nodeId: string;                   // Format: ada.sea.<tenantId>
}
