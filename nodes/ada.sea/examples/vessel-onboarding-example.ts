/**
 * Vessel Onboarding Example
 *
 * This example shows how to create a new Ada.Sea vessel instance
 * using the onboarding wizard.
 *
 * SCENARIO: Onboarding a Beneteau Oceanis 51.1 sailing yacht
 * Based in Bodrum, Turkey
 */

import { VesselOnboardingWizard } from '../services/VesselOnboardingWizard.js';
import { ShipType, AISClass } from '../types/AISTypes.js';

// Create onboarding wizard
const wizard = new VesselOnboardingWizard();

// Listen to events
wizard.on('onboarding:started', () => {
  console.log('🚀 Vessel onboarding started');
});

wizard.on('step:changed', (step) => {
  console.log(`📋 Step ${step.id}: ${step.title}`);
});

wizard.on('step:completed', (step) => {
  console.log(`✅ Step completed: ${step.title}`);
});

wizard.on('instance:created', (instance) => {
  console.log(`🎉 Vessel instance created: ${instance.nodeId}`);
  console.log(`   Display Name: ${instance.displayName}`);
  console.log(`   MMSI: ${instance.mmsi}`);
  console.log(`   Tenant ID: ${instance.tenantId}`);
});

// Start onboarding
wizard.start();

console.log('Progress:', wizard.getProgress() + '%');

// ===================================
// STEP 1: LEGAL IDENTITY
// ===================================
console.log('\n=== STEP 1: Legal Identity ===');

wizard.updateStepData('legal-identity', {
  legalIdentity: {
    // PRIMARY IDENTIFIERS (Replace with YOUR vessel's real data!)
    mmsi: '271001234',              // ⚠️ MUST be your real MMSI from Kıyı Emniyeti
    imo: 'IMO9876543',              // ⚠️ MUST be your real IMO number
    callSign: 'TCAB1234',           // ⚠️ Your radio call sign
    vesselName: 'BLUE HORIZON',     // Official registered name

    // FLAG STATE & REGISTRATION
    flagState: 'TUR',               // Turkey
    portOfRegistry: 'Bodrum',
    registrationNumber: 'TR-MGL-2023-001',

    // CLASSIFICATION
    vesselType: ShipType.Sailing,
    aisClass: AISClass.ClassB,

    // DIMENSIONS
    length: 15.94,                  // meters
    beam: 4.80,                     // meters
    draft: 2.38,                    // meters
    height: 22.5,                   // meters from waterline

    // TONNAGE
    grossTonnage: 28,
    netTonnage: 20,

    // DATES
    builtYear: 2019,
    registrationDate: new Date('2020-03-15'),
    aisTransponderInstalled: new Date('2020-04-01'),

    // COMPLIANCE
    solasCompliant: false,          // < 300 GT
    marsecLevel: 1,
  },
});

// Validate step
const step1Validation = wizard.validateStep('legal-identity');
console.log('Validation:', step1Validation);

// Move to next step
wizard.nextStep();
console.log('Progress:', wizard.getProgress() + '%');

// ===================================
// STEP 2: CERTIFICATES
// ===================================
console.log('\n=== STEP 2: Certificates ===');

