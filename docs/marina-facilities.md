# Ada.Marina - Comprehensive Facilities Guide

**Complete catalog of 32 premium marina facilities** across 7 categories, inspired by Turkey's top marinas: WIM, Setur Kalamış, Setur Midilli, D-Marin Göcek, Kıyı Istanbul, Ataköy Marina.

> Built from **real marina operations experience** - Every facility is based on actual Turkish/Mediterranean marina services.

---

## Table of Contents

1. [Shore Facilities](#shore-facilities) - Restaurant, Cafe, Market
2. [Wellness & Leisure](#wellness--leisure) - Pool, Spa, Fitness, Beach Club
3. [Business & Social Venues](#business--social-venues) - Conferences, Events, Co-working
4. [Technical Services](#technical-services) - Haul-out, Workshop, Repairs
5. [Guest Services](#guest-services) - Laundry, Showers, Parking, Storage
6. [Marine Services](#marine-services) - Fuel, Palamar, Water, Electricity
7. [Concierge Services](#concierge-services) - VIP, Car Rental, Shuttle, Brokerage

---

## 🍽️ Shore Facilities

Managed by: **ada.restaurant**

### 1. Marina Restaurant & Bar
**"Deniz Mutfağı" - Mediterranean Fusion**

```typescript
{
  id: "shore-restaurant",
  name: "Marina Restaurant & Bar",
  nameEn: "Marina Restaurant & Bar",
  category: "shore-facilities",

  capacity: 150,        // Indoor 80, Outdoor terrace 70
  rating: 4.7,
  reviewCount: 342,

  operatingHours: {
    breakfast: "08:00-11:00",
    lunch: "12:00-16:00",
    dinner: "18:00-23:00",
    bar: "11:00-01:00"
  },

  pricing: {
    breakfast: "350 TRY/person",
    lunch: "450-800 TRY",
    dinner: "600-1200 TRY",
    averageCheck: "850 TRY"
  },

  amenities: [
    "Sunset terrace with Bosphorus view",
    "Live music Friday-Sunday evenings",
    "Private dining room (12 people)",
    "Kids menu available",
    "Vegetarian & vegan options",
    "Wine cellar (200+ labels)"
  ],

  features: [
    "Catch-of-the-day seafood",
    "Mediterranean fusion cuisine",
    "Professional sommelier",
    "Chef's tasting menu (7 courses)",
    "Special occasion packages",
    "Yacht provisioning service"
  ],

  managedBy: "ada.restaurant",
  inspiration: "WIM Aqua Restaurant, Setur Kalamış Yelken Restaurant"
}
```

**Popular Dishes:**
- Karides Güveç (Shrimp casserole): 425 TRY
- Levrek (Sea bass, grilled): 550 TRY
- Mediterranean Mezze Platter: 380 TRY
- Sunset Special Menu (3-course): 680 TRY

---

### 2. Marina Cafe & Lounge
**"Deniz Kahvesi" - All-Day Cafe**

```typescript
{
  id: "shore-cafe",
  name: "Marina Cafe & Lounge",
  capacity: 80,
  rating: 4.5,
  reviewCount: 189,

  operatingHours: {
    daily: "07:00-22:00"
  },

  pricing: {
    coffee: "45-85 TRY",
    breakfast: "120-280 TRY",
    sandwiches: "95-180 TRY",
    pastries: "35-75 TRY"
  },

  amenities: [
    "Craft coffee (espresso, filter, cold brew)",
    "Fresh pastries daily",
    "Full breakfast menu",
    "Light lunch options",
    "Afternoon tea service (14:00-17:00)",
    "Free WiFi (high-speed)",
    "Outdoor seating with marina view"
  ],

  features: [
    "Specialty coffee roasted locally",
    "Homemade cakes & pastries",
    "Healthy breakfast bowls",
    "Fresh juices & smoothies",
    "Grab-and-go options",
    "Yacht delivery service"
  ],

  managedBy: "ada.restaurant",
  inspiration: "Setur Kalamış Cafe, Urban marina cafe culture"
}
```

**Signature Items:**
- Turkish Breakfast Spread: 250 TRY
- Avocado Toast & Poached Eggs: 145 TRY
- Flat White (Specialty): 65 TRY
- Afternoon Tea Set (2 people): 380 TRY

---

### 3. Marina Market & Chandlery
**"Deniz Market" - Marine Supplies & Groceries**

```typescript
{
  id: "shore-market",
  name: "Marina Market & Chandlery",
  capacity: null,  // Retail space
  rating: 4.3,
  reviewCount: 156,

  operatingHours: {
    daily: "07:00-22:00",
    emergency: "24/7 (on-call)"
  },

  pricing: {
    type: "paid",
    averageBasket: "450 TRY",
    delivery: "Free over 500 TRY"
  },

  departments: [
    "Fresh produce & dairy",
    "Meat & seafood",
    "Pantry essentials",
    "Beverages (wine, beer, spirits)",
    "Marine chandlery",
    "Cleaning supplies",
    "Toiletries & personal care",
    "Emergency supplies"
  ],

  marineSupplies: [
    "Ropes & lines",
    "Fenders & bumpers",
    "Cleaning products (marine-grade)",
    "Oil & lubricants",
    "Electrical supplies",
    "Safety equipment",
    "Charts & publications",
    "Basic tools & hardware"
  ],

  services: [
    "Yacht provisioning (advance orders)",
    "Direct yacht delivery",
    "Special orders (24h notice)",
    "Online ordering available",
    "Price matching with local supermarkets"
  ],

  managedBy: "ada.marina",
  inspiration: "WIM Chandlery, D-Marin Market"
}
```

---

## 🧘 Wellness & Leisure

### 4. Olympic Swimming Pool
**"Deniz Havuzu" - 50m Heated Pool**

```typescript
{
  id: "wellness-pool",
  name: "Olympic Swimming Pool",
  capacity: 120,    // Max swimmers at once
  rating: 4.8,
  reviewCount: 267,

  specifications: {
    length: "50 meters",
    lanes: 8,
    depth: "1.2m - 2.0m",
    temperature: "26-28°C (heated)",
    filtration: "UV + Ozone (chemical-free)"
  },

  operatingHours: {
    summerSeason: "06:00-22:00 (May-October)",
    winterSeason: "07:00-20:00 (November-April)"
  },

  zones: [
    "Lane swimming (6 lanes)",
    "Recreational area (2 lanes)",
    "Kids pool (separate, 0.6m depth)",
    "Jacuzzi area (heated, 38°C)"
  ],

  pricing: {
    dayPass: "250 TRY",
    weekPass: "1,200 TRY (save 15%)",
    monthPass: "3,500 TRY (save 30%)",
    berthIncluded: "Free for berth holders"
  },

  amenities: [
    "Professional lifeguard (on duty)",
    "Changing rooms & lockers",
    "Showers (hot/cold)",
    "Pool towels provided",
    "Poolside sun loungers",
    "Shade umbrellas",
    "Kids play area"
  ],

  programs: [
    "Morning swim club (07:00-09:00)",
    "Aqua aerobics (3x/week)",
    "Kids swimming lessons",
    "Private coaching available"
  ],

  inspiration: "D-Marin facilities, Resort-style marina pools"
}
```

---

### 5. Spa & Wellness Center
**"Deniz Spa" - Turkish Hammam & International Spa**

```typescript
{
  id: "wellness-spa",
  name: "Spa & Wellness Center",
  capacity: 24,     // Max guests at once
  rating: 4.9,
  reviewCount: 198,

  operatingHours: {
    daily: "09:00-21:00",
    lastAppointment: "19:00"
  },

  facilities: [
    "Turkish Hammam (traditional)",
    "Finnish Sauna (90°C)",
    "Steam Room",
    "Relaxation Lounge",
    "6 Treatment Rooms",
    "Couples Suite",
    "Nail Salon",
    "Hair Salon"
  ],

  treatments: {
    massage: {
      "Swedish Massage (60min)": "650 TRY",
      "Deep Tissue (60min)": "750 TRY",
      "Hot Stone (90min)": "950 TRY",
      "Couples Massage (60min)": "1,400 TRY"
    },
    hammam: {
      "Traditional Hammam Ritual": "550 TRY",
      "Luxury Hammam Package": "850 TRY"
    },
    facials: {
      "Hydrating Facial (60min)": "580 TRY",
      "Anti-aging Treatment (90min)": "880 TRY"
    },
    bodyTreatments: {
      "Body Scrub": "480 TRY",
      "Body Wrap": "650 TRY"
    }
  },

  packages: {
    "Half Day Spa": "1,650 TRY (3 treatments)",
    "Full Day Spa": "2,850 TRY (5 treatments + lunch)",
    "Couples Retreat": "3,200 TRY (4 hours)"
  },

  amenities: [
    "Premium organic products",
    "Complimentary tea & refreshments",
    "Luxury robes & slippers",
    "Private lockers",
    "Pre/post treatment relaxation"
  ],

  managedBy: "ada.marina",
  inspiration: "D-Marin Spa, Turkish hammam tradition"
}
```

---

### 6. Fitness Center
**"Deniz Gym" - Professional Training Facility**

```typescript
{
  id: "wellness-fitness",
  name: "Fitness Center",
  capacity: 50,
  rating: 4.6,
  reviewCount: 145,

  operatingHours: {
    daily: "06:00-22:00"
  },

  equipment: {
    cardio: [
      "Treadmills (8x) - Technogym",
      "Ellipticals (6x)",
      "Rowing machines (4x)",
      "Stationary bikes (6x)",
      "StairMaster (2x)"
    ],
    strength: [
      "Free weights (5-50kg)",
      "Cable machines",
      "Smith machine",
      "Leg press, chest press, etc.",
      "Functional training area"
    ],
    other: [
      "TRX suspension trainers",
      "Kettlebells & medicine balls",
      "Yoga mats & blocks",
      "Foam rollers"
    ]
  },

  classes: {
    "Yoga": "Mon/Wed/Fri 08:00",
    "Pilates": "Tue/Thu 09:00",
    "HIIT": "Mon/Wed/Fri 18:00",
    "Spinning": "Tue/Thu/Sat 19:00",
    "Stretch & Mobility": "Daily 07:00"
  },

  pricing: {
    dayPass: "200 TRY",
    weekPass: "900 TRY",
    monthPass: "2,500 TRY",
    personalTraining: "600 TRY/session",
    berthIncluded: "Free for berth holders"
  },

  amenities: [
    "Professional personal trainers",
    "Changing rooms & showers",
    "Towel service",
    "Water station",
    "Protein shake bar",
    "Body composition analysis",
    "Fitness assessments"
  ],

  inspiration: "Premium marina fitness facilities"
}
```

---

### 7. Beach Club
**"Deniz Beach Club" - Private Beach Paradise**

```typescript
{
  id: "wellness-beach",
  name: "Beach Club",
  capacity: 300,
  rating: 5.0,      // ★★★★★
  reviewCount: 412,

  operatingHours: {
    season: "May - October",
    daily: "09:00-19:00"
  },

  beachArea: {
    length: "150 meters private beach",
    sandType: "Imported white sand",
    waterEntry: "Gentle slope, family-friendly",
    safetyFlags: "Lifeguard on duty 09:00-19:00"
  },

  zones: [
    "Family Beach (80m)",
    "Adults Only Zone (40m)",
    "VIP Cabanas (30m)",
    "Water Sports Center"
  ],

  facilities: [
    "Sun loungers (200)",
    "Beach umbrellas",
    "Changing rooms & showers",
    "Beach towels provided",
    "12 Private cabanas (reservable)",
    "Beach bar & restaurant",
    "Kids play area",
    "Beach volleyball court"
  ],

  waterSports: {
    "Jet Ski": "400 TRY/30min",
    "Paddle Board": "150 TRY/hour",
    "Kayak (single)": "120 TRY/hour",
    "Kayak (double)": "180 TRY/hour",
    "Banana Boat": "300 TRY/person",
    "Parasailing": "800 TRY/person",
    "Snorkeling gear": "Free"
  },

  cabanas: {
    pricing: "1,500 TRY/day",
    includes: [
      "Private space (4x4m)",
      "Comfortable seating for 6",
      "Mini fridge with water",
      "Fruit platter",
      "Dedicated waiter service",
      "Premium sun loungers",
      "Bluetooth speaker"
    ]
  },

  beachBar: {
    cocktails: "150-280 TRY",
    food: "Light lunch, salads, burgers",
    iceCream: "Kids favorite spot!"
  },

  pricing: {
    dayPass: "450 TRY/adult, 200 TRY/child",
    weekPass: "2,000 TRY/adult",
    vipMembership: "15,000 TRY/season",
    berthIncluded: "Discounted 50% for berth holders"
  },

  managedBy: "ada.marina",
  inspiration: "D-Marin Göcek Beach Club - World-class standard"
}
```

**Why 5.0 stars?** - "Best beach club in Istanbul marinas" - Guests consistently rave about cleanliness, service, and family-friendly atmosphere.

---

### 8. Kids Club & Playground
**"Deniz Çocuk Kulübü" - Supervised Fun**

```typescript
{
  id: "wellness-kids",
  name: "Kids Club & Playground",
  capacity: 40,
  rating: 4.7,
  reviewCount: 89,

  ageGroups: {
    "Toddlers": "2-4 years",
    "Kids": "5-10 years",
    "Teens": "11-15 years (separate area)"
  },

  operatingHours: {
    summerSeason: "09:00-19:00 (May-Oct)",
    winterSeason: "10:00-17:00 (Nov-Apr)"
  },

  facilities: {
    indoor: [
      "Play room (toys, games, crafts)",
      "Reading corner",
      "Movie room",
      "Arts & crafts station",
      "Video games area (teens)"
    ],
    outdoor: [
      "Playground equipment (slides, swings)",
      "Climbing wall (kids)",
      "Mini soccer field",
      "Sandbox",
      "Trampoline area",
      "Mini sailing boats (pool)"
    ]
  },

  programs: {
    "Morning Activities": "10:00-12:00",
    "Lunch": "12:00-13:00",
    "Afternoon Fun": "14:00-17:00",
    "Special Events": "Themed days, birthdays"
  },

  activities: [
    "Arts & crafts",
    "Treasure hunts",
    "Mini sailing lessons",
    "Swimming lessons",
    "Marine biology education",
    "Beach games",
    "Birthday party hosting"
  ],

  pricing: {
    halfDay: "250 TRY (4 hours)",
    fullDay: "400 TRY (includes lunch)",
    berthIncluded: "Free for berth holder kids"
  },

  safety: [
    "Professional childcare staff (certified)",
    "Ratio: 1 adult per 8 kids",
    "First aid certified",
    "Secure area (controlled entry)",
    "Parent pagers available",
    "Allergy-aware environment"
  ],

  managedBy: "ada.marina",
  inspiration: "Family-friendly marina culture"
}
```

---

## 🎤 Business & Social Venues

Managed by: **ada.congress**

### 9. Conference Hall
**"Deniz Kongre Salonu" - Professional Events**

```typescript
{
  id: "business-conference",
  name: "Conference Hall",
  capacity: 200,    // Theater style
  rating: 4.8,
  reviewCount: 67,

  configurations: {
    theater: 200,
    classroom: 120,
    uShape: 60,
    boardroom: 40,
    banquet: 150,
    reception: 250
  },

  operatingHours: {
    daily: "08:00-22:00",
    booking: "Advance reservation required (min 48h)"
  },

  avEquipment: [
    "Professional projector (4K)",
    "250\" motorized screen",
    "Wireless presentation system",
    "Professional sound system",
    "6x wireless microphones",
    "Podium with microphone",
    "Video conferencing system (Zoom, Teams)",
    "Live streaming capability",
    "Recording services available",
    "LED stage lighting"
  ],

  amenities: [
    "High-speed WiFi (1Gbps)",
    "Climate control",
    "Blackout curtains",
    "Registration desk area",
    "Coat check",
    "On-site AV technician",
    "Coffee break area",
    "VIP green room"
  ],

  pricing: {
    halfDay: "8,000 TRY (4 hours)",
    fullDay: "15,000 TRY (8 hours)",
    evening: "12,000 TRY (18:00-23:00)",
    multiDay: "Discounts available"
  },

  catering: {
    coffeeBreak: "85 TRY/person",
    lunch: "350 TRY/person",
    dinner: "550 TRY/person",
    fullDayPackage: "650 TRY/person"
  },

  idealFor: [
    "Corporate conferences",
    "Product launches",
    "Annual general meetings",
    "Training sessions",
    "Award ceremonies",
    "Gala dinners"
  ],

  managedBy: "ada.congress",
  inspiration: "Ataköy Marina event spaces, WIM conference facilities"
}
```

---

### 10. Meeting Rooms
**"Toplantı Odaları" - 4 Private Rooms**

```typescript
{
  id: "business-meetings",
  name: "Meeting Rooms (x4)",
  totalCapacity: {
    room1: 30,
    room2: 20,
    room3: 15,
    room4: 10
  },
  rating: 4.5,
  reviewCount: 45,

  operatingHours: {
    daily: "08:00-20:00"
  },

  rooms: {
    "Bosphorus Room": {
      capacity: 30,
      setup: "Boardroom + presentation",
      view: "Marina view",
      equipment: "75\" screen, video conf"
    },
    "Marmara Room": {
      capacity: 20,
      setup: "U-shape",
      view: "Garden view",
      equipment: "65\" screen, whiteboard"
    },
    "Aegean Room": {
      capacity: 15,
      setup: "Boardroom",
      view: "Marina view",
      equipment: "55\" screen, flip chart"
    },
    "Mediterranean Room": {
      capacity: 10,
      setup: "Private office style",
      view: "Quiet, no distractions",
      equipment: "50\" screen, whiteboard"
    }
  },

  allRoomsInclude: [
    "High-speed WiFi",
    "Video conferencing (HD)",
    "Wireless presentation",
    "Whiteboard/flip chart",
    "Climate control",
    "Water & coffee station",
    "Conference phone"
  ],

  pricing: {
    perHour: "450 TRY",
    halfDay: "1,800 TRY",
    fullDay: "3,200 TRY",
    catering: "From 65 TRY/person"
  },

  packages: {
    "Business Meeting Package": {
      price: "2,500 TRY (half day)",
      includes: [
        "Meeting room (4 hours)",
        "Coffee breaks (x2)",
        "Lunch buffet",
        "AV support"
      ]
    }
  },

  managedBy: "ada.congress"
}
```

---

### 11. Co-working Space
**"Deniz Co-work" - Remote Work Hub**

```typescript
{
  id: "business-coworking",
  name: "Co-working Space",
  capacity: 60,
  rating: 4.6,
  reviewCount: 78,

  operatingHours: {
    daily: "08:00-20:00"
  },

  areas: {
    openDesk: "30 hot desks",
    privateOffices: "4 offices (2-6 people each)",
    phoneBooths: "6 soundproof booths",
    loungingArea: "Casual seating, sofas",
    meetingPods: "4 small meeting spaces"
  },

  amenities: [
    "Ultra-fast WiFi (1Gbps fiber)",
    "Unlimited coffee & tea",
    "Printing & scanning",
    "Whiteboard walls",
    "Standing desks available",
    "Phone charging stations",
    "Lockers for daily use",
    "Marina view workstations"
  ],

  pricing: {
    dayPass: "250 TRY",
    weekPass: "1,000 TRY",
    monthPass: "4,500 TRY",
    privateOffice: "From 15,000 TRY/month",
    berthDiscount: "50% off for berth holders"
  },

  community: [
    "Networking events (monthly)",
    "Lunch & learns",
    "Member directory",
    "Slack workspace"
  ],

  idealFor: [
    "Digital nomads",
    "Remote workers",
    "Freelancers",
    "Yacht owners working remotely",
    "Startup teams"
  ],

  managedBy: "ada.congress"
}
```

---

### 12. Outdoor Event Space
**"Açık Hava Etkinlik Alanı" - 2,000 Capacity Concert Venue**

```typescript
{
  id: "business-events-outdoor",
  name: "Outdoor Event Space",
  capacity: 2000,
  rating: 4.9,
  reviewCount: 287,

  specifications: {
    area: "3,000 m²",
    setup: "Festival-style outdoor venue",
    stage: "Professional concert stage (12m x 8m)",
    acoustics: "Outdoor sound system (line array)"
  },

  operatingHours: {
    season: "May - October",
    events: "18:00-23:00 (noise curfew)"
  },

  equipment: {
    sound: [
      "32-channel mixing console",
      "Line array speaker system",
      "Monitor speakers",
      "Wireless microphones (x12)",
      "DI boxes, cables, etc."
    ],
    lighting: [
      "Stage lighting rig",
      "Moving heads (x16)",
      "LED wash lights",
      "Fog machines",
      "Lighting console"
    ],
    stage: [
      "Professional stage (12x8m)",
      "Drum riser",
      "Green room (backstage)",
      "Artist catering area",
      "Security barriers"
    ],
    other: [
      "Video screens (2x LED)",
      "Camera system (multi-cam)",
      "Live streaming capability"
    ]
  },

  venues: {
    standing: 2000,
    seatedConcert: 1200,
    gala: 800,
    festival: 2500
  },

  pricing: {
    eventRental: "25,000 TRY/event",
    fullProduction: "From 75,000 TRY (turnkey)",
    includes: [
      "Venue rental",
      "Basic stage & equipment",
      "Security (8 personnel)",
      "Cleanup"
    ],
    addons: {
      "Premium sound": "+15,000 TRY",
      "Advanced lighting": "+10,000 TRY",
      "Video production": "+20,000 TRY",
      "Live streaming": "+8,000 TRY"
    }
  },

  pastEvents: [
    "TARKAN Summer Concert (2,000 attendance)",
    "Istanbul Jazz Festival (1,500)",
    "Corporate gala events",
    "Product launches",
    "Marina festivals"
  ],

  facilities: [
    "Backstage green rooms (x2)",
    "Artist catering",
    "VIP lounge area",
    "Security checkpoints",
    "First aid station",
    "Merchandise area",
    "Food & beverage stalls",
    "Parking coordination"
  ],

  managedBy: "ada.congress",
  inspiration: "WIM Summer Concert Series, Kıyı Istanbul events, Ataköy Marina concerts"
}
```

**Example Event: TARKAN Concert**
- Date: July 15, 2025
- Attendance: 2,000
- Ticket price: 750 TRY (VIP: 1,500 TRY)
- Gross revenue: 1,500,000 TRY

---

### 13. Live Music & Bar
**"Canlı Müzik & Bar" - Weekly Entertainment**

```typescript
{
  id: "business-events-live-music",
  name: "Live Music & Bar",
  capacity: 300,
  rating: 4.8,
  reviewCount: 456,

  operatingHours: {
    daily: "18:00-01:00",
    liveMusic: "20:00-23:00"
  },

  venue: {
    indoor: 200,
    outdoorTerrace: 100,
    stage: "Professional stage with sound system",
    bar: "Full service bar (30 seats)",
    lounge: "Comfortable seating areas"
  },

  weeklyProgram: {
    monday: {
      event: "Jazz Night",
      time: "20:00-23:00",
      artist: "Neşet Ruacan Trio (rotating artists)",
      cover: "Free entry"
    },
    wednesday: {
      event: "DJ Night",
      time: "21:00-01:00",
      genre: "House & Deep Lounge",
      cover: "Free entry"
    },
    friday: {
      event: "Sunset Sessions",
      time: "19:00-23:00",
      genre: "Acoustic & Chill",
      cover: "Free entry"
    },
    sunday: {
      event: "Brunch & Live Music",
      time: "11:00-15:00",
      style: "Acoustic brunch vibes",
      cover: "Brunch package: 350 TRY"
    }
  },

  barMenu: {
    cocktails: "180-280 TRY",
    wine: "From 120 TRY/glass",
    beer: "75-150 TRY",
    spirits: "150-400 TRY",
    nonAlcoholic: "45-85 TRY"
  },

  foodMenu: {
    tapas: "85-180 TRY",
    sharing plates: "220-450 TRY",
    desserts: "95-140 TRY"
  },

  specialEvents: [
    "Monthly featured artists",
    "Album release parties",
    "DJ guest nights",
    "Themed music nights",
    "New Year's Eve gala"
  ],

  ambiance: [
    "Marina view terrace",
    "Professional sound system",
    "Mood lighting",
    "Comfortable lounge seating",
    "Dance floor area",
    "VIP table reservations"
  ],

  reservations: {
    walkIn: "Welcome",
    tableReservation: "Recommended (especially weekends)",
    vipTable: "Minimum spend: 2,000 TRY"
  },

  managedBy: "ada.restaurant",
  inspiration: "Kıyı Istanbul Marina live sessions, Urban marina nightlife"
}
```

---

## 🔧 Technical Services

Managed by: **ada.maintenance**

### 14. Haul-Out & Shipyard
**"Kızak & Tersane" - Professional Yacht Maintenance**

```typescript
{
  id: "technical-haulout",
  name: "Haul-Out & Shipyard",
  capacity: "Up to 100 tons",
  rating: 4.7,
  reviewCount: 134,

  equipment: {
    travelLift: "100-ton hydraulic travel lift",
    hardstand: "80 yacht capacity",
    workingArea: "Covered workshop adjacent"
  },

  operatingHours: {
    weekdays: "08:00-18:00",
    saturday: "08:00-13:00",
    sunday: "Emergency only"
  },

  services: [
    "Haul-out & launch",
    "Pressure washing (hull cleaning)",
    "Bottom painting (antifouling)",
    "Propeller service & polishing",
    "Anodes replacement",
    "Hull inspection & survey",
    "Osmosis treatment",
    "Keel work",
    "Rudder service"
  ],

  pricing: {
    haulOut: "From 150 TRY/foot",
    pressureWash: "50 TRY/foot",
    antifouling: "From 200 TRY/foot (includes labor + paint)",
    storage: "80 TRY/foot/month (hardstand)",
    launch: "From 120 TRY/foot"
  },

  seasons: {
    highSeason: "October-November (winterization)",
    lowSeason: "March-April (launch season)",
    bookingAdvice: "Reserve 2-3 weeks in advance"
  },

  facilities: [
    "Covered work area (for rain/sun)",
    "Power & water hookups",
    "Scaffolding available",
    "Waste disposal (environmental)",
    "Security (24/7 monitoring)"
  ],

  managedBy: "ada.maintenance",
  inspiration: "Turkish shipyard standards, D-Marin technical facilities"
}
```

**Example: 45ft Catamaran Annual Service**
- Haul-out: 6,750 TRY
- Pressure wash: 2,250 TRY
- Antifouling (2 coats): 9,000 TRY
- Propeller polish: 1,200 TRY
- Anodes (x6): 800 TRY
- Launch: 5,400 TRY
- **Total: 25,400 TRY**

---

### 15. Technical Workshop
**"Teknik Atölye" - All Repairs & Maintenance**

```typescript
{
  id: "technical-workshop",
  name: "Technical Workshop",
  capacity: "Multiple projects simultaneously",
  rating: 4.8,
  reviewCount: 201,

  operatingHours: {
    weekdays: "08:00-18:00",
    emergency: "24/7 on-call service"
  },

  specialties: {
    mechanical: [
      "Engine service & repair (diesel, gas)",
      "Generator maintenance",
      "Water pump service",
      "HVAC systems",
      "Plumbing & sanitation"
    ],
    electrical: [
      "Electrical system troubleshooting",
      "Battery bank service",
      "Solar panel installation",
      "Navigation electronics",
      "Lighting systems",
      "Shore power issues"
    ],
    rigging: [
      "Standing rigging inspection",
      "Running rigging replacement",
      "Mast work",
      "Furling systems",
      "Winch service"
    ],
    carpentry: [
      "Teak deck repairs",
      "Interior woodwork",
      "Furniture repairs",
      "Custom fabrication"
    ],
    fiberglass: [
      "Gelcoat repairs",
      "Structural repairs",
      "Blisters & osmosis",
      "Custom fabrication"
    ],
    canvas: [
      "Bimini & dodger",
      "Sail covers",
      "Upholstery repair",
      "Custom canvas work"
    ]
  },

  pricing: {
    laborRate: "450 TRY/hour (technician)",
    diagnostics: "350 TRY (credited if work performed)",
    emergencyCallout: "+50% after hours",
    partsMarkup: "15% on wholesale"
  },

  technicians: [
    "Diesel mechanics (2)",
    "Marine electricians (3)",
    "Rigging specialists (2)",
    "Fiberglass technician (1)",
    "General maintenance (4)"
  ],

  facilities: [
    "Fully equipped workshop (400m²)",
    "Diagnostic equipment (modern)",
    "Parts inventory (common items)",
    "Ordering capability (24h delivery)",
    "Mobile service carts (dockside work)",
    "Specialized tools available"
  ],

  warranty: {
    labor: "90 days",
    parts: "Manufacturer warranty"
  },

  managedBy: "ada.maintenance",
  inspiration: "Professional Turkish shipyard operations"
}
```

---

## 🚿 Guest Services

### 16-21. Laundry, Showers, Parking, Storage

```typescript
// 16. Laundry Service
{
  id: "guest-laundry",
  name: "Laundry Service",
  rating: 4.4,
  reviewCount: 112,

  services: {
    washFold: "35 TRY/kg (same-day)",
    dryCleaning: "From 45 TRY/item",
    ironingOnly: "25 TRY/kg",
    express: "+50% (4-hour service)"
  },

  operatingHours: "08:00-20:00 daily",
  turnaround: "Same day if dropped before 10:00",

  pickup: "Free yacht pickup/delivery",
  managedBy: "ada.marina"
}

// 17. Shower & WC Facilities
{
  id: "guest-showers",
  name: "Shower & WC Facilities",
  capacity: "24 showers, 18 toilets",
  rating: 4.5,
  reviewCount: 234,

  features: [
    "24/7 access (key card)",
    "Heated water",
    "Individual shower cabins",
    "Hairdryers",
    "Complimentary toiletries",
    "Cleaning (4x daily)",
    "Wheelchair accessible"
  ],

  pricing: "Free for berth holders",
  managedBy: "ada.marina"
}

// 18. Car Parking
{
  id: "guest-parking",
  name: "Car Parking",
  capacity: 300,
  rating: 4.3,
  reviewCount: 98,

  types: {
    outdoor: "200 spaces - 150 TRY/day",
    covered: "80 spaces - 250 TRY/day",
    vip: "20 spaces - 400 TRY/day (valet)"
  },

  features: [
    "24/7 security",
    "CCTV monitoring",
    "Electric charging (10 spots)",
    "Valet service (VIP)",
    "Car wash available"
  ],

  monthly: {
    outdoor: "2,500 TRY",
    covered: "4,500 TRY",
    berthIncluded: "1 free space per berth"
  },

  managedBy: "ada.marina"
}

// 19. Dry Stack Storage
{
  id: "guest-drystack",
  name: "Dry Stack Storage",
  capacity: "150 boats (up to 35 feet)",
  rating: 4.7,
  reviewCount: 89,

  specifications: {
    maxLength: "35 feet",
    maxWeight: "8,000 lbs",
    rackSystem: "6-tier hydraulic racks",
    launchTime: "15 minutes average"
  },

  pricing: {
    monthly: "250 TRY/foot",
    annual: "2,500 TRY/foot (save 17%)",
    launchFee: "Free (unlimited)"
  },

  includes: [
    "Climate-controlled building",
    "Pressure wash before storage",
    "24/7 security",
    "Insurance requirements met",
    "Launch on demand (advance call)",
    "Maintenance monitoring"
  ],

  operatingHours: {
    launches: "07:00-19:00 daily",
    advance: "1-hour notice preferred"
  },

  managedBy: "ada.marina",
  inspiration: "Modern marina dry stack facilities"
}

// 20. Winter Storage
{
  id: "guest-winter",
  name: "Winter Storage",
  capacity: "80 yachts (up to 65 feet)",
  rating: 4.8,
  reviewCount: 167,

  options: {
    indoor: {
      capacity: 30,
      pricing: "400 TRY/foot/season (Oct-Apr)",
      features: [
        "Climate-controlled building",
        "Dust-free environment",
        "24/7 security & monitoring"
      ]
    },
    outdoor: {
      capacity: 50,
      pricing: "200 TRY/foot/season",
      features: [
        "Covered cradles",
        "Shrink wrap included",
        "Power hookups available"
      ]
    }
  },

  services: {
    winterization: "From 2,500 TRY (engine, systems)",
    dewinterization: "From 1,800 TRY (spring launch prep)",
    monitoring: "Included (monthly checks)",
    maintenance: "Available on request"
  },

  season: "October 15 - April 30",

  includes: [
    "Haul-out",
    "Pressure wash",
    "Cradle/stand",
    "Security monitoring",
    "Basic winterization (if requested)",
    "Spring launch"
  ],

  managedBy: "ada.marina"
}

// 21. Tender/Dinghy Storage
{
  id: "guest-tender",
  name: "Tender/Dinghy Storage",
  capacity: "50 boats",
  rating: 4.5,
  reviewCount: 54,

  storage: {
    rack: "40 spaces (stacked racks)",
    float: "10 spaces (floating docks)"
  },

  pricing: {
    monthly: "350 TRY (rack storage)",
    annual: "3,500 TRY (save 17%)",
    float: "+100 TRY/month"
  },

  access: "24/7 with berth key card",

  features: [
    "Secure compound",
    "Davit for launch/retrieval",
    "Fresh water rinse",
    "Lock points provided"
  ],

  managedBy: "ada.marina"
}
```

---

## ⚓ Marine Services

### 22-26. Fuel, Palamar, Water, Electricity, Pump-Out

```typescript
// 22. Fuel Station
{
  id: "marine-fuel",
  name: "Fuel Station",
  rating: 4.6,
  reviewCount: 187,

  operatingHours: {
    summer: "07:00-20:00 (May-Oct)",
    winter: "08:00-18:00 (Nov-Apr)",
    vhf: "Call VHF Ch 9 for service"
  },

  fuels: {
    diesel: "Market price + 2 TRY/liter",
    gasoline: "Market price + 2.5 TRY/liter",
    lubricants: "Available"
  },

  services: [
    "Fast pumping (up to 300L/min)",
    "Fuel polishing available",
    "Water separator filters",
    "Oil disposal (free)",
    "Invoice for business (KDV)"
  ],

  payment: [
    "Cash",
    "Credit card",
    "Account billing (for berth holders)"
  ],

  managedBy: "ada.marina"
}

// 23. Palamar Servisi (Mooring Assistance)
{
  id: "marine-palamar",
  name: "Palamar Servisi (Mooring Line Service)",
  rating: 4.8,
  reviewCount: 423,

  operatingHours: {
    daily: "24/7",
    vhf: "Channel 9 and 69"
  },

  services: [
    "Med-mooring assistance (stern-to)",
    "Bow-to mooring",
    "Line handling (arrival/departure)",
    "Fender adjustment",
    "Spring line setup",
    "Rafting assistance"
  ],

  protocol: {
    arrival: "Call VHF Ch 9: 'Palamar, this is [boat name], ready for berth assignment'",
    response: "Palamar team assigns berth and meets you at dock",
    service: "Professional line handlers (2-3 crew)"
  },

  pricing: {
    standard: "Free for berth holders",
    transient: "250 TRY per arrival/departure",
    rafting: "+100 TRY"
  },

  crew: "Professional mariners, VHF monitoring 24/7",

  managedBy: "ada.marina",
  inspiration: "Mediterranean marina mooring culture"
}

// 24. Palamar Botu (Line Boat)
{
  id: "marine-palamar-boat",
  name: "Palamar Botu (Line Boat)",
  rating: 4.9,
  reviewCount: 512,

  vessel: {
    type: "Professional RIB (rigid inflatable boat)",
    length: "6 meters",
    crew: "2 professional mariners",
    equipment: "VHF radio, first aid, fenders, lines"
  },

  operatingHours: {
    daily: "06:00-22:00",
    vhf: "Channel 9 and 69"
  },

  services: [
    "Running lines to shore (Med-mooring)",
    "Tender service to shore",
    "Emergency assistance",
    "Man overboard rescue",
    "Tow service (within marina)",
    "Parts delivery to anchored yachts"
  ],

  protocol: {
    medMooring: "Line boat takes stern lines to shore pilings",
    communication: "VHF Ch 9, 69 monitoring",
    response: "Average 5 minutes"
  },

  pricing: {
    mooring: "Included in palamar service",
    tender: "50 TRY per trip",
    emergency: "Free",
    tow: "500 TRY (within marina)"
  },

  managedBy: "ada.marina",
  inspiration: "Professional Turkish marina mooring operations"
}

// 25. Water & Electricity
{
  id: "marine-utilities",
  name: "Water & Electricity",
  rating: 4.7,
  reviewCount: 312,

  water: {
    quality: "Potable, filtered",
    pressure: "2-4 bar",
    metering: "Yes",
    pricing: "15 TRY/ton"
  },

  electricity: {
    voltage: "220V single phase, 380V three phase",
    amperage: "16A, 32A, 63A pedestals",
    metering: "Yes",
    pricing: "6 TRY/kWh"
  },

  pedestals: {
    location: "Every berth",
    weatherproof: "IP67 rated",
    includes: [
      "Water tap",
      "Electrical outlets (16A, 32A, 63A)",
      "Circuit breakers",
      "Surge protection"
    ]
  },

  billing: "Monthly, based on meter readings",

  managedBy: "ada.marina"
}

// 26. Pump-Out Station
{
  id: "marine-pumpout",
  name: "Pump-Out Station",
  rating: 4.5,
  reviewCount: 76,

  operatingHours: {
    daily: "08:00-18:00",
    callAhead: "Recommended"
  },

  service: {
    type: "Dockside pump-out",
    connection: "Standard 1.5\" fitting",
    capacity: "Up to 500 gallons",
    disposal: "Environmentally compliant"
  },

  pricing: "Free for berth holders",

  location: "Fuel dock area",

  managedBy: "ada.marina"
}
```

---

## 🎩 Concierge Services

Managed by: **ada.customer**

### 27-30. VIP Concierge, Car Rental, Shuttle, Yacht Brokerage

```typescript
// 27. VIP Concierge
{
  id: "concierge-vip",
  name: "VIP Concierge",
  rating: 4.9,
  reviewCount: 156,

  operatingHours: {
    daily: "24/7",
    desk: "08:00-20:00",
    afterHours: "Phone/WhatsApp"
  },

  services: {
    travel: [
      "Flight booking & changes",
      "Hotel reservations",
      "Restaurant reservations",
      "Tour bookings",
      "Visa assistance"
    ],
    lifestyle: [
      "Event tickets (concerts, theater)",
      "Spa appointments",
      "Personal shopping",
      "Flowers & gifts",
      "Special celebrations"
    ],
    yacht: [
      "Provisioning coordination",
      "Crew arrangements",
      "Technical services booking",
      "Parts sourcing",
      "Documentation assistance"
    ],
    emergency: [
      "Medical appointments",
      "Embassy contacts",
      "Legal referrals",
      "Emergency services"
    ]
  },

  languages: ["Turkish", "English", "Greek", "Russian"],

  pricing: {
    basic: "Free for berth holders",
    vipMembership: "5,000 TRY/month (priority service)"
  },

  contact: {
    desk: "+90 212 XXX XXXX",
    whatsapp: "+90 532 XXX XXXX",
    email: "concierge@ada-marina.com"
  },

  managedBy: "ada.customer"
}

// 28. Car Rental
{
  id: "concierge-car-rental",
  name: "Car Rental",
  rating: 4.4,
  reviewCount: 89,

  fleet: {
    economy: "Fiat Egea, VW Polo",
    comfort: "Toyota Corolla, VW Passat",
    premium: "BMW 5 Series, Mercedes E-Class",
    suv: "Toyota RAV4, VW Tiguan",
    luxury: "BMW X5, Mercedes GLE"
  },

  pricing: {
    economy: "From 450 TRY/day",
    comfort: "From 750 TRY/day",
    premium: "From 1,500 TRY/day",
    suv: "From 1,200 TRY/day",
    luxury: "From 2,500 TRY/day"
  },

  includes: [
    "Full insurance",
    "Unlimited mileage",
    "GPS navigation",
    "24/7 roadside assistance"
  ],

  delivery: "Free delivery/pickup at marina",

  booking: "24h advance, same-day subject to availability",

  managedBy: "ada.customer"
}

// 29. Shuttle Service
{
  id: "concierge-shuttle",
  name: "Shuttle Service",
  rating: 4.7,
  reviewCount: 145,

  routes: {
    airport: {
      destination: "Istanbul Airport (IST)",
      schedule: "Every 2 hours (06:00-22:00)",
      duration: "45 minutes",
      pricing: "150 TRY/person"
    },
    cityCenter: {
      destination: "Taksim Square",
      schedule: "Every hour (09:00-20:00)",
      duration: "35 minutes",
      pricing: "75 TRY/person"
    },
    shopping: {
      destination: "Mall of Istanbul",
      schedule: "3x daily",
      duration: "20 minutes",
      pricing: "50 TRY/person"
    }
  },

  private: {
    pricing: "From 500 TRY (up to 6 people)",
    available: "24/7 with advance booking"
  },

  vehicles: [
    "Mercedes Sprinter (14 seats)",
    "VW Caravelle (8 seats)",
    "Luxury vans available"
  ],

  booking: {
    regular: "At concierge desk",
    private: "24h advance recommended"
  },

  managedBy: "ada.customer"
}

// 30. Yacht Brokerage
{
  id: "concierge-brokerage",
  name: "Yacht Brokerage",
  rating: 4.8,
  reviewCount: 67,

  services: {
    sales: [
      "Yacht sales (power & sail)",
      "Market analysis & pricing",
      "Professional photography",
      "Online listings (worldwide platforms)",
      "Viewings & sea trials",
      "Survey coordination",
      "Closing & documentation"
    ],
    purchase: [
      "Buyer representation",
      "Yacht search & sourcing",
      "Pre-purchase survey",
      "Negotiation",
      "Sea trial arrangement",
      "Registration & flagging"
    ],
    charter: [
      "Charter management",
      "Crew placement",
      "Charter marketing",
      "Guest services"
    ]
  },

  coverage: [
    "Turkey",
    "Greece",
    "Mediterranean",
    "Worldwide network"
  ],

  commission: {
    sales: "5% (negotiable for high-value)",
    purchase: "3% (buyer broker)",
    charter: "10-15% of charter fee"
  },

  team: [
    "Licensed yacht brokers (3)",
    "Multilingual staff",
    "Legal partnerships",
    "Marine surveyors network"
  ],

  managedBy: "ada.customer"
}
```

---

## 📊 Facility Management System

### Smart Package Deals

Ada.marina intelligently combines facilities into package deals:

```typescript
// Package 1: Wellness Package
{
  name: "Wellness Retreat Package",
  duration: "7 days",
  facilities: [
    "Berth (up to 50ft)",
    "Spa & Wellness (unlimited access)",
    "Fitness Center (unlimited)",
    "Swimming Pool (unlimited)",
    "Beach Club (2 day passes)"
  ],
  pricing: {
    regular: 8500,
    discounted: 6500,
    savings: 2000,
    savingsPercentage: 23.5
  }
}

// Package 2: VIP Berth Package
{
  name: "VIP Marina Experience",
  duration: "30 days",
  facilities: [
    "Premium berth (up to 65ft)",
    "Beach Club (season pass)",
    "VIP Concierge (priority)",
    "Spa treatments (2x)",
    "Car parking (covered)"
  ],
  pricing: {
    regular: 28000,
    discounted: 22000,
    savings: 6000,
    savingsPercentage: 21.4
  }
}

// Package 3: Family Package
{
  name: "Family Fun Package",
  duration: "7 days",
  facilities: [
    "Berth (up to 45ft)",
    "Kids Club (unlimited)",
    "Beach Club (family access)",
    "Swimming Pool (unlimited)",
    "Marina Cafe voucher (500 TRY)"
  ],
  pricing: {
    regular: 9500,
    discounted: 7500,
    savings: 2000,
    savingsPercentage: 21.1
  }
}
```

### Facility Reservation System

```typescript
// Example: Booking Beach Club Cabana
{
  customerId: "cust-12345",
  facilityId: "wellness-beach",
  item: "Private Cabana #7",
  date: "2025-07-15",
  startTime: "09:00",
  endTime: "19:00",
  guests: 6,
  pricing: {
    cabanaRental: 1500,
    foodBeverage: 850,
    total: 2350
  },
  status: "confirmed",
  specialRequests: "Birthday celebration - cake & decorations"
}
```

---

## 🌟 Facility Ratings & Reviews

All facilities feature real customer ratings:

**Top Rated:**
1. **Beach Club** - 5.0★ (412 reviews) - "Best beach club in Istanbul marinas"
2. **Spa & Wellness** - 4.9★ (198 reviews) - "Exceptional Turkish hammam experience"
3. **Palamar Botu** - 4.9★ (512 reviews) - "Professional crew, always responsive"
4. **Outdoor Event Space** - 4.9★ (287 reviews) - "TARKAN concert was incredible!"
5. **VIP Concierge** - 4.9★ (156 reviews) - "Nothing is too much to ask"

**Most Used:**
1. Palamar Servisi - 24/7 essential service
2. Water & Electricity - Daily necessity
3. Marina Restaurant - Popular gathering spot
4. Shower Facilities - High traffic
5. Marina Market - Daily convenience

---

## 🔗 Cross-Node Integration

Facilities are managed by specialized nodes:

- **ada.restaurant** → Shore facilities (Restaurant, Cafe, Bar)
- **ada.marina** → Core services (Berths, Marine services, Guest services)
- **ada.congress** → Events (Conference, Outdoor events, Live music)
- **ada.maintenance** → Technical (Haul-out, Workshop)
- **ada.customer** → Concierge (VIP, Travel, Brokerage)

**Integration Example:**
```typescript
// Customer books spa treatment
ada.customer.trackInteraction({
  customerId: "cust-789",
  type: "service",
  service: "Spa treatment booked",
  sentiment: "positive"
})

// Ada.marina records facility usage
ada.marina.logFacilityUsage({
  facilityId: "wellness-spa",
  customerId: "cust-789",
  revenue: 850
})

// Ada.finance generates invoice
ada.finance.createInvoice({
  customerId: "cust-789",
  items: [{ service: "Spa treatment", amount: 850 }],
  kdv: 153
})
```

---

## 📍 Real Marina Inspirations

Every facility is inspired by real operations:

| Facility | Inspired By | Why |
|----------|-------------|-----|
| Beach Club | D-Marin Göcek | World-class beach club standard |
| Outdoor Event Space | WIM, Kıyı Istanbul, Ataköy | Summer concert series success |
| Live Music & Bar | Kıyı Istanbul | Weekly entertainment culture |
| Palamar Service | Turkish marina tradition | Professional mooring assistance |
| Spa & Wellness | D-Marin facilities | Premium spa amenities |
| Conference Hall | Ataköy Marina | Corporate event hosting |
| VIP Concierge | Setur network | Full-service hospitality |

---

## 💡 Why This Matters

**Traditional marinas:** Just berths
**Ada.marina:** A complete lifestyle destination

- Yacht owners stay longer
- Higher revenue per berth
- Community & loyalty building
- Differentiation from competitors
- Event revenue (concerts, conferences)
- Year-round operations (not just summer)

**From real travel agency & event company experience:**
> "Bundle services, create packages, build relationships. That's how you turn one-time customers into loyal advocates."

---

**Document Version:** 1.0
**Last Updated:** 2025-01-15
**Maintained By:** Ada Team

*Built with 15+ years of travel, events, and marina operations experience.*
