/**
 * FacilityManagement - Comprehensive marina facility management
 * Based on real-world marinas: WIM, Setur Kalamış, Setur Midilli, D-Marin Göcek
 */

import { v4 as uuidv4 } from 'uuid';

// Facility categories from real marinas
export type FacilityCategory =
  | 'shore-facilities'      // Restaurant, bar, cafe, market
  | 'wellness-leisure'      // Pool, spa, fitness, beach club
  | 'business-social'       // Meeting rooms, conference, event spaces
  | 'technical-services'    // Haul-out, maintenance, repair
  | 'guest-services'        // Laundry, showers, parking
  | 'marine-services'       // Fuel, water, electricity, pump-out
  | 'concierge-services';   // Car rental, shuttle, yacht brokerage

// Facility types from 4 reference marinas
export interface MarinaFacility {
  id: string;
  name: string;
  nameEn: string;
  category: FacilityCategory;
  type: string; // 'restaurant', 'pool', 'gym', 'spa', etc.
  description: string;
  descriptionEn: string;

  // Capacity & availability
  capacity?: number; // Max concurrent users (pool, gym, restaurant)
  currentOccupancy: number;
  available: boolean;

  // Operating hours
  operatingHours: {
    openTime: string; // "08:00"
    closeTime: string; // "23:00"
    days: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  };

  // Pricing
  pricing: {
    type: 'free' | 'included' | 'paid' | 'member-only';
    price?: number; // TRY
    currency: string;
    unit?: string; // 'per hour', 'per session', 'per day'
  };

  // Reservation
  reservationRequired: boolean;
  advanceBookingDays: number; // How many days in advance can book
  cancellationPolicy: string;

  // Amenities & features
  amenities: string[];
  features: string[];

  // Integration with other nodes
  managedBy?: string; // Which node manages this facility
  // e.g., 'ada.restaurant' for restaurant facility

  // Ratings & reviews
  rating: number; // 1-5
  reviewCount: number;

  // Status
  status: 'operational' | 'maintenance' | 'closed' | 'seasonal';
  seasonalOperation?: {
    openFrom: string; // "April"
    openTo: string;   // "October"
  };

  // Real marina reference
  inspiration?: string; // "D-Marin Göcek Beach Club"
}

// Facility reservation
export interface FacilityReservation {
  id: string;
  facilityId: string;
  facilityName: string;
  customerId: string;
  customerName: string;
  date: Date;
  timeSlot: {
    start: string; // "14:00"
    end: string;   // "16:00"
  };
  partySize?: number; // For restaurant, spa, etc.
  status: 'pending' | 'confirmed' | 'checked-in' | 'completed' | 'cancelled';
  specialRequests?: string;
  price: number;
  paid: boolean;
  createdDate: Date;
  confirmedDate?: Date;
  cancelledDate?: Date;
  cancellationReason?: string;
}

// Package deal (berth + facilities)
export interface MarinaPackage {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'seasonal';

  // What's included
  includes: {
    berth: boolean;
    berthDuration?: number; // days
    facilities: Array<{
      facilityId: string;
      facilityName: string;
      quantity?: number; // e.g., 3 spa sessions
      unlimited?: boolean;
    }>;
  };

  pricing: {
    regular: number;
    discounted: number;
    savings: number; // Amount saved
    savingsPercentage: number;
  };

  validFrom: Date;
  validUntil: Date;
  maxGuests?: number;
  popular: boolean;

  // Marketing
  tags: string[];
  highlights: string[];
}

export class FacilityManagement {
  private facilities: Map<string, MarinaFacility> = new Map();
  private reservations: Map<string, FacilityReservation> = new Map();
  private packages: Map<string, MarinaPackage> = new Map();

  constructor() {
    this.initializeRealMarinaFacilities();
    this.initializePackages();
  }