wizard.updateStepData('certificates', {
  certificates: {
    // SEAWORTHINESS
    seaworthiness: {
      documentNumber: 'SW-2020-12345',
      issueDate: new Date('2020-03-15'),
      expiryDate: new Date('2025-03-15'),
      issuedBy: 'Turkish Maritime Administration',
    },

    // REGISTRATION (Ruhsat)
    registration: {
      ruhsatNo: 'MGL-2023-001',
      issueDate: new Date('2020-03-15'),
      vesselType: 'Özel',           // Private yacht
      ownerName: 'Ahmet Yılmaz',
      ownerTC_Passport: '12345678901',
    },

    // INSURANCE (REQUIRED!)
    insurance: {
      company: 'Anadolu Sigorta',
      policyNumber: 'POL-2024-999888',
      coverageType: 'Comprehensive',
      coverageAmount: 500000,
      currency: 'EUR',
      startDate: new Date('2024-01-01'),
      expiryDate: new Date('2025-01-01'),
      deductible: 5000,
      contactEmergency: '+90 850 123 4567',
    },

    // SAFETY
    safety: {
      lifeRaftCertified: true,
      lifeRaftExpiry: new Date('2025-06-01'),
      lifeRaftCapacity: 8,
      lifeJacketsCount: 12,

      fireExtinguishers: [
        {
          type: 'CO2',
          location: 'Galley',
          lastInspection: new Date('2024-01-15'),
          nextInspection: new Date('2025-01-15'),
        },
        {
          type: 'Powder',
          location: 'Engine Room',
          lastInspection: new Date('2024-01-15'),
          nextInspection: new Date('2025-01-15'),
        },
      ],

      flares: [
        { type: 'Parachute', quantity: 4, expiryDate: new Date('2026-12-31') },
        { type: 'Hand', quantity: 6, expiryDate: new Date('2026-12-31') },
        { type: 'Smoke', quantity: 2, expiryDate: new Date('2026-12-31') },
      ],

      epirb: {
        registered: true,
        mmsi: '271001234',
        batteryExpiry: new Date('2027-01-01'),
        testDate: new Date('2024-01-15'),
      },
    },

    // RADIO LICENSE
    radio: {
      licenseNumber: 'RL-2020-54321',
      callSign: 'TCAB1234',
      issueDate: new Date('2020-04-01'),
      expiryDate: new Date('2030-04-01'),
      equipment: ['VHF', 'AIS', 'EPIRB'],
    },

    // TAXES
    taxes: {
      annualTax: {
        amount: 2500,
        currency: 'TRY',
        dueDate: new Date('2025-01-31'),
        paid: true,
        receiptNumber: 'TAX-2024-12345',
      },
    },

    // MAVI KART (Turkish Blue Card)
    maviKart: {
      cardNumber: 'MK-2020-99999',
      holderName: 'Ahmet Yılmaz',
      holderTC: '12345678901',
      issueDate: new Date('2020-05-01'),
      expiryDate: new Date('2030-05-01'),
    },
  },
});

wizard.nextStep();
console.log('Progress:', wizard.getProgress() + '%');

// ===================================
// STEP 3: SPECIFICATIONS
// ===================================
console.log('\n=== STEP 3: Specifications ===');

wizard.updateStepData('specifications', {
  specifications: {
    // MANUFACTURER
    manufacturer: 'Beneteau',
    model: 'Oceanis 51.1',
    hullNumber: 'BEN51-1234',

    // HULL
    hullType: 'Monohull',
    hullMaterial: 'Fiberglass',
    keel: 'Fin',

    // PROPULSION
    propulsion: 'Sail + Motor',

    // ENGINES
    engines: [
      {
        position: 'Main',
        make: 'Yanmar',
        model: '4JH57',
        serialNumber: 'YAN-4JH57-98765',
        horsePower: 57,
        fuelType: 'Diesel',
        year: 2019,
        hoursAtPurchase: 0,
        currentHours: 450,
      },
    ],

    // TANKS
    tanks: {
      freshWater: {
        capacity: 730,              // liters
        tankCount: 2,
        locations: ['Forward', 'Aft'],
      },

      fuel: {
        capacity: 200,
        fuelType: 'Diesel',
        tankCount: 1,
        locations: ['Main'],
      },

      blackWater: {
        capacity: 150,
        holdingTank: true,
        pumpOut: true,
      },

      greyWater: {
        capacity: 100,
        separateSystem: false,
      },
    },

    // SAILING EQUIPMENT
    sailing: {
      sails: [
        {
          type: 'Main',
          manufacturer: 'Quantum Sails',
          material: 'Dacron',
          area: 65,                 // m²
          year: 2019,
          condition: 'Excellent',
        },
        {
          type: 'Genoa',
          manufacturer: 'Quantum Sails',
          material: 'Dacron',
          area: 55,
          year: 2019,
          condition: 'Excellent',
        },
        {
          type: 'Gennaker',
          manufacturer: 'Quantum Sails',
          material: 'Mylar',
          area: 95,
          year: 2020,
          condition: 'Good',
        },
      ],

      mast: {
        material: 'Aluminum',
        height: 21.5,               // meters
      },

      rigging: {
        standingRiggingMaterial: 'Stainless Steel',
        lastReplacementDate: new Date('2019-01-01'),
        nextInspectionDue: new Date('2029-01-01'),
      },
    },

    // ANCHORING
    anchoring: {
      primary: {
        type: 'Rocna',
        weight: 25,                 // kg
        chain: {
          length: 70,               // meters
          diameter: 10,             // mm
          material: 'Galvanized',
          marked: true,
        },
      },

      secondary: {
        type: 'Danforth',
        weight: 15,
        chain_rope: '10m chain + 50m rope',
      },

      windlass: {
        make: 'Lewmar',
        model: 'V5',
        motorType: 'Electric',
        controlLocation: ['Helm', 'Bow'],
      },
    },

    // ELECTRONICS
    electronics: {
      chartplotter: [
        {
          make: 'Raymarine',
          model: 'Axiom 12',
          screenSize: 12,
          location: 'Helm',
        },
      ],

      radar: {
        make: 'Raymarine',
        model: 'Quantum Q24C',
        range: 24,                  // nautical miles
      },

      autopilot: {
        make: 'Raymarine',
        model: 'Evolution ACU-400',
        type: 'Wheel',
      },

      vhf: [
        {
          make: 'Raymarine',
          model: 'Ray90',
          dsc: true,
          location: 'Helm',
        },
        {
          make: 'Standard Horizon',
          model: 'HX870',
          dsc: true,
          location: 'Portable',
        },
      ],

      ais: {
        make: 'Vesper Marine',
        model: 'XB-8000',
        class: 'B',
        mmsi: '271001234',
      },

      gps: [
        {
          make: 'Raymarine',
          model: 'Built-in',
          location: 'Helm',
        },
      ],

      depthSounder: {
        make: 'Raymarine',
        transducerType: 'Through-hull',
      },

      windInstrument: {
        make: 'Raymarine',
        masthead: true,
      },

      nmea: {
        nmea2000: true,
        nmea0183: true,
        backbone: 'SeaTalk NG',
      },
    },

    // ELECTRICAL
    electrical: {
      batteries: [
        {
          bank: 'House',
          type: 'Lithium',
          voltage: 12,
          capacity: 400,            // Ah
          quantity: 2,
          installDate: new Date('2022-06-01'),
        },
        {
          bank: 'Engine Start',
          type: 'AGM',
          voltage: 12,
          capacity: 120,
          quantity: 1,
          installDate: new Date('2020-03-01'),
        },
      ],

      solarPanels: {
        totalWatts: 600,
        panelCount: 3,
        controller: 'Victron SmartSolar MPPT 100/30',
      },

      inverter: {
        make: 'Victron',
        watts: 3000,
        voltage: '12V to 220V',
      },

      shorepower: {
        voltage: 220,
        amperage: 32,
        inlets: 1,
      },
    },

    // ACCOMMODATIONS
    accommodations: {
      cabins: 4,
      berths: 10,
      heads: 3,
      showers: 3,
    },
  },
});

