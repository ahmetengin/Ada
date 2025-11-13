# AIS Legal Requirements - MMSI & IMO Registration 🆔

## ⚠️ CRITICAL: Legal Maritime Identity

**Ada.Sea requires VALID MMSI and IMO numbers for legal maritime operations.**

Dummy values like `000000000` or `IMO0000000` are **NOT ACCEPTED** and will cause validation errors.

---

## 🌊 Why AIS is MANDATORY

### 1. **International Maritime Law (SOLAS)**
- Vessels 300+ gross tonnage: **AIS Class A REQUIRED**
- Vessels 15m+: **AIS Class B STRONGLY RECOMMENDED**
- All commercial vessels: **MANDATORY**

### 2. **Port Compliance**
- VTS (Vessel Traffic Service) requires AIS for port entry
- Without MMSI, port authorities may **REFUSE ENTRY**

### 3. **Safety**
- Collision avoidance (CPA/TCPA calculations)
- SAR (Search and Rescue) operations
- Coastal guard tracking

### 4. **Insurance**
- Most marine insurance requires valid MMSI
- IMO number required for vessels 100+ GT

---

## 📋 How to Get MMSI Number

### **Turkey 🇹🇷**

**Authority:** General Directorate of Coastal Safety (Kıyı Emniyeti Genel Müdürlüğü)

**Process:**
1. Register your vessel with **Turkish Maritime Administration**
2. Apply for MMSI through **Kıyı Emniyeti**
3. Provide:
   - Vessel registration certificate
   - Vessel ownership documents
   - Technical specifications
   - Radio license application

**MMSI Format:** `271XXXXXX` (Turkey MID: 271)

**Application:** https://kiyiemniyeti.uab.gov.tr/

**Cost:** Approximately 500-1000 TL (varies)

**Processing Time:** 2-4 weeks

---

### **Greece 🇬🇷**

**Authority:** Hellenic Telecommunications and Post Commission (EETT)

**Process:**
1. Register vessel with Port Authority
2. Apply for MMSI through EETT
3. Radio license required

**MMSI Format:** `237XXXXXX` or `239XXXXXX` (Greece MID: 237, 239)

**Application:** https://www.eett.gr/

---

### **International / Foreign-Flagged Vessels**

**US 🇺🇸**
- FCC (Federal Communications Commission)
- MMSI format: `338XXXXXX` (US MID: 338)
- Online application: https://www.fcc.gov/

**UK 🇬🇧**
- Ofcom (UK Communications Regulator)
- MMSI format: `232XXXXXX` or `235XXXXXX` (UK MID: 232, 235)
- Online: https://www.ofcom.org.uk/

**Cyprus 🇨🇾** (Popular flag for yachts)
- Department of Merchant Shipping
- MMSI format: `209XXXXXX` (Cyprus MID: 209)

---

## 📋 How to Get IMO Number

### **What is IMO Number?**
- **Permanent** vessel identifier (never changes, even if vessel sold/renamed)
- Required for vessels **100+ gross tonnage**
- Format: `IMO` + 7 digits (e.g., `IMO1234567`)

### **Who Issues IMO Numbers?**

**IHS Markit** (on behalf of IMO - International Maritime Organization)

**Process:**
1. Vessel must be registered with flag state
2. Apply through classification society or flag state administration
3. IMO number assigned permanently

**For Turkish Vessels:**
- Apply through Turkish Maritime Administration
- Costs vary by vessel size (approx. 500-2000 USD)

**Official IMO Database:** https://gisis.imo.org/

---

## 🛠️ AIS Transponder Installation

### **AIS Class A** (Commercial vessels 300+ GT)
- **Transmission:** Every 2-10 seconds (dynamic), 6 minutes (static)
- **Power:** 12.5W
- **Cost:** $2,000 - $5,000
- **Brands:** Furuno, Garmin, Raymarine, Simrad

### **AIS Class B** (Recreational vessels <300 GT)
- **Transmission:** Every 30 seconds (dynamic), 6 minutes (static)
- **Power:** 2W
- **Cost:** $300 - $1,500
- **Brands:** Garmin, Lowrance, B&G, Vesper Marine

### **Installation Requirements:**
1. VHF antenna (156-162 MHz)
2. GPS antenna
3. NMEA 2000 or NMEA 0183 connection
4. 12V/24V power supply

### **Recommended Setup for Ada.Sea:**
```
AIS Transponder (Class B)
    ↓ NMEA 2000
Raspberry Pi 5 (Ada.Sea)
    ↓ WiFi/Ethernet
Dashboard (Vue.js)
```

---

## 🔧 Ada.Sea Configuration

### **Vessel Registration in Ada.Sea**

