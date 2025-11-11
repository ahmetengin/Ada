/**
 * Ada Ecosystem Demo
 * Demonstrates the complete Ada ecosystem with all node types working together
 */

import { SeaNode } from '../nodes/ada.sea/SeaNode.js';
import { MarinaNode } from '../nodes/ada.marina/MarinaNode.js';
import { TravelNode } from '../nodes/ada.travel/TravelNode.js';
import { CongressNode } from '../nodes/ada.congress/CongressNode.js';
import { BaseNode } from '../core/BaseNode.js';

async function main() {
  console.log('🌊 Ada Ecosystem Demo - Self-Replicating AI Nodes\n');
  console.log('='.repeat(60));

  // ==========================================
  // 1. Create Marina Node (West Istanbul Marina)
  // ==========================================
  console.log('\n📍 Creating Marina Node (West Istanbul Marina)...');

  const marina = new MarinaNode({
    name: 'West Istanbul Marina AI',
    marinaInfo: {
      name: 'West Istanbul Marina (WIM)',
      location: 'Istanbul, Turkey',
      area: 155000, // sqm
      capacity: 600,
      coordinates: { latitude: 41.0082, longitude: 28.9784 },
    },
  });

  await marina.start();
  console.log(`✅ Marina node created: ${marina.getIdentity().id}`);
  console.log(`   - Total berths: ${marina.getStatus().occupancy.total}`);
  console.log(`   - Available services: ${marina.getStatus().occupancy.available}`);

  // ==========================================
  // 2. Create Yacht Node (ada.sea)
  // ==========================================
  console.log('\n🛥️  Creating Yacht Node (Luxury Yacht)...');

  const yacht = new SeaNode({
    name: 'S/Y Azure Dream AI',
    vessel: {
      name: 'Azure Dream',
      imo: 'IMO1234567',
      mmsi: '271234567',
      length: 24, // meters
      beam: 6,
      draft: 2.5,
      type: 'Sailing Yacht',
    },
  });

  await yacht.start();
  console.log(`✅ Yacht node created: ${yacht.getIdentity().id}`);
  console.log(`   - Vessel: ${yacht.getStatus().vessel.name}`);
  console.log(`   - Length: ${yacht.getStatus().vessel.length}m`);

  // Connect yacht to marina
  yacht.connectToNode(marina.getIdentity().id);
  marina.connectToNode(yacht.getIdentity().id);
  console.log('🔗 Yacht and Marina nodes connected');

  // ==========================================
  // 3. Yacht Requests Berth from Marina
  // ==========================================
  console.log('\n📞 Yacht requesting berth reservation from Marina...');

  const reservationRequest = await yacht.requestFromNode(
    marina.getIdentity().id,
    'service-request',
    {
      vesselName: 'Azure Dream',
      vesselLength: 24,
      serviceType: 'berth-reservation',
      details: {
        checkIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        checkOut: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        services: ['elec-1', 'water-1', 'fuel-1'],
      },
    }
  );

  console.log('✅ Reservation confirmed:');
  console.log(`   - Berth: ${reservationRequest.berth.number}`);
  console.log(`   - Cost: $${reservationRequest.reservation.totalCost}`);
  console.log(`   - Services: ${reservationRequest.berth.amenities.join(', ')}`);

  // ==========================================
  // 4. Create Travel Agency Node
  // ==========================================
  console.log('\n✈️  Creating Travel Agency Node...');

  const travelAgency = new TravelNode({
    name: 'Ada Travel Services',
    agencyInfo: {
      name: 'Ada Travel & Tours',
      license: 'TURSAB-12345',
      specializations: ['corporate-travel', 'event-management', 'yacht-charters'],
    },
  });

  await travelAgency.start();
  console.log(`✅ Travel node created: ${travelAgency.getIdentity().id}`);
  console.log(`   - Available packages: ${travelAgency.getStatus().activePackages}`);

  // ==========================================
  // 5. Create Congress Event Node
  // ==========================================
  console.log('\n🎯 Creating Congress Event Node...');

  const congress = new CongressNode({
    name: 'International Maritime Congress AI',
    organizerInfo: {
      name: 'Global Maritime Events',
      specialization: ['maritime-conferences', 'yacht-shows', 'trade-events'],
    },
  });

  await congress.start();
  console.log(`✅ Congress node created: ${congress.getIdentity().id}`);

  // Connect congress to travel agency
  congress.connectToNode(travelAgency.getIdentity().id);
  travelAgency.connectToNode(congress.getIdentity().id);
  console.log('🔗 Congress and Travel nodes connected');

  // ==========================================
  // 6. Create Congress Event
  // ==========================================
  console.log('\n📅 Creating International Maritime Congress...');

  const event = congress.processTask({
    type: 'create-event',
    data: {
      name: 'International Maritime Technology Congress 2025',
      startDate: new Date('2025-06-15'),
      endDate: new Date('2025-06-18'),
      venue: {
        name: 'Istanbul Congress Center',
        address: 'Harbiye, Istanbul, Turkey',
        capacity: 2000,
        facilities: ['auditorium', 'exhibition-hall', 'breakout-rooms', 'catering'],
        contactInfo: {
          name: 'Venue Manager',
          phone: '+90-212-XXX-XXXX',
          email: 'events@icc.com.tr',
        },
      },
      expectedAttendees: 500,
    },
  });

  console.log(`✅ Event created: ${event.name}`);
  console.log(`   - Date: ${event.startDate.toLocaleDateString()} - ${event.endDate.toLocaleDateString()}`);
  console.log(`   - Venue: ${event.venue.name}`);
  console.log(`   - Expected attendees: ${event.expectedAttendees}`);

  // ==========================================
  // 7. Register Attendee with Complete Journey
  // ==========================================
  console.log('\n👤 Registering attendee with complete itinerary...');

  const attendeeRegistration = await congress.processTask({
    type: 'register-attendee',
    data: {
      eventId: event.id,
      attendee: {
        id: 'att-001',
        name: 'Dr. John Smith',
        email: 'john.smith@maritime-tech.com',
        phone: '+1-555-0123',
        organization: 'Maritime Technologies Inc.',
        role: 'CTO',
        passportInfo: {
          number: 'US123456789',
          nationality: 'USA',
          expiryDate: new Date('2028-12-31'),
        },
        dietaryRequirements: ['vegetarian'],
      },
      packageType: 'premium',
      homeAddress: '123 Harbor Drive, Seattle, WA, USA',
    },
  });

  console.log('✅ Attendee registered:');
  console.log(`   - Registration ID: ${attendeeRegistration.registration.id}`);
  console.log(`   - Package: ${attendeeRegistration.registration.packageType}`);
  console.log(`   - Amount: $${attendeeRegistration.registration.amount}`);
  console.log(`   - Itinerary steps: ${attendeeRegistration.itinerary.steps.length}`);
  console.log(`   - Apple Pass: ${attendeeRegistration.applePassUrl}`);

  console.log('\n📋 Itinerary breakdown:');
  attendeeRegistration.itinerary.steps.slice(0, 5).forEach((step: any, index: number) => {
    console.log(`   ${index + 1}. ${step.type.toUpperCase()}: ${step.description}`);
    console.log(`      Time: ${step.scheduledTime.toLocaleString()}`);
  });
  console.log(`   ... and ${attendeeRegistration.itinerary.steps.length - 5} more steps`);

  // ==========================================
  // 8. Demonstrate Node Cloning
  // ==========================================
  console.log('\n🧬 Demonstrating node self-replication...');

  const yachtClone = await yacht.clone('S/Y Azure Dream AI - Clone 1', {
    inheritMemory: false,
    inheritConnections: true,
    purpose: 'Handle increased operational load',
  });

  console.log(`✅ Yacht node cloned: ${yachtClone.getIdentity().id}`);
  console.log(`   - Parent: ${yachtClone.getIdentity().parentId}`);
  console.log(`   - Generation: ${yachtClone.getIdentity().generation}`);
  console.log(`   - Purpose: Handle increased operational load`);
  console.log(`   - Inherited connections: ${yachtClone.getState().connectedNodes.length}`);

  // ==========================================
  // 9. Demonstrate Inter-Node Communication
  // ==========================================
  console.log('\n💬 Testing inter-node communication...');

  // Yacht asks marina for availability
  const availability = await yacht.requestFromNode(
    marina.getIdentity().id,
    'check-availability',
    {}
  );

  console.log('✅ Marina availability response:');
  console.log(`   - Available berths: ${availability.availableBerths}`);
  console.log(`   - Occupancy rate: ${availability.occupancyRate.toFixed(1)}%`);

  // Travel agency inquiries
  const travelPackages = await travelAgency.processTask({
    type: 'get-packages',
    data: {},
  });

  console.log(`\n✈️  Available travel packages: ${travelPackages.length}`);
  travelPackages.forEach((pkg: any, index: number) => {
    console.log(`   ${index + 1}. ${pkg.name} - $${pkg.price} (${pkg.duration} days)`);
  });

  // ==========================================
  // 10. Ecosystem Statistics
  // ==========================================
  console.log('\n📊 Ada Ecosystem Statistics:');
  console.log('='.repeat(60));

  const ecosystemStats = BaseNode.getEcosystemStats();
  console.log(`Total nodes: ${ecosystemStats.totalNodes}`);
  console.log(`Total clones: ${ecosystemStats.totalClones}`);
  console.log(`Total connections: ${ecosystemStats.totalConnections}`);
  console.log(`Average load: ${ecosystemStats.averageLoad.toFixed(1)}%`);
  console.log('\nNodes by type:');
  Object.entries(ecosystemStats.byType).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`   - ${type}: ${count}`);
    }
  });

  // Show individual node info
  console.log('\n📝 Individual Node Information:');
  console.log('\n🛥️  Yacht Node:');
  const yachtInfo = yacht.getInfo();
  console.log(`   Memory entries: ${yachtInfo.memory.total}`);
  console.log(`   Messages sent: ${yachtInfo.communication.sent}`);
  console.log(`   Messages received: ${yachtInfo.communication.received}`);
  console.log(`   Connected nodes: ${yachtInfo.communication.connectedNodes}`);

  console.log('\n📍 Marina Node:');
  const marinaInfo = marina.getInfo();
  console.log(`   Memory entries: ${marinaInfo.memory.total}`);
  console.log(`   Messages sent: ${marinaInfo.communication.sent}`);
  console.log(`   Messages received: ${marinaInfo.communication.received}`);
  console.log(`   Occupancy rate: ${marinaInfo.status.occupancy.rate.toFixed(1)}%`);

  console.log('\n='.repeat(60));
  console.log('✨ Ada Ecosystem Demo Completed Successfully!');
  console.log('\nKey Features Demonstrated:');
  console.log('✅ Self-replicating AI nodes with memory and learning');
  console.log('✅ Inter-node communication (like humans)');
  console.log('✅ Domain-specific capabilities per node type');
  console.log('✅ Complete end-to-end workflows');
  console.log('✅ Integration between different service types');
  console.log('✅ Apple PassKit QR code tracking');
  console.log('✅ Comprehensive itinerary management');
  console.log('='.repeat(60));
}

// Run the demo
main().catch(console.error);