wizard.nextStep();
console.log('Progress:', wizard.getProgress() + '%');

// ===================================
// STEP 4: OWNERSHIP
// ===================================
console.log('\n=== STEP 4: Ownership ===');

wizard.updateStepData('ownership', {
  ownership: {
    currentOwner: {
      name: 'Ahmet Yılmaz',
      tc_passport: '12345678901',
      email: 'ahmet@example.com',
      phone: '+90 532 123 4567',
      address: 'Istanbul, Turkey',
      since: new Date('2020-03-15'),
    },

    purchaseInfo: {
      purchaseDate: new Date('2020-03-15'),
      purchasePrice: 450000,
      currency: 'EUR',
      broker: 'Aegean Yacht Brokers',
      survey: {
        surveyDate: new Date('2020-02-20'),
        surveyor: 'Marine Survey International',
        valuation: 450000,
      },
    },
  },

  homePort: {
    marina: 'Milta Bodrum Marina',
    berth: 'A-45',
    country: 'Turkey',
    coordinates: {
      latitude: 37.0352,
      longitude: 27.4310,
    },

    contract: {
      type: 'Annual',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      cost: 15000,
      currency: 'EUR',
    },
  },
});

wizard.nextStep();
console.log('Progress:', wizard.getProgress() + '%');

// ===================================
// STEP 5: CREW (Optional)
// ===================================
console.log('\n=== STEP 5: Crew (Optional) ===');

wizard.updateStepData('crew', {
  crew: [
    {
      name: 'Ahmet Yılmaz',
      role: 'Captain',
      passport: 'U12345678',
      nationality: 'Turkish',

      certificates: {
        yachtmasterLicense: {
          type: 'Yachtmaster Offshore',
          number: 'YM-2015-12345',
          expiryDate: new Date('2030-12-31'),
        },

        medical: {
          type: 'ENG1',
          expiryDate: new Date('2026-06-30'),
        },
      },

      emergencyContact: {
        name: 'Ayşe Yılmaz',
        relationship: 'Spouse',
        phone: '+90 532 987 6543',
      },
    },
  ],
});

wizard.nextStep();
console.log('Progress:', wizard.getProgress() + '%');

// ===================================
// STEP 6: MAINTENANCE SCHEDULE
// ===================================
console.log('\n=== STEP 6: Maintenance Schedule ===');