```typescript
import { VesselLegalIdentity, AISClass, ShipType } from './types/AISTypes';

const myVessel: VesselLegalIdentity = {
  // PRIMARY IDENTIFIERS (REQUIRED)
  mmsi: '271001234',              // Your assigned MMSI
  imo: 'IMO1234567',              // Your IMO number
  callSign: 'TCAB1234',           // Radio call sign
  name: 'MY YACHT NAME',          // Official registered name

  // FLAG STATE & REGISTRATION
  flagState: 'TUR',               // Turkey (ISO 3166-1 alpha-3)
  portOfRegistry: 'Istanbul',
  registrationNumber: 'TR-IST-12345',

  // VESSEL CLASSIFICATION
  vesselType: ShipType.Sailing,   // or ShipType.Pleasure_Craft
  aisClass: AISClass.ClassB,      // Class B for recreational

  // DIMENSIONS (REQUIRED)
  length: 15.2,                   // meters
  beam: 4.5,                      // meters
  draft: 2.1,                     // meters
  height: 22,                     // meters (from waterline to top)

  // TONNAGE
  grossTonnage: 25,               // GT
  netTonnage: 18,                 // NT

  // DATES
  builtYear: 2018,
  registrationDate: new Date('2019-01-15'),
  aisTransponderInstalled: new Date('2019-02-01'),

  // COMPLIANCE
  solasCompliant: false,          // < 300 GT = not required
  marsecLevel: 1,
};

// Initialize SeaNode with legal identity
const seaNode = new SeaNode({
  id: 'sea-yacht-001',
  name: 'MY YACHT NAME',
  vesselIdentity: myVessel,  // ✅ REQUIRED!
});
```

---

## ⚡ Validation Errors

Ada.Sea **WILL REJECT** invalid vessel identities:

### ❌ **Common Errors:**

```
❌ Invalid MMSI: Must be 9 digits
   → Fix: Register with maritime authority

❌ Invalid MMSI: Dummy value not allowed. Register vessel to obtain valid MMSI.
   → Fix: Replace '000000000' with real MMSI

❌ Invalid IMO: Dummy value not allowed. Register vessel to obtain valid IMO.
   → Fix: Replace 'IMO0000000' with real IMO number

❌ Invalid flag state: Must be ISO 3166-1 alpha-3 (e.g., TUR, GRC)
   → Fix: Use 3-letter country code (TUR not TR)

❌ SOLAS compliance required for vessels 300+ GT
   → Fix: Obtain SOLAS certificate if vessel ≥300 GT

❌ AIS Class A required for vessels 300+ GT
   → Fix: Install Class A transponder
```

---

## 📚 Resources

### **Official Maritime Authorities**

**Turkey:**
- Kıyı Emniyeti: https://kiyiemniyeti.uab.gov.tr/
- Turkish Maritime Administration: https://www.udhb.gov.tr/

**International:**
- IMO (International Maritime Organization): https://www.imo.org/
- ITU (International Telecommunication Union): https://www.itu.int/

### **AIS Information**
- US Coast Guard AIS Guide: https://www.navcen.uscg.gov/ais
- MarineTraffic (Track AIS globally): https://www.marinetraffic.com/
- VesselFinder: https://www.vesselfinder.com/

### **MMSI Lookup**
- Check if MMSI is already assigned: https://www.marinetraffic.com/
- ITU Mars database: https://www.itu.int/en/ITU-R/terrestrial/mars/

---

## 🚨 Legal Disclaimer

**Ada.Sea is a maritime management platform and does NOT:**
- Issue MMSI or IMO numbers
- Replace official maritime authorities
- Substitute for proper vessel registration

**You MUST:**
- Register your vessel with flag state authorities
- Obtain valid MMSI and IMO numbers through official channels
- Comply with SOLAS, COLREGS, and local maritime regulations
- Maintain valid radio licenses and certificates

**Failure to comply with maritime regulations may result in:**
- Port entry refusal
- Fines and penalties
- Vessel detention
- Insurance invalidation

---

## ✅ Quick Checklist

Before using Ada.Sea, ensure you have:

- [ ] Valid MMSI number (9 digits)
- [ ] Valid IMO number (if vessel 100+ GT)
- [ ] Radio call sign
- [ ] Vessel registration certificate
- [ ] AIS transponder installed (Class A or B)
- [ ] VHF radio license
- [ ] Flag state documentation
- [ ] Insurance with AIS requirement met

---

**For assistance with Ada.Sea configuration, see:** `nodes/ada.sea/examples/vessel-setup.ts`

**For AIS integration troubleshooting, see:** `nodes/ada.sea/docs/AIS_TROUBLESHOOTING.md`
