/**
 * Comprehensive ada.passkit Usage Examples
 *
 * Demonstrates pass generation for all domains:
 * - ada.congress: Conference badges, speaker passes
 * - ada.travel: Boarding passes, hotel vouchers
 * - ada.sea: Yacht boarding, marina access
 * - ada.interpreter: Language selection passes
 * - ada.restaurant: Dining reservations
 */

import { PassKitNode } from '../PassKitNode.js';
import {
  PassDomain,
  PassType,
  CreatePassRequest,
} from '../types/PassTypes.js';

async function main() {
  console.log('🎫 Ada.PassKit - Comprehensive Usage Examples\n');
  console.log('='.repeat(80) + '\n');

  // ========================================================================
  // INITIALIZE PASSKIT NODE
  // ========================================================================

  const passKit = new PassKitNode({
    name: 'Universal PassKit Service',
    organizationInfo: {
      name: 'Ada Ecosystem',
      organizationId: 'com.ada.ecosystem',
      domains: [
        'ada.congress',
        'ada.travel',
        'ada.sea',
        'ada.marina',
        'ada.interpreter',
        'ada.restaurant',
      ],
    },
    storage: {
      provider: 's3',
      config: {
        bucket: 'ada-passes',
        region: 'us-west-2',
      },
    },
    walletIntegration: {
      appleWallet: {
        teamId: 'ABC123',
        passTypeId: 'pass.com.ada.universal',
      },
      googleWallet: {
        issuerId: 'ada-ecosystem-issuer',
      },
    },
    security: {
      enableSignatures: true,
      signingKey: process.env.PASSKIT_SIGNING_KEY || 'demo-key',
    },
  });

  await passKit.start();
  console.log('✅ PassKit node initialized\n');

  // ========================================================================
  // EXAMPLE 1: CONGRESS BADGE (ada.congress)
  // ========================================================================

  console.log('📋 EXAMPLE 1: Congress Conference Badge\n');

  const congressBadge = await passKit.processTask({
    type: 'create-pass',
    data: {
      domain: 'ada.congress' as PassDomain,
      passType: 'CONGRESS_BADGE' as PassType,
      holder: {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@university.edu',
        role: 'Keynote Speaker',
        company: 'Stanford University',
        customFields: {
          badge: 'SPEAKER',
          track: 'AI & Machine Learning',
          sessionSlots: ['Day1-Morning', 'Day2-Afternoon'],
        },
      },
      validity: {
        validFrom: new Date('2025-06-01T08:00:00Z'),
        validTo: new Date('2025-06-03T20:00:00Z'),
        timezone: 'America/Los_Angeles',
        allowedDays: ['thursday', 'friday', 'saturday'],
        allowedTimeRanges: [
          { start: '08:00', end: '20:00' },
        ],
      },
      zones: [
        {
          id: 'main-hall',
          name: 'Main Conference Hall',
          description: 'Keynote and plenary sessions',
          seatInfo: {
            section: 'VIP',
            row: 'A',
            seat: '12',
            seatType: 'premium',
            floor: 'Ground Floor',
            gate: 'Main Entrance',
          },
        },
        {
          id: 'speaker-lounge',
          name: 'Speaker Lounge',
          description: 'Exclusive lounge for speakers',
          restrictions: {
            requiresEscort: false,
            maxOccupancy: 50,
          },
        },
        {
          id: 'vip-dinner',
          name: 'VIP Gala Dinner',
          description: 'Evening gala dinner',
          seatInfo: {
            table: 'Table 5',
            seat: 'Seat 3',
            seatType: 'vip',
            tableType: 'round',
            tableCapacity: 10,
            guestType: 'speaker',
            meal: 'vegetarian',
          },
          restrictions: {
            requiresPreAuth: true,
          },
        },
      ],
      branding: {
        primaryColor: '#1E3A8A',
        secondaryColor: '#FFFFFF',
        backgroundColor: '#1E3A8A',
        textColor: '#FFFFFF',
        logoUrl: 'https://ada-congress.com/logo.png',
        template: 'luxury',
      },
      metadata: {
        eventName: 'Ada AI Summit 2025',
        eventId: 'ada-summit-2025',
        registrationId: 'REG-12345',
      },
      generateQR: true,
      generateAppleWallet: true,
      generateGoogleWallet: true,
      generatePDF: true,
    } as CreatePassRequest,
  });

  console.log('✅ Congress badge created:');
  console.log(`   Pass ID: ${congressBadge.passId}`);
  console.log(`   Holder: ${congressBadge.holder.name} (${congressBadge.holder.role})`);
  console.log(`   Zones: ${congressBadge.zones.length} authorized zones`);
  console.log(`   Apple Wallet: ${congressBadge.appleWalletUrl}`);
  console.log();

  // ========================================================================
  // EXAMPLE 2: BOARDING PASS (ada.travel)
  // ========================================================================

  console.log('✈️  EXAMPLE 2: Flight Boarding Pass\n');

  const boardingPass = await passKit.processTask({
    type: 'create-pass',
    data: {
      domain: 'ada.travel' as PassDomain,
      passType: 'BOARDING_PASS' as PassType,
      holder: {
        name: 'Michael Chen',
        email: 'michael.chen@email.com',
        customFields: {
          ticketNumber: '1762384950123', // 13-digit e-ticket number
          pnr: 'ABC123',
          confirmationCode: 'ABC123',
          frequent_flyer: 'TK1234567',
          tier: 'Gold',
        },
      },
      validity: {
        validFrom: new Date('2025-07-15T06:00:00Z'),
        validTo: new Date('2025-07-15T14:00:00Z'),
        singleUse: false,
        maxScans: 3, // Security, gate, boarding
      },
      zones: [
        {
          id: 'security-checkpoint',
          name: 'Security Checkpoint',
        },
        {
          id: 'gate-b12',
          name: 'Gate B12',
          seatInfo: {
            gate: 'B12',
            entrance: 'Terminal 1, West Wing',
          },
          restrictions: {
            maxOccupancy: 200,
          },
        },
        {
          id: 'aircraft-tk1234',
          name: 'Aircraft TK1234',
          seatInfo: {
            class: 'business',
            section: 'Business Class',
            row: '12',
            seat: 'A',
            seatPosition: 'window',
            seatType: 'business',
          },
        },
      ],
      branding: {
        primaryColor: '#C70039',
        backgroundColor: '#C70039',
        textColor: '#FFFFFF',
        logoUrl: 'https://airline.com/logo.png',
        organizationName: 'Turkish Airlines',
        template: 'modern',
      },
      metadata: {
        flightNumber: 'TK1234',
        ticketNumber: '1762384950123',
        pnr: 'ABC123',
        departure: 'IST',
        arrival: 'JFK',
        departureTime: '2025-07-15T10:30:00Z',
        arrivalTime: '2025-07-15T13:45:00Z',
        seat: '12A',
        gate: 'B12',
        carrier: 'Turkish Airlines',
        operatedBy: 'Turkish Airlines',
      },
      generateQR: true,
      generateAppleWallet: true,
      generateGoogleWallet: true,
    } as CreatePassRequest,
  });

  console.log('✅ Boarding pass created (Business Class):');
  console.log(`   Pass ID: ${boardingPass.passId}`);
  console.log(`   E-Ticket: ${boardingPass.metadata?.ticketNumber}`);
  console.log(`   Flight: ${boardingPass.metadata?.flightNumber} - ${boardingPass.metadata?.carrier}`);
  console.log(`   Route: ${boardingPass.metadata?.departure} → ${boardingPass.metadata?.arrival}`);
  console.log(`   Class: Business, Seat: ${boardingPass.metadata?.seat} (Window), Gate: ${boardingPass.metadata?.gate}`);
  console.log(`   PNR: ${boardingPass.metadata?.pnr}`);
  console.log();

  // ========================================================================
  // EXAMPLE 2B: ECONOMY CLASS BOARDING PASS
  // ========================================================================

  console.log('✈️  EXAMPLE 2B: Economy Class Boarding Pass\n');

  const economyBoardingPass = await passKit.processTask({
    type: 'create-pass',
    data: {
      domain: 'ada.travel' as PassDomain,
      passType: 'BOARDING_PASS' as PassType,
      holder: {
        name: 'Lisa Martinez',
        email: 'lisa.martinez@email.com',
        customFields: {
          ticketNumber: '1769876543210',
          pnr: 'XYZ789',
          confirmationCode: 'XYZ789',
          frequent_flyer: null,
        },
      },
      validity: {
        validFrom: new Date('2025-08-10T04:00:00Z'),
        validTo: new Date('2025-08-10T12:00:00Z'),
        singleUse: false,
        maxScans: 3,
      },
      zones: [
        {
          id: 'security-checkpoint',
          name: 'Security Checkpoint',
        },
        {
          id: 'gate-c45',
          name: 'Gate C45',
          seatInfo: {
            gate: 'C45',
            entrance: 'Terminal 2, East Wing',
          },
        },
        {
          id: 'aircraft-aa456',
          name: 'Aircraft AA456',
          seatInfo: {
            class: 'economy',
            section: 'Economy',
            row: '28',
            seat: 'B',
            seatPosition: 'middle',
            seatType: 'economy',
          },
        },
      ],
      branding: {
        primaryColor: '#0078D2',
        backgroundColor: '#0078D2',
        textColor: '#FFFFFF',
        logoUrl: 'https://airline.com/logo.png',
        organizationName: 'American Airlines',
        template: 'modern',
      },
      metadata: {
        flightNumber: 'AA456',
        ticketNumber: '1769876543210',
        pnr: 'XYZ789',
        departure: 'LAX',
        arrival: 'ORD',
        departureTime: '2025-08-10T08:15:00Z',
        arrivalTime: '2025-08-10T11:30:00Z',
        seat: '28B',
        gate: 'C45',
        boardingGroup: '4',
        carrier: 'American Airlines',
        operatedBy: 'American Airlines',
        sequenceNumber: '0058',
      },
      generateQR: true,
      generateAppleWallet: true,
    } as CreatePassRequest,
  });

  console.log('✅ Boarding pass created (Economy Class):');
  console.log(`   Pass ID: ${economyBoardingPass.passId}`);
  console.log(`   E-Ticket: ${economyBoardingPass.metadata?.ticketNumber}`);
  console.log(`   Flight: ${economyBoardingPass.metadata?.flightNumber} - ${economyBoardingPass.metadata?.carrier}`);
  console.log(`   Route: ${economyBoardingPass.metadata?.departure} → ${economyBoardingPass.metadata?.arrival}`);
  console.log(`   Class: Economy, Seat: ${economyBoardingPass.metadata?.seat} (Middle), Gate: ${economyBoardingPass.metadata?.gate}`);
  console.log(`   PNR: ${economyBoardingPass.metadata?.pnr}, Boarding Group: ${economyBoardingPass.metadata?.boardingGroup}`);
  console.log(`   Sequence: ${economyBoardingPass.metadata?.sequenceNumber}`);
  console.log();

  // ========================================================================
  // EXAMPLE 3: YACHT BOARDING (ada.sea / ada.marina)
  // ========================================================================

  console.log('⛵ EXAMPLE 3: Yacht Boarding Pass\n');

  const yachtPass = await passKit.processTask({
    type: 'create-pass',
    data: {
      domain: 'ada.sea' as PassDomain,
      passType: 'YACHT_BOARDING' as PassType,
      holder: {
        name: 'Elena Rodriguez',
        email: 'elena.rodriguez@email.com',
        phone: '+1-555-0123',
        customFields: {
          guestOf: 'Captain Smith',
          cruisePackage: 'Premium Sunset Tour',
        },
      },
      validity: {
        validFrom: new Date('2025-08-20T16:00:00Z'),
        validTo: new Date('2025-08-20T21:00:00Z'),
        allowedTimeRanges: [
          { start: '16:00', end: '21:00' },
        ],
      },
      zones: [
        {
          id: 'marina-gate',
          name: 'Marina Entrance Gate',
        },
        {
          id: 'pier-7',
          name: 'Pier 7',
        },
        {
          id: 'yacht-aurora',
          name: 'Yacht Aurora',
          description: '85ft luxury yacht',
          restrictions: {
            maxOccupancy: 12,
          },
        },
        {
          id: 'vip-deck',
          name: 'VIP Upper Deck',
          restrictions: {
            requiresEscort: true,
            maxOccupancy: 6,
          },
        },
      ],
      branding: {
        primaryColor: '#0077BE',
        backgroundColor: '#0077BE',
        textColor: '#FFFFFF',
        logoUrl: 'https://ada-marina.com/logo.png',
        organizationName: 'Ada Marina Services',
        template: 'luxury',
      },
      metadata: {
        yachtName: 'Aurora',
        cruiseType: 'Sunset Tour',
        departureTime: '17:00',
        returnTime: '21:00',
        pierId: 'Pier-7',
      },
      generateQR: true,
      generateAppleWallet: true,
      generatePDF: true,
    } as CreatePassRequest,
  });

  console.log('✅ Yacht boarding pass created:');
  console.log(`   Pass ID: ${yachtPass.passId}`);
  console.log(`   Yacht: ${yachtPass.metadata?.yachtName}`);
  console.log(`   Cruise: ${yachtPass.metadata?.cruiseType}`);
  console.log(`   Time: ${yachtPass.metadata?.departureTime} - ${yachtPass.metadata?.returnTime}`);
  console.log();

  // ========================================================================
  // EXAMPLE 4: LANGUAGE PASS (ada.interpreter)
  // ========================================================================

  console.log('🎧 EXAMPLE 4: Live Interpretation Language Pass\n');

  const languagePass = await passKit.processTask({
    type: 'create-pass',
    data: {
      domain: 'ada.interpreter' as PassDomain,
      passType: 'LANGUAGE_PASS' as PassType,
      holder: {
        name: 'Ahmed Hassan',
        email: 'ahmed.hassan@email.com',
        customFields: {
          preferredLanguage: 'ar',
          qualityTier: 'premium',
          deviceChannel: 'channel-5',
        },
      },
      validity: {
        validFrom: new Date('2025-09-10T09:00:00Z'),
        validTo: new Date('2025-09-10T18:00:00Z'),
        allowedDays: ['monday'],
      },
      zones: [
        {
          id: 'conference-room-a',
          name: 'Conference Room A',
          description: 'AI Ethics Panel - Arabic interpretation available',
        },
        {
          id: 'main-auditorium',
          name: 'Main Auditorium',
          description: 'Keynote sessions with multi-language support',
        },
      ],
      branding: {
        primaryColor: '#10B981',
        backgroundColor: '#10B981',
        textColor: '#FFFFFF',
        logoUrl: 'https://ada-interpreter.com/logo.png',
        organizationName: 'Ada Live Interpretation',
        template: 'modern',
      },
      metadata: {
        selectedLanguage: 'Arabic',
        languageCode: 'ar',
        audioChannel: 5,
        qualityTier: 'premium',
        interpreterName: 'Live AI + Human Backup',
      },
      generateQR: true,
      generateAppleWallet: true,
    } as CreatePassRequest,
  });

  console.log('✅ Language pass created:');
  console.log(`   Pass ID: ${languagePass.passId}`);
  console.log(`   Language: ${languagePass.metadata?.selectedLanguage} (Channel ${languagePass.metadata?.audioChannel})`);
  console.log(`   Quality: ${languagePass.metadata?.qualityTier}`);
  console.log();

  // ========================================================================
  // EXAMPLE 5: DINING RESERVATION (ada.restaurant)
  // ========================================================================

  console.log('🍽️  EXAMPLE 5: Restaurant Dining Reservation\n');

  const diningPass = await passKit.processTask({
    type: 'create-pass',
    data: {
      domain: 'ada.restaurant' as PassDomain,
      passType: 'DINING_RESERVATION' as PassType,
      holder: {
        name: 'Sofia Andersson',
        email: 'sofia.andersson@email.com',
        phone: '+46-70-1234567',
        customFields: {
          partySize: 4,
          dietaryRestrictions: ['gluten-free', 'vegetarian'],
          occasion: 'Anniversary',
        },
      },
      validity: {
        validFrom: new Date('2025-10-05T18:30:00Z'),
        validTo: new Date('2025-10-05T22:00:00Z'),
        allowedTimeRanges: [
          { start: '18:30', end: '22:00' },
        ],
        singleUse: true,
      },
      zones: [
        {
          id: 'main-entrance',
          name: 'Restaurant Main Entrance',
        },
        {
          id: 'terrace-section',
          name: 'Terrace Seating',
          description: 'Outdoor terrace with sea view',
          seatInfo: {
            table: 'T-12',
            seat: 'Seat 2',
            tableType: 'round',
            tableCapacity: 4,
            meal: 'vegetarian',
          },
          restrictions: {
            maxOccupancy: 40,
          },
        },
      ],
      branding: {
        primaryColor: '#9333EA',
        backgroundColor: '#9333EA',
        textColor: '#FFFFFF',
        logoUrl: 'https://restaurant.com/logo.png',
        organizationName: 'La Marina Bistro',
        template: 'luxury',
      },
      metadata: {
        restaurantName: 'La Marina Bistro',
        reservationTime: '19:00',
        tableNumber: 'T-12',
        partySize: 4,
        specialRequests: 'Window table, anniversary celebration',
      },
      generateQR: true,
      generateAppleWallet: true,
      generatePDF: true,
    } as CreatePassRequest,
  });

  console.log('✅ Dining reservation pass created:');
  console.log(`   Pass ID: ${diningPass.passId}`);
  console.log(`   Restaurant: ${diningPass.metadata?.restaurantName}`);
  console.log(`   Time: ${diningPass.metadata?.reservationTime}, Table: ${diningPass.metadata?.tableNumber}`);
  console.log(`   Party size: ${diningPass.metadata?.partySize}`);
  console.log();

  // ========================================================================
  // EXAMPLE 6: WEDDING INVITATION (ada.restaurant - gala event)
  // ========================================================================

  console.log('💒 EXAMPLE 6: Wedding Invitation\n');

  const weddingPass = await passKit.processTask({
    type: 'create-pass',
    data: {
      domain: 'ada.restaurant' as PassDomain,
      passType: 'DINING_RESERVATION' as PassType,
      holder: {
        name: 'Mr. John Smith & Guest',
        email: 'john.smith@email.com',
        phone: '+1-555-9876',
        customFields: {
          guestCount: 2,
          relationship: 'Friend of Groom',
        },
      },
      validity: {
        validFrom: new Date('2025-11-15T16:00:00Z'),
        validTo: new Date('2025-11-15T23:00:00Z'),
        allowedTimeRanges: [
          { start: '16:00', end: '23:00' },
        ],
        singleUse: true,
      },
      zones: [
        {
          id: 'wedding-ceremony',
          name: 'Wedding Ceremony Hall',
          description: 'Main ceremony venue',
          seatInfo: {
            section: 'Groom Side',
            row: 'F',
            seat: '12-13',
            seatType: 'standard',
          },
        },
        {
          id: 'wedding-reception',
          name: 'Wedding Reception',
          description: 'Dinner reception and celebration',
          seatInfo: {
            table: 'Table 8',
            seat: 'Seats 5-6',
            tableType: 'round',
            tableCapacity: 10,
            guestType: 'friend',
            meal: 'halal',
          },
        },
        {
          id: 'photo-booth',
          name: 'Photo Booth Area',
          description: 'Guest photo opportunities',
        },
      ],
      branding: {
        primaryColor: '#D4AF37',
        backgroundColor: '#FFFFFF',
        textColor: '#2C3E50',
        logoUrl: 'https://wedding.com/couple-logo.png',
        organizationName: 'Sarah & Michael Wedding',
        template: 'luxury',
      },
      metadata: {
        eventName: 'Sarah & Michael Wedding',
        eventDate: '2025-11-15',
        venueName: 'Grand Ballroom Hotel',
        ceremonyTime: '17:00',
        receptionTime: '18:30',
        dressCode: 'Black Tie',
        rsvpStatus: 'Confirmed',
      },
      generateQR: true,
      generateAppleWallet: true,
      generatePDF: true,
    } as CreatePassRequest,
  });

  console.log('✅ Wedding invitation pass created:');
  console.log(`   Pass ID: ${weddingPass.passId}`);
  console.log(`   Event: ${weddingPass.metadata?.eventName}`);
  console.log(`   Ceremony: ${weddingPass.metadata?.ceremonyTime}, Reception: ${weddingPass.metadata?.receptionTime}`);
  console.log(`   Table: ${weddingPass.zones[1]?.seatInfo?.table}, Seats: ${weddingPass.zones[1]?.seatInfo?.seat}`);
  console.log(`   Meal: ${weddingPass.zones[1]?.seatInfo?.meal?.toUpperCase()}`);
  console.log();

  // ========================================================================
  // ACCESS VALIDATION EXAMPLES
  // ========================================================================

  console.log('='.repeat(80));
  console.log('🔐 ACCESS VALIDATION EXAMPLES\n');

  // Validate congress badge access
  console.log('Testing congress badge access to speaker lounge...');
  const congressValidation = await passKit.processTask({
    type: 'scan-pass',
    data: {
      passId: congressBadge.passId,
      zoneId: 'speaker-lounge',
      scannedAt: new Date('2025-06-01T14:30:00Z'),
      scannedBy: 'security-001',
      location: 'Speaker Lounge Entrance',
    },
  });

  console.log(`   ${congressValidation.allowed ? '✅ GRANTED' : '❌ DENIED'}`);
  if (congressValidation.reason) {
    console.log(`   Reason: ${congressValidation.reason}`);
  }
  if (congressValidation.restrictions) {
    console.log(`   Restrictions: ${congressValidation.restrictions.join(', ')}`);
  }
  console.log();

  // Validate boarding pass at gate
  console.log('Testing boarding pass at gate...');
  const boardingValidation = await passKit.processTask({
    type: 'scan-pass',
    data: {
      passId: boardingPass.passId,
      zoneId: 'gate-b12',
      scannedAt: new Date('2025-07-15T09:45:00Z'),
      scannedBy: 'gate-agent-23',
      location: 'Gate B12',
    },
  });

  console.log(`   ${boardingValidation.allowed ? '✅ GRANTED' : '❌ DENIED'}`);
  console.log(`   Current scans: ${boardingPass.validity.currentScans || 0}/${boardingPass.validity.maxScans}`);
  console.log();

  // Validate yacht pass (capacity check)
  console.log('Testing yacht boarding (capacity check)...');
  const yachtValidation = await passKit.processTask({
    type: 'scan-pass',
    data: {
      passId: yachtPass.passId,
      zoneId: 'yacht-aurora',
      scannedAt: new Date('2025-08-20T16:45:00Z'),
      scannedBy: 'crew-member',
      location: 'Yacht Gangway',
    },
  });

  console.log(`   ${yachtValidation.allowed ? '✅ GRANTED' : '❌ DENIED'}`);
  console.log();

  // ========================================================================
  // STATISTICS
  // ========================================================================

  console.log('='.repeat(80));
  console.log('📊 PASSKIT STATISTICS\n');

  const overallStats = await passKit.processTask({
    type: 'get-statistics',
    data: {},
  });

  console.log('Overall Statistics:');
  console.log(`   Total passes: ${overallStats.totalPasses}`);
  console.log(`   Active passes: ${overallStats.activepasses}`);
  console.log(`   Total scans: ${overallStats.scanActivity.totalScans}`);
  console.log(`   Average scans per pass: ${overallStats.scanActivity.avgScansPerPass.toFixed(2)}`);
  console.log();

  console.log('Passes by domain:');
  Object.entries(overallStats.byType).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`   ${type}: ${count}`);
    }
  });
  console.log();

  // ========================================================================
  // PASS UPDATE EXAMPLE
  // ========================================================================

  console.log('='.repeat(80));
  console.log('🔄 PASS UPDATE EXAMPLE\n');

  console.log('Upgrading congress badge to VIP status...');
  const updatedBadge = await passKit.processTask({
    type: 'update-pass',
    data: {
      passId: congressBadge.passId,
      updates: {
        zones: [
          ...congressBadge.zones,
          {
            id: 'backstage',
            name: 'Backstage Area',
            description: 'VIP backstage access',
            restrictions: {
              requiresEscort: true,
            },
          },
        ],
        metadata: {
          ...congressBadge.metadata,
          upgraded: true,
          upgradeReason: 'VIP sponsor',
        },
      },
      reason: 'Upgraded to VIP sponsor badge',
      updatedBy: 'admin@ada-summit.com',
    },
  });

  console.log(`✅ Badge upgraded: ${updatedBadge.zones.length} zones (added backstage access)`);
  console.log();

  // ========================================================================
  // PASS REVOCATION EXAMPLE
  // ========================================================================

  console.log('='.repeat(80));
  console.log('⛔ PASS REVOCATION EXAMPLE\n');

  console.log('Revoking dining reservation (customer cancelled)...');
  const revokedPass = await passKit.processTask({
    type: 'revoke-pass',
    data: {
      passId: diningPass.passId,
      reason: 'Reservation cancelled by customer',
      revokedBy: 'restaurant-manager',
      notifyHolder: true,
    },
  });

  console.log(`✅ Pass revoked: ${revokedPass.passId}`);
  console.log(`   Status: ${revokedPass.status}`);
  console.log();

  // Cleanup
  await passKit.stop();
  console.log('='.repeat(80));
  console.log('✅ All examples completed!\n');
}

main().catch(console.error);