  /**
   * Initialize facilities based on 4 real marinas
   */
  private initializeRealMarinaFacilities(): void {
    const facilities: MarinaFacility[] = [
      // ========================================
      // SHORE FACILITIES (Restaurant, Bar, Market)
      // ========================================
      {
        id: uuidv4(),
        name: 'Marina Restaurant & Bar',
        nameEn: 'Marina Restaurant & Bar',
        category: 'shore-facilities',
        type: 'restaurant',
        description: 'Akdeniz mutfağı, deniz manzaralı fine dining',
        descriptionEn: 'Mediterranean cuisine with sea view fine dining',
        capacity: 120,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '08:00',
          closeTime: '23:00',
          days: [0, 1, 2, 3, 4, 5, 6], // Every day
        },
        pricing: {
          type: 'paid',
          price: 0, // Pay per order
          currency: 'TRY',
        },
        reservationRequired: true,
        advanceBookingDays: 7,
        cancellationPolicy: '24 hours notice',
        amenities: ['Sea view', 'Outdoor seating', 'Live music', 'Bar', 'Kids menu'],
        features: ['Fine dining', 'Breakfast', 'Lunch', 'Dinner', 'Cocktails'],
        managedBy: 'ada.restaurant',
        rating: 4.7,
        reviewCount: 342,
        status: 'operational',
        inspiration: 'D-Marin Göcek Fine Dining',
      },
      {
        id: uuidv4(),
        name: 'Marina Cafe & Lounge',
        nameEn: 'Marina Cafe & Lounge',
        category: 'shore-facilities',
        type: 'cafe',
        description: 'Kahve, aperatif, hafif yemekler',
        descriptionEn: 'Coffee, aperitifs, light meals',
        capacity: 60,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '07:00',
          closeTime: '22:00',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'paid',
          price: 0,
          currency: 'TRY',
        },
        reservationRequired: false,
        advanceBookingDays: 0,
        cancellationPolicy: 'No reservation needed',
        amenities: ['Wi-Fi', 'Newspapers', 'Terrace', 'Air conditioning'],
        features: ['Breakfast', 'Coffee', 'Snacks', 'Pastries', 'Smoothies'],
        managedBy: 'ada.restaurant',
        rating: 4.5,
        reviewCount: 189,
        status: 'operational',
        inspiration: 'Setur Kalamış Lounge',
      },
      {
        id: uuidv4(),
        name: 'Marina Market & Chandlery',
        nameEn: 'Marina Market & Chandlery',
        category: 'shore-facilities',
        type: 'market',
        description: 'Denizcilik malzemeleri, market, temel ihtiyaçlar',
        descriptionEn: 'Marine supplies, groceries, essentials',
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '08:00',
          closeTime: '20:00',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'paid',
          price: 0,
          currency: 'TRY',
        },
        reservationRequired: false,
        advanceBookingDays: 0,
        cancellationPolicy: 'N/A',
        amenities: ['Wide selection', 'Fresh produce', 'Marine equipment'],
        features: ['Groceries', 'Chandlery', 'Newspapers', 'Ice', 'Gas bottles'],
        rating: 4.3,
        reviewCount: 156,
        status: 'operational',
        inspiration: 'WIM Chandlery',
      },

      // ========================================
      // WELLNESS & LEISURE
      // ========================================
      {
        id: uuidv4(),
        name: 'Açık Yüzme Havuzu',
        nameEn: 'Outdoor Swimming Pool',
        category: 'wellness-leisure',
        type: 'pool',
        description: '25m olimpik havuz, çocuk havuzu, güneşlenme alanı',
        descriptionEn: '25m Olympic pool, kids pool, sun deck',
        capacity: 80,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '08:00',
          closeTime: '20:00',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'included', // Included for berth holders
          price: 0,
          currency: 'TRY',
        },
        reservationRequired: false,
        advanceBookingDays: 0,
        cancellationPolicy: 'N/A',
        amenities: ['Sun loungers', 'Towels', 'Showers', 'Bar service', 'Kids area'],
        features: ['25m pool', 'Kids pool', 'Jacuzzi', 'Sun deck'],
        rating: 4.8,
        reviewCount: 267,
        status: 'operational',
        seasonalOperation: {
          openFrom: 'May',
          openTo: 'October',
        },
        inspiration: 'D-Marin Göcek Pool',
      },
      {
        id: uuidv4(),
        name: 'Spa & Wellness Center',
        nameEn: 'Spa & Wellness Center',
        category: 'wellness-leisure',
        type: 'spa',
        description: 'Masaj, sauna, türk hamamı, yoga',
        descriptionEn: 'Massage, sauna, Turkish bath, yoga',
        capacity: 20,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '09:00',
          closeTime: '21:00',
          days: [1, 2, 3, 4, 5, 6], // Monday-Saturday
        },
        pricing: {
          type: 'paid',
          price: 500,
          currency: 'TRY',
          unit: 'per session',
        },
        reservationRequired: true,
        advanceBookingDays: 14,
        cancellationPolicy: '48 hours notice for full refund',
        amenities: ['Sauna', 'Turkish bath', 'Massage rooms', 'Relaxation area', 'Yoga studio'],
        features: ['Swedish massage', 'Turkish bath', 'Aromatherapy', 'Yoga classes', 'Meditation'],
        rating: 4.9,
        reviewCount: 198,
        status: 'operational',
        inspiration: 'D-Marin Göcek Spa',
      },
      {
        id: uuidv4(),
        name: 'Fitness Center',
        nameEn: 'Fitness Center',
        category: 'wellness-leisure',
        type: 'gym',
        description: 'Modern fitness ekipmanları, personal training',
        descriptionEn: 'Modern fitness equipment, personal training',
        capacity: 30,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '06:00',
          closeTime: '22:00',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'included',
          price: 0,
          currency: 'TRY',
        },
        reservationRequired: false,
        advanceBookingDays: 0,
        cancellationPolicy: 'N/A',
        amenities: ['Cardio equipment', 'Weights', 'Lockers', 'Showers', 'Towels', 'Water'],
        features: ['Treadmills', 'Bikes', 'Weights', 'Personal training', 'Classes'],
        rating: 4.6,
        reviewCount: 145,
        status: 'operational',
        inspiration: 'WIM Fitness',
      },
      {
        id: uuidv4(),
        name: 'Kids Club & Playground',
        nameEn: 'Kids Club & Playground',
        category: 'wellness-leisure',
        type: 'kids-club',
        description: 'Çocuk kulübü, oyun alanı, aktiviteler',
        descriptionEn: 'Kids club, playground, activities',
        capacity: 25,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '09:00',
          closeTime: '18:00',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'included',
          price: 0,
          currency: 'TRY',
        },
        reservationRequired: false,
        advanceBookingDays: 0,
        cancellationPolicy: 'N/A',
        amenities: ['Playground', 'Indoor play area', 'Supervised activities', 'Games', 'Toys'],
        features: ['Arts & crafts', 'Games', 'Movies', 'Outdoor play'],
        rating: 4.7,
        reviewCount: 89,
        status: 'operational',
        seasonalOperation: {
          openFrom: 'April',
          openTo: 'October',
        },
        inspiration: 'Setur Midilli Kids Club',
      },
      {
        id: uuidv4(),
        name: 'Beach Club',
        nameEn: 'Beach Club',
        category: 'wellness-leisure',
        type: 'beach-club',
        description: 'Özel plaj, deniz sporları, beach bar',
        descriptionEn: 'Private beach, water sports, beach bar',
        capacity: 150,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '08:00',
          closeTime: '20:00',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'member-only',
          price: 200,
          currency: 'TRY',
          unit: 'per day',
        },
        reservationRequired: true,
        advanceBookingDays: 7,
        cancellationPolicy: '24 hours notice',
        amenities: ['Private beach', 'Sun loungers', 'Umbrellas', 'Showers', 'Bar', 'Restaurant'],
        features: ['Swimming', 'Water sports', 'Beach volleyball', 'SUP', 'Kayaking'],
        rating: 5.0,
        reviewCount: 412,
        status: 'operational',
        seasonalOperation: {
          openFrom: 'May',
          openTo: 'October',
        },
        inspiration: 'D-Marin Göcek Beach Club',
      },

      // ========================================
      // BUSINESS & SOCIAL
      // ========================================
      {
        id: uuidv4(),
        name: 'Conference Hall',
        nameEn: 'Conference Hall',
        category: 'business-social',
        type: 'conference',
        description: 'Konferans salonu, toplantı odaları, AV ekipman',
        descriptionEn: 'Conference hall, meeting rooms, AV equipment',
        capacity: 200,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '08:00',
          closeTime: '22:00',
          days: [1, 2, 3, 4, 5], // Weekdays
        },
        pricing: {
          type: 'paid',
          price: 5000,
          currency: 'TRY',
          unit: 'per day',
        },
        reservationRequired: true,
        advanceBookingDays: 60,
        cancellationPolicy: '7 days notice, 50% refund',
        amenities: ['Projector', 'Sound system', 'Wi-Fi', 'Whiteboard', 'Catering', 'Air conditioning'],
        features: ['Conference', 'Seminars', 'Events', 'Weddings', 'Parties'],
        managedBy: 'ada.congress',
        rating: 4.8,
        reviewCount: 67,
        status: 'operational',
        inspiration: 'D-Marin Göcek Conference',
      },
      {
        id: uuidv4(),
        name: 'Meeting Rooms',
        nameEn: 'Meeting Rooms',
        category: 'business-social',
        type: 'meeting-room',
        description: 'Küçük toplantı odaları (6-12 kişilik)',
        descriptionEn: 'Small meeting rooms (6-12 people)',
        capacity: 12,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '08:00',
          closeTime: '20:00',
          days: [1, 2, 3, 4, 5],
        },
        pricing: {
          type: 'paid',
          price: 500,
          currency: 'TRY',
          unit: 'per hour',
        },
        reservationRequired: true,
        advanceBookingDays: 14,
        cancellationPolicy: '24 hours notice',
        amenities: ['TV', 'Wi-Fi', 'Whiteboard', 'Coffee/tea', 'Air conditioning'],
        features: ['Small meetings', 'Video calls', 'Presentations'],
        rating: 4.5,
        reviewCount: 45,
        status: 'operational',
        inspiration: 'Setur Kalamış Meeting Rooms',
      },
      {
        id: uuidv4(),
        name: 'Co-working Space',
        nameEn: 'Co-working Space',
        category: 'business-social',
        type: 'coworking',
        description: 'Ortak çalışma alanı, high-speed Wi-Fi',
        descriptionEn: 'Co-working space, high-speed Wi-Fi',
        capacity: 40,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '00:00',
          closeTime: '23:59',
          days: [0, 1, 2, 3, 4, 5, 6], // 24/7
        },
        pricing: {
          type: 'included',
          price: 0,
          currency: 'TRY',
        },
        reservationRequired: false,
        advanceBookingDays: 0,
        cancellationPolicy: 'N/A',
        amenities: ['High-speed Wi-Fi', 'Desks', 'Power outlets', 'Coffee', 'Printer'],
        features: ['24/7 access', 'Quiet work', 'Coffee/tea', 'Printing'],
        rating: 4.6,
        reviewCount: 78,
        status: 'operational',
        inspiration: 'WIM Business Lounge',
      },
      {
        id: uuidv4(),
        name: 'Açık Hava Etkinlik Alanı',
        nameEn: 'Outdoor Event Space',
        category: 'business-social',
        type: 'event-space',
        description: 'Konser, canlı müzik, festival ve etkinlik alanı',
        descriptionEn: 'Concert, live music, festival and event area',
        capacity: 2000,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '10:00',
          closeTime: '02:00', // Late night for concerts
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'paid',
          price: 25000,
          currency: 'TRY',
          unit: 'per event',
        },
        reservationRequired: true,
        advanceBookingDays: 90,
        cancellationPolicy: '30 days notice, 50% refund',
        amenities: [
          'Professional stage',
          'Sound system',
          'Lighting system',
          'Backstage area',
          'Security',
          'Bar service',
          'VIP section',
        ],
        features: [
          'Live concerts',
          'DJ performances',
          'Open-air cinema',
          'Festivals',
          'Corporate events',
          'Art exhibitions',
          'Sea view stage',
          'Capacity: 2000 people',
        ],
        managedBy: 'ada.congress',
        rating: 4.9,
        reviewCount: 287,
        status: 'operational',
        seasonalOperation: {
          openFrom: 'May',
          openTo: 'October',
        },
        inspiration: 'WIM Summer Concert Series, Ataköy Marina Events',
      },
      {
        id: uuidv4(),
        name: 'Canlı Müzik & Bar',
        nameEn: 'Live Music & Bar',
        category: 'business-social',
        type: 'live-music',
        description: 'Canlı müzik, DJ, lounge bar',
        descriptionEn: 'Live music, DJ, lounge bar',
        capacity: 300,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '18:00',
          closeTime: '02:00',
          days: [3, 4, 5, 6], // Thursday-Sunday
        },
        pricing: {
          type: 'free', // Free entry, pay per consumption
          price: 0,
          currency: 'TRY',
        },
        reservationRequired: false,
        advanceBookingDays: 0,
        cancellationPolicy: 'N/A',
        amenities: [
          'Live band stage',
          'DJ booth',
          'Premium bar',
          'Cocktails',
          'Dance floor',
          'Sea view terrace',
          'VIP tables',
        ],
        features: [
          'Thursday: Jazz Night',
          'Friday-Saturday: Live DJ',
          'Sunday: Sunset Sessions',
          'International artists',
          'Local performers',
          'Themed nights',
        ],
        managedBy: 'ada.restaurant',
        rating: 4.8,
        reviewCount: 456,
        status: 'operational',
        seasonalOperation: {
          openFrom: 'April',
          openTo: 'November',
        },
        inspiration: 'Kıyı Istanbul Marina Live Sessions',
      },

      // ========================================
      // TECHNICAL SERVICES
      // ========================================
      {
        id: uuidv4(),
        name: 'Haul-Out & Shipyard',
        nameEn: 'Haul-Out & Shipyard',
        category: 'technical-services',
        type: 'haul-out',
        description: 'Kızak çekme, boyama, tamir',
        descriptionEn: 'Haul-out, painting, repair',
        capacity: 10,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '08:00',
          closeTime: '18:00',
          days: [1, 2, 3, 4, 5],
        },
        pricing: {
          type: 'paid',
          price: 0, // Quoted per job
          currency: 'TRY',
        },
        reservationRequired: true,
        advanceBookingDays: 30,
        cancellationPolicy: '7 days notice',
        amenities: ['75-ton travel lift', 'Pressure washing', 'Storage yard', 'Workshop'],
        features: ['Haul-out', 'Launch', 'Bottom painting', 'Repairs', 'Storage'],
        managedBy: 'ada.maintenance',
        rating: 4.7,
        reviewCount: 134,
        status: 'operational',
        inspiration: 'D-Marin Göcek Shipyard',
      },
      {
        id: uuidv4(),
        name: 'Technical Workshop',
        nameEn: 'Technical Workshop',
        category: 'technical-services',
        type: 'workshop',
        description: 'Motor servisi, elektrik, sıhhi tesisat',
        descriptionEn: 'Engine service, electrical, plumbing',
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '08:00',
          closeTime: '18:00',
          days: [1, 2, 3, 4, 5],
        },
        pricing: {
          type: 'paid',
          price: 0,
          currency: 'TRY',
        },
        reservationRequired: true,
        advanceBookingDays: 14,
        cancellationPolicy: '48 hours notice',
        amenities: ['Engine repair', 'Electrical', 'Plumbing', 'Electronics', 'Carpentry'],
        features: ['Motor servisi', 'Elektrik', 'Sıhhi tesisat', 'Elektronik', 'Marangoz'],
        managedBy: 'ada.maintenance',
        rating: 4.8,
        reviewCount: 201,
        status: 'operational',
        inspiration: 'WIM Technical Services',
      },

      // ========================================
      // GUEST SERVICES
      // ========================================
      {
        id: uuidv4(),
        name: 'Laundry Service',
        nameEn: 'Laundry Service',
        category: 'guest-services',
        type: 'laundry',
        description: 'Çamaşır yıkama, kuru temizleme, ütü',
        descriptionEn: 'Laundry, dry cleaning, ironing',
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '08:00',
          closeTime: '18:00',
          days: [1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'paid',
          price: 50,
          currency: 'TRY',
          unit: 'per kg',
        },
        reservationRequired: false,
        advanceBookingDays: 0,
        cancellationPolicy: 'N/A',
        amenities: ['Washers', 'Dryers', 'Dry cleaning', 'Ironing', 'Same-day service'],
        features: ['Washing', 'Drying', 'Folding', 'Dry cleaning', 'Express service'],
        rating: 4.4,
        reviewCount: 112,
        status: 'operational',
        inspiration: 'Setur Midilli Laundry',
      },
      {
        id: uuidv4(),
        name: 'Shower & WC Facilities',
        nameEn: 'Shower & WC Facilities',
        category: 'guest-services',
        type: 'shower-wc',
        description: 'Modern duş, tuvalet, soyunma odaları',
        descriptionEn: 'Modern showers, WC, changing rooms',
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '00:00',
          closeTime: '23:59',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'included',
          price: 0,
          currency: 'TRY',
        },
        reservationRequired: false,
        advanceBookingDays: 0,
        cancellationPolicy: 'N/A',
        amenities: ['Hot water', 'Towels', 'Toiletries', 'Hair dryers', 'Lockers'],
        features: ['Showers', 'WC', 'Changing rooms', 'Lockers'],
        rating: 4.5,
        reviewCount: 234,
        status: 'operational',
        inspiration: 'All marinas',
      },
      {
        id: uuidv4(),
        name: 'Car Parking',
        nameEn: 'Car Parking',
        category: 'guest-services',
        type: 'parking',
        description: 'Güvenli araç parkı, 24/7 güvenlik',
        descriptionEn: 'Secure car parking, 24/7 security',
        capacity: 300,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '00:00',
          closeTime: '23:59',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'included',
          price: 0,
          currency: 'TRY',
        },
        reservationRequired: false,
        advanceBookingDays: 0,
        cancellationPolicy: 'N/A',
        amenities: ['24/7 security', 'CCTV', 'Covered parking', 'EV charging'],
        features: ['Secure', '24/7 access', 'CCTV', 'EV charging'],
        rating: 4.3,
        reviewCount: 98,
        status: 'operational',
        inspiration: 'WIM Parking',
      },
      {
        id: uuidv4(),
        name: 'Kuru Depolama (Dry Stack)',
        nameEn: 'Dry Stack Storage',
        category: 'guest-services',
        type: 'dry-storage',
        description: 'Karada tekne depolama, forklift ile indirme/bindirme',
        descriptionEn: 'Dry boat storage, forklift launch/retrieval',
        capacity: 150,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '08:00',
          closeTime: '18:00',
          days: [1, 2, 3, 4, 5, 6], // Monday-Saturday
        },
        pricing: {
          type: 'paid',
          price: 800,
          currency: 'TRY',
          unit: 'per month',
        },
        reservationRequired: true,
        advanceBookingDays: 30,
        cancellationPolicy: '30 days notice',
        amenities: ['24/7 security', 'CCTV', 'Covered storage', 'Forklift service', 'Power washing'],
        features: [
          'Indoor/outdoor storage',
          'Up to 10m boats',
          'Forklift launch (2 hours notice)',
          'Wash down after use',
          'Maintenance access',
        ],
        rating: 4.7,
        reviewCount: 89,
        status: 'operational',
        inspiration: 'D-Marin Göcek Dry Stack',
      },
      {
        id: uuidv4(),
        name: 'Kış Depolama',
        nameEn: 'Winter Storage',
        category: 'guest-services',
        type: 'winter-storage',
        description: 'Kışlık tekne depolama, bakım servisi',
        descriptionEn: 'Winter yacht storage, maintenance service',
        capacity: 80,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '08:00',
          closeTime: '18:00',
          days: [1, 2, 3, 4, 5],
        },
        pricing: {
          type: 'paid',
          price: 5000,
          currency: 'TRY',
          unit: 'per season',
        },
        reservationRequired: true,
        advanceBookingDays: 60,
        cancellationPolicy: 'No refund after November 1st',
        amenities: [
          '24/7 security',
          'Covered storage',
          'Dehumidification',
          'Regular inspection',
          'Maintenance included',
          'Spring commissioning',
        ],
        features: [
          'October-April storage',
          'Winterization service',
          'Battery maintenance',
          'Engine preservation',
          'Regular inspections',
          'Spring launch included',
        ],
        rating: 4.8,
        reviewCount: 167,
        status: 'operational',
        seasonalOperation: {
          openFrom: 'October',
          openTo: 'April',
        },
        inspiration: 'WIM Winter Storage',
      },
      {
        id: uuidv4(),
        name: 'Tender/Bot Depolama',
        nameEn: 'Tender/Dinghy Storage',
        category: 'guest-services',
        type: 'tender-storage',
        description: 'Küçük bot, tender, RIB depolama',
        descriptionEn: 'Small boat, tender, RIB storage',
        capacity: 50,
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '00:00',
          closeTime: '23:59',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'paid',
          price: 300,
          currency: 'TRY',
          unit: 'per month',
        },
        reservationRequired: true,
        advanceBookingDays: 7,
        cancellationPolicy: '7 days notice',
        amenities: ['Security', 'Covered storage', 'Dolly access', 'Wash down'],
        features: [
          'Up to 4m boats',
          'Covered & outdoor options',
          'Davit launch available',
          '24/7 access',
        ],
        rating: 4.5,
        reviewCount: 54,
        status: 'operational',
        inspiration: 'Setur Kalamış',
      },

      // ========================================
      // MARINE SERVICES
      // ========================================
      {
        id: uuidv4(),
        name: 'Fuel Station',
        nameEn: 'Fuel Station',
        category: 'marine-services',
        type: 'fuel',
        description: 'Dizel, benzin yakıt istasyonu',
        descriptionEn: 'Diesel, petrol fuel station',
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '07:00',
          closeTime: '19:00',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'paid',
          price: 0, // Market price
          currency: 'TRY',
          unit: 'per liter',
        },
        reservationRequired: false,
        advanceBookingDays: 0,
        cancellationPolicy: 'N/A',
        amenities: ['Diesel', 'Petrol', 'Oil', 'Pump-out'],
        features: ['Fast service', 'All fuel types', 'Invoicing'],
        rating: 4.6,
        reviewCount: 187,
        status: 'operational',
        inspiration: 'All marinas',
      },
      {
        id: uuidv4(),
        name: 'Palamar Servisi',
        nameEn: 'Mooring Line Service',
        category: 'marine-services',
        type: 'mooring-service',
        description: 'Profesyonel palamar yardımı, bağlama hizmeti',
        descriptionEn: 'Professional mooring assistance, docking service',
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '00:00',
          closeTime: '23:59',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'included', // Included in berth fee for most marinas
          price: 0,
          currency: 'TRY',
        },
        reservationRequired: false,
        advanceBookingDays: 0,
        cancellationPolicy: 'N/A',
        amenities: [
          'Professional crew',
          '24/7 availability',
          'VHF channel monitoring',
          'Line handling',
          'Fender positioning',
        ],
        features: [
          'Bow & stern lines',
          'Spring lines',
          'Fender assistance',
          'Med-mooring support',
          'Emergency assistance',
        ],
        rating: 4.8,
        reviewCount: 423,
        status: 'operational',
        inspiration: 'All premium marinas',
      },
      {
        id: uuidv4(),
        name: 'Palamar Botu (Refakatçi)',
        nameEn: 'Line Boat / Mooring Tender',
        category: 'marine-services',
        type: 'line-boat',
        description: 'Palamar botu ile bağlama yardımı, büyük yatlar için',
        descriptionEn: 'Line boat assistance for mooring, especially for large yachts',
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '06:00',
          closeTime: '22:00',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'included', // Included for berth holders, paid for visitors
          price: 0,
          currency: 'TRY',
        },
        reservationRequired: false,
        advanceBookingDays: 0,
        cancellationPolicy: 'N/A',
        amenities: [
          'Professional crew',
          'VHF monitoring (Ch 9, 69)',
          'Fast response',
          'Line handling equipment',
          'Safety equipment',
        ],
        features: [
          'Arrival assistance',
          'Departure assistance',
          'Med-mooring setup',
          'Anchor drop assistance',
          'Emergency response',
          'Fender positioning',
        ],
        rating: 4.9,
        reviewCount: 512,
        status: 'operational',
        inspiration: 'D-Marin & Setur marinas',
      },
      {
        id: uuidv4(),
        name: 'Water & Electricity',
        nameEn: 'Water & Electricity',
        category: 'marine-services',
        type: 'utilities',
        description: 'Su, elektrik bağlantısı',
        descriptionEn: 'Water, electricity connection',
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '00:00',
          closeTime: '23:59',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'included', // Usually included in berth fee
          price: 0,
          currency: 'TRY',
        },
        reservationRequired: false,
        advanceBookingDays: 0,
        cancellationPolicy: 'N/A',
        amenities: ['Fresh water', '220V/380V power', 'Metered'],
        features: ['24/7 availability', 'Metered usage'],
        rating: 4.7,
        reviewCount: 312,
        status: 'operational',
        inspiration: 'All marinas',
      },
      {
        id: uuidv4(),
        name: 'Pump-Out Station',
        nameEn: 'Pump-Out Station',
        category: 'marine-services',
        type: 'pump-out',
        description: 'Atık su boşaltma istasyonu',
        descriptionEn: 'Waste water pump-out station',
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '08:00',
          closeTime: '18:00',
          days: [1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'paid',
          price: 150,
          currency: 'TRY',
          unit: 'per service',
        },
        reservationRequired: false,
        advanceBookingDays: 0,
        cancellationPolicy: 'N/A',
        amenities: ['Black water', 'Grey water', 'Waste disposal'],
        features: ['Pump-out', 'Waste disposal', 'Environmental compliance'],
        rating: 4.5,
        reviewCount: 76,
        status: 'operational',
        inspiration: 'All marinas',
      },

      // ========================================
      // CONCIERGE SERVICES
      // ========================================
      {
        id: uuidv4(),
        name: 'Concierge Service',
        nameEn: 'Concierge Service',
        category: 'concierge-services',
        type: 'concierge',
        description: 'VIP concierge, rezervasyon, organizasyon',
        descriptionEn: 'VIP concierge, reservations, organization',
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '08:00',
          closeTime: '20:00',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'included', // VIP service
          price: 0,
          currency: 'TRY',
        },
        reservationRequired: false,
        advanceBookingDays: 0,
        cancellationPolicy: 'N/A',
        amenities: ['24/7 assistance', 'Multilingual staff', 'Local knowledge'],
        features: ['Restaurant reservations', 'Tours', 'Taxi', 'Shopping', 'Tickets'],
        managedBy: 'ada.customer',
        rating: 4.9,
        reviewCount: 156,
        status: 'operational',
        inspiration: 'D-Marin Göcek Concierge',
      },
      {
        id: uuidv4(),
        name: 'Car Rental',
        nameEn: 'Car Rental',
        category: 'concierge-services',
        type: 'car-rental',
        description: 'Araç kiralama servisi',
        descriptionEn: 'Car rental service',
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '08:00',
          closeTime: '20:00',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'paid',
          price: 500,
          currency: 'TRY',
          unit: 'per day',
        },
        reservationRequired: true,
        advanceBookingDays: 7,
        cancellationPolicy: '24 hours notice',
        amenities: ['Wide selection', 'Insurance included', 'Delivery to marina'],
        features: ['Economy', 'Comfort', 'SUV', 'Luxury', 'Minivan'],
        rating: 4.4,
        reviewCount: 89,
        status: 'operational',
        inspiration: 'Setur Midilli Car Rental',
      },
      {
        id: uuidv4(),
        name: 'Shuttle Service',
        nameEn: 'Shuttle Service',
        category: 'concierge-services',
        type: 'shuttle',
        description: 'Havaalanı, şehir merkezi transferi',
        descriptionEn: 'Airport, city center shuttle',
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '06:00',
          closeTime: '23:00',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
        pricing: {
          type: 'paid',
          price: 300,
          currency: 'TRY',
          unit: 'per trip',
        },
        reservationRequired: true,
        advanceBookingDays: 3,
        cancellationPolicy: '12 hours notice',
        amenities: ['Comfortable vehicles', 'Professional drivers', 'On-time'],
        features: ['Airport', 'City center', 'Tours', 'Custom routes'],
        rating: 4.7,
        reviewCount: 145,
        status: 'operational',
        inspiration: 'All marinas',
      },
      {
        id: uuidv4(),
        name: 'Yacht Brokerage',
        nameEn: 'Yacht Brokerage',
        category: 'concierge-services',
        type: 'yacht-brokerage',
        description: 'Yat alım-satım, charter hizmetleri',
        descriptionEn: 'Yacht sales, charter services',
        currentOccupancy: 0,
        available: true,
        operatingHours: {
          openTime: '09:00',
          closeTime: '18:00',
          days: [1, 2, 3, 4, 5],
        },
        pricing: {
          type: 'paid',
          price: 0, // Commission based
          currency: 'TRY',
        },
        reservationRequired: true,
        advanceBookingDays: 7,
        cancellationPolicy: 'Flexible',
        amenities: ['Expert brokers', 'Wide network', 'Full service'],
        features: ['Yacht sales', 'Charter', 'Management', 'Surveys', 'Documentation'],
        rating: 4.8,
        reviewCount: 67,
        status: 'operational',
        inspiration: 'D-Marin Göcek Brokerage',
      },
    ];

    facilities.forEach(facility => {
      this.facilities.set(facility.id, facility);
    });
  }

  /**
   * Initialize package deals
   */
  private initializePackages(): void {
    const packages: MarinaPackage[] = [
      {
        id: uuidv4(),
        name: 'Wellness Paketi',
        nameEn: 'Wellness Package',
        description: 'Berth + Spa + Fitness + Havuz erişimi',
        type: 'weekly',
        includes: {
          berth: true,
          berthDuration: 7,
          facilities: [
            { facilityId: '', facilityName: 'Spa & Wellness Center', quantity: 3 },
            { facilityId: '', facilityName: 'Fitness Center', unlimited: true },
            { facilityId: '', facilityName: 'Swimming Pool', unlimited: true },
          ],
        },
        pricing: {
          regular: 8500,
          discounted: 6500,
          savings: 2000,
          savingsPercentage: 23.5,
        },
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        maxGuests: 4,
        popular: true,
        tags: ['wellness', 'spa', 'fitness', 'relaxation'],
        highlights: [
          '3 spa sessions included',
          'Unlimited gym access',
          'Pool & beach club',
          'Save 2,000 TRY',
        ],
      },
      {
        id: uuidv4(),
        name: 'VIP Berth Paketi',
        nameEn: 'VIP Berth Package',
        description: 'Premium berth + Tüm facility erişimi',
        type: 'monthly',
        includes: {
          berth: true,
          berthDuration: 30,
          facilities: [
            { facilityId: '', facilityName: 'Beach Club', unlimited: true },
            { facilityId: '', facilityName: 'Concierge Service', unlimited: true },
            { facilityId: '', facilityName: 'Meeting Rooms', quantity: 10 },
            { facilityId: '', facilityName: 'Restaurant', unlimited: true },
          ],
        },
        pricing: {
          regular: 28000,
          discounted: 22000,
          savings: 6000,
          savingsPercentage: 21.4,
        },
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        maxGuests: 8,
        popular: true,
        tags: ['vip', 'luxury', 'premium', 'exclusive'],
        highlights: [
          'Premium berth location',
          'Beach club access',
          'VIP concierge',
          'Save 6,000 TRY',
        ],
      },
      {
        id: uuidv4(),
        name: 'Aile Paketi',
        nameEn: 'Family Package',
        description: 'Berth + Çocuk kulübü + Aktiviteler',
        type: 'weekly',
        includes: {
          berth: true,
          berthDuration: 7,
          facilities: [
            { facilityId: '', facilityName: 'Kids Club', unlimited: true },
            { facilityId: '', facilityName: 'Swimming Pool', unlimited: true },
            { facilityId: '', facilityName: 'Beach Club', unlimited: true },
            { facilityId: '', facilityName: 'Restaurant', quantity: 14 },
          ],
        },
        pricing: {
          regular: 9500,
          discounted: 7500,
          savings: 2000,
          savingsPercentage: 21.1,
        },
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        maxGuests: 6,
        popular: false,
        tags: ['family', 'kids', 'activities', 'fun'],
        highlights: [
          'Kids club included',
          'Family meals',
          'Beach & pool access',
          'Save 2,000 TRY',
        ],
      },
    ];

    packages.forEach(pkg => {
      this.packages.set(pkg.id, pkg);
    });
  }

  /**
   * Get all facilities
   */
  getAllFacilities(): MarinaFacility[] {
    return Array.from(this.facilities.values());
  }

  /**
   * Get facilities by category
   */
  getFacilitiesByCategory(category: FacilityCategory): MarinaFacility[] {
    return Array.from(this.facilities.values())
      .filter(f => f.category === category);
  }

  /**
   * Get facility by ID
   */
  getFacility(facilityId: string): MarinaFacility | undefined {
    return this.facilities.get(facilityId);
  }

  /**
   * Check facility availability
   */
  checkAvailability(facilityId: string, date: Date, timeSlot?: { start: string; end: string }): {
    available: boolean;
    reason?: string;
  } {
    const facility = this.facilities.get(facilityId);

    if (!facility) {
      return { available: false, reason: 'Facility not found' };
    }

    if (!facility.available || facility.status !== 'operational') {
      return { available: false, reason: `Facility is ${facility.status}` };
    }

    // Check capacity
    if (facility.capacity && facility.currentOccupancy >= facility.capacity) {
      return { available: false, reason: 'Facility at full capacity' };
    }

    // Check if date is in operating season
    if (facility.seasonalOperation) {
      // Simplified check - in production, use proper date logic
      const month = date.getMonth() + 1; // 1-12
      const openMonths = [5, 6, 7, 8, 9, 10]; // May-October for example
      if (!openMonths.includes(month)) {
        return { available: false, reason: 'Facility closed for season' };
      }
    }

    return { available: true };
  }

  /**
   * Book facility
   */
  bookFacility(data: {
    facilityId: string;
    customerId: string;
    customerName: string;
    date: Date;
    timeSlot?: { start: string; end: string };
    partySize?: number;
    specialRequests?: string;
  }): FacilityReservation | { error: string } {
    const facility = this.facilities.get(data.facilityId);

    if (!facility) {
      return { error: 'Facility not found' };
    }

    const availability = this.checkAvailability(data.facilityId, data.date, data.timeSlot);
    if (!availability.available) {
      return { error: availability.reason || 'Not available' };
    }

    const reservation: FacilityReservation = {
      id: uuidv4(),
      facilityId: data.facilityId,
      facilityName: facility.name,
      customerId: data.customerId,
      customerName: data.customerName,
      date: data.date,
      timeSlot: data.timeSlot || { start: '00:00', end: '23:59' },
      partySize: data.partySize,
      status: 'confirmed',
      specialRequests: data.specialRequests,
      price: facility.pricing.price || 0,
      paid: false,
      createdDate: new Date(),
      confirmedDate: new Date(),
    };

    this.reservations.set(reservation.id, reservation);
    facility.currentOccupancy++;

    return reservation;
  }

  /**
   * Get all packages
   */
  getAllPackages(): MarinaPackage[] {
    return Array.from(this.packages.values());
  }

  /**
   * Get popular packages
   */
  getPopularPackages(): MarinaPackage[] {
    return Array.from(this.packages.values())
      .filter(p => p.popular)
      .sort((a, b) => b.pricing.savingsPercentage - a.pricing.savingsPercentage);
  }

  /**
   * Get facility statistics
   */
  getStatistics(): {
    totalFacilities: number;
    byCategory: Record<FacilityCategory, number>;
    operationalFacilities: number;
    totalReservations: number;
    averageRating: number;
    popularFacilities: Array<{ name: string; rating: number; reviews: number }>;
  } {
    const facilities = Array.from(this.facilities.values());

    const byCategory: Record<FacilityCategory, number> = {
      'shore-facilities': 0,
      'wellness-leisure': 0,
      'business-social': 0,
      'technical-services': 0,
      'guest-services': 0,
      'marine-services': 0,
      'concierge-services': 0,
    };

    facilities.forEach(f => {
      byCategory[f.category]++;
    });

    const operationalFacilities = facilities.filter(f => f.status === 'operational').length;

    const totalRating = facilities.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = totalRating / facilities.length;

    const popularFacilities = facilities
      .sort((a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount)
      .slice(0, 5)
      .map(f => ({ name: f.name, rating: f.rating, reviews: f.reviewCount }));

    return {
      totalFacilities: facilities.length,
      byCategory,
      operationalFacilities,
      totalReservations: this.reservations.size,
      averageRating: Math.round(averageRating * 10) / 10,
      popularFacilities,
    };
  }
}