wizard.updateStepData('maintenance', {
  maintenanceSchedule: {
    engineMaintenance: [
      {
        engineName: 'Main Engine (Yanmar 4JH57)',
        schedule: [
          {
            task: 'Oil Change',
            intervalHours: 100,
            lastDoneHours: 400,
            nextDueHours: 500,
          },
          {
            task: 'Oil Filter',
            intervalHours: 100,
            lastDoneHours: 400,
            nextDueHours: 500,
          },
          {
            task: 'Fuel Filter',
            intervalHours: 200,
            lastDoneHours: 400,
            nextDueHours: 600,
          },
          {
            task: 'Impeller',
            intervalHours: 200,
            lastDoneHours: 400,
            nextDueHours: 600,
          },
        ],
      },
    ],

    annualTasks: [
      {
        task: 'Antifouling',
        season: 'Spring',
        lastDone: new Date('2024-04-01'),
        nextDue: new Date('2025-04-01'),
        estimatedCost: 2000,
      },
      {
        task: 'Anodes Replacement',
        season: 'Spring',
        lastDone: new Date('2024-04-01'),
        nextDue: new Date('2025-04-01'),
        estimatedCost: 300,
      },
    ],

    inspections: [
      {
        item: 'Standing Rigging',
        intervalYears: 10,
        lastInspection: new Date('2020-01-01'),
        nextInspection: new Date('2030-01-01'),
      },
      {
        item: 'Through-hulls & Seacocks',
        intervalYears: 5,
        lastInspection: new Date('2020-01-01'),
        nextInspection: new Date('2025-01-01'),
      },
    ],
  },
});

wizard.nextStep();
console.log('Progress:', wizard.getProgress() + '%');

// ===================================
// STEP 7: EMERGENCY CONTACTS
// ===================================
console.log('\n=== STEP 7: Emergency Contacts ===');

wizard.updateStepData('emergency', {
  emergencyContacts: {
    owner: {
      name: 'Ahmet Yılmaz',
      phone: '+90 532 123 4567',
      email: 'ahmet@example.com',
    },

    localContacts: [
      {
        name: 'Milta Bodrum Marina',
        relationship: 'Marina Manager',
        phone: '+90 252 316 1860',
        email: 'info@miltabodrum.com',
        location: 'Bodrum',
      },
    ],

    emergencyNumbers: {
      coastGuard: '158',
      police: '155',
      medical: '112',
      marinaSecurity: '+90 252 316 1860',
    },

    serviceProviders: {
      mechanic: {
        name: 'Bodrum Marine Services',
        phone: '+90 532 999 8888',
        specialty: 'Yanmar engines',
      },

      electronics: {
        name: 'Raymarine Turkey',
        phone: '+90 216 123 4567',
      },

      sailmaker: {
        name: 'Quantum Sails Turkey',
        phone: '+90 252 777 6666',
      },
    },
  },
});

wizard.nextStep();
console.log('Progress:', wizard.getProgress() + '%');

// ===================================
// STEP 8: REVIEW & CREATE INSTANCE
// ===================================
console.log('\n=== STEP 8: Review & Create Instance ===');

// Final validation
const finalValidation = wizard.validateAll();
console.log('\n📊 Final Validation:');
console.log('Complete:', finalValidation.complete);
console.log('Errors:', finalValidation.errors);
console.log('Missing:', finalValidation.missingRequired);
console.log('Warnings:', finalValidation.warnings);

if (finalValidation.complete) {
  console.log('\n✅ All validation passed!');
  console.log('Creating vessel instance...');

  // Create instance
  const instance = await wizard.createVesselInstance();

  console.log('\n🎉 SUCCESS!');
  console.log('Vessel instance created:');
  console.log(`   Node ID: ${instance.nodeId}`);
  console.log(`   Tenant ID: ${instance.tenantId}`);
  console.log(`   Display Name: ${instance.displayName}`);
  console.log(`   MMSI: ${instance.mmsi}`);
  console.log(`   Status: ${instance.status}`);

  // Export data
  console.log('\n📄 Exporting vessel data...');
  const exported = wizard.exportData();
  console.log('Data exported to JSON (first 500 chars):');
  console.log(exported.substring(0, 500) + '...');

  console.log('\n✅ Vessel onboarding complete!');
  console.log(`   You can now use: ada.sea.${instance.tenantId}`);
} else {
  console.log('\n❌ Validation failed!');
  console.log('Please fix the following issues:');
  finalValidation.errors.forEach((err) => console.log(`   - ${err}`));
  finalValidation.missingRequired.forEach((miss) => console.log(`   - Missing: ${miss}`));
}
