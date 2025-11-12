# VHF Marine Radio Channels - Turkey Reference

> **Ada.Sea Operational Reference**
> Complete VHF channel database for Turkish waters and marinas
> Last Updated: 2025-11-12

---

## 📡 Table of Contents

1. [Ship-to-Ship Channels (Intership)](#ship-to-ship-channels)
2. [Turkey Marina Channels](#turkey-marina-channels)
3. [Emergency & Safety Channels](#emergency--safety-channels)
4. [ITU Regional Channels](#itu-regional-channels)
5. [Ada.Sea Integration Notes](#adasea-integration-notes)

---

## 🚢 Ship-to-Ship Channels (Intership)

**Purpose**: Direct vessel-to-vessel communication without shore station involvement
**Range**: 5–10 nautical miles (typical)
**Mode**: Simplex (single frequency, alternating transmit/receive)

### Primary Intership Channels

| Channel | Frequency (MHz) | Primary Use | Notes |
|---------|----------------|-------------|-------|
| **06** | 156.300 | Ship-to-ship operational | Most common for sailing yachts |
| **08** | 156.400 | Intership / tender operations | Support boats, shore transfers |
| **09** | 156.450 | Port operations / backup | Marina calls, intership backup |
| **10** | 156.500 | Intership / fleet coordination | Small fleet coordination |
| **13** | 156.650 | Bridge-to-bridge navigation | Safety navigation, passing arrangements |
| **72** | 156.625 | General intership | Widely used in Turkey |
| **73** | 156.675 | Sailing / marina communications | Popular in Turkish sailing clubs |
| **77** | 156.875 | Short-range operations | Docking, mooring assistance |

### 🇹🇷 Most Used in Turkey

1. **Channel 06** (156.300 MHz) - Primary intership
2. **Channel 72** (156.625 MHz) - General fleet comms
3. **Channel 73** (156.675 MHz) - Sailing clubs, regattas

> **Usage Rules**:
> - Keep transmissions brief (< 3 minutes)
> - Navigation safety only
> - No commercial or extended conversations
> - Switch to working channel after initial contact

---

## ⚓️ Turkey Marina Channels

### Istanbul Region

#### Ataköy Marina (Mega Yacht)
- **Working Channel**: 73
- **Frequency**: 156.675 MHz
- **Location**: 40°58.5'N, 28°52.5'E
- **Capacity**: 1,200 berths
- **Notes**: Busiest marina in Istanbul, monitor Ch 73 when approaching

#### Kalamış Marina (Fenerbahçe)
- **Working Channel**: 72
- **Frequency**: 156.625 MHz
- **Location**: 40°58.1'N, 29°01.9'E
- **Capacity**: 700 berths
- **Notes**: Popular sailing club, use Ch 72 for berthing requests

#### Marmara Region

##### Erdek Marina
- **Working Channel**: 73
- **Frequency**: 156.675 MHz
- **Location**: Erdek, Marmara Sea
- **Notes**: Small marina, monitor Ch 73

### Aegean Coast

#### Çeşme Marina
- **Working Channel**: 73
- **Frequency**: 156.675 MHz
- **Location**: 38°19.3'N, 26°18.4'E
- **Capacity**: 400 berths
- **Notes**: Major cruising destination, Ch 73 for marina services

#### Setur Kuşadası Marina
- **Working Channel**: 73
- **Frequency**: 156.675 MHz
- **Location**: 37°51.7'N, 27°15.5'E
- **Capacity**: 450 berths
- **Notes**: Part of Setur chain, consistent Ch 73 usage

#### Setur Yalikavak Marina
- **Working Channel**: 73
- **Frequency**: 156.675 MHz
- **Location**: 37°07.5'N, 27°16.5'E
- **Capacity**: 620 berths (mega yacht capable)
- **Notes**: Premium facility, monitor Ch 73

#### Port Bodrum (Milta Marina)
- **Working Channel**: 73
- **Frequency**: 156.675 MHz
- **Location**: 37°01.9'N, 27°25.8'E
- **Capacity**: 500 berths
- **Notes**: City center location, busy in summer

### Mediterranean Coast

#### Göcek Marinaturk
- **Working Channel**: 73
- **Frequency**: 156.675 MHz
- **Location**: 36°45.2'N, 28°56.4'E
- **Capacity**: 380 berths
- **Notes**: Gateway to Göcek bays, monitor Ch 73

#### Göcek Exclusive Marina
- **Working Channel**: 73
- **Frequency**: 156.675 MHz
- **Location**: 36°45.5'N, 28°56.1'E
- **Capacity**: 280 berths
- **Notes**: Premium marina, Ch 73 for services

#### Setur Finike Marina
- **Working Channel**: 73
- **Frequency**: 156.675 MHz
- **Location**: 36°17.8'N, 30°08.7'E
- **Capacity**: 300 berths
- **Notes**: Remote location, reliable Ch 73

#### Kemer Marina
- **Working Channel**: 73
- **Frequency**: 156.675 MHz
- **Location**: 36°36.0'N, 30°33.5'E
- **Capacity**: 350 berths
- **Notes**: Tourist area, summer traffic on Ch 73

#### Setur Antalya Marina
- **Working Channel**: 73
- **Frequency**: 156.675 MHz
- **Location**: 36°52.5'N, 30°37.0'E
- **Capacity**: 240 berths
- **Notes**: City marina, monitor Ch 73

### Pattern Analysis

> **Key Observation**: Turkish marinas predominantly use **Channel 73 (156.675 MHz)** as their working channel, with some Istanbul marinas using Channel 72. This standardization simplifies cruising planning.

---

## 🆘 Emergency & Safety Channels

| Channel | Frequency (MHz) | Purpose | Monitoring |
|---------|----------------|---------|------------|
| **16** | 156.800 | Distress, urgency, safety, calling | **Mandatory - Always monitor** |
| **70** | 156.525 | Digital Selective Calling (DSC) | Automatic DSC watch |
| **13** | 156.650 | Bridge-to-bridge safety | Navigation safety |
| **06** | 156.300 | SAR operations | Search and rescue coordination |

### Distress Protocol

1. **Immediate**: Transmit "MAYDAY" on Channel 16
2. **DSC**: Activate distress button (auto-sends on Ch 70)
3. **Working**: Turkish Coast Guard may assign working channel
4. **Monitoring**: Ada.Sea should prioritize Ch 16 monitoring

---

## 🌍 ITU Regional Channels

### Port Operations
- **Ch 11** (156.550 MHz) - Port operations and VTS
- **Ch 12** (156.600 MHz) - Port operations
- **Ch 14** (156.700 MHz) - Port operations

### Turkish Coast Guard
- **Ch 16** (156.800 MHz) - Calling and distress
- **Ch 67** (156.375 MHz) - Turkish Coast Guard working channel
- **Various** - Regional coast guard stations may use different channels

### Weather Information
- **Ch 16** - Announcements of weather broadcasts
- Specific channels vary by region; listen to Ch 16 for schedule

---

## 🤖 Ada.Sea Integration Notes

### SDR Scanner Configuration

```python
# Priority scan order for Turkish waters
PRIORITY_CHANNELS = [
    16,   # Emergency - ALWAYS monitor
    73,   # Marina working channel (primary in Turkey)
    72,   # Istanbul marinas / intership
    6,    # Ship-to-ship primary
    13,   # Bridge-to-bridge safety
]

# Frequency mapping
CHANNEL_FREQUENCIES = {
    6:  156.300,
    8:  156.400,
    9:  156.450,
    10: 156.500,
    11: 156.550,
    12: 156.600,
    13: 156.650,
    14: 156.700,
    16: 156.800,  # EMERGENCY
    67: 156.375,  # Coast Guard
    70: 156.525,  # DSC
    72: 156.625,
    73: 156.675,
    77: 156.875,
}
```

### Detection & Classification

```python
# Channel classification for Ada Observer
CHANNEL_TYPES = {
    "EMERGENCY": [16, 70],
    "INTERSHIP": [6, 8, 9, 10, 13, 72, 73, 77],
    "MARINA": [73, 72],  # Turkey-specific
    "PORT_OPS": [11, 12, 14],
    "COAST_GUARD": [67],
}

# UI Labels
DISPLAY_LABELS = {
    "EMERGENCY": "🔴 EMERGENCY",
    "INTERSHIP": "🔵 Local Comms",
    "MARINA": "⚓️ Marina",
    "PORT_OPS": "🏗️ Port Ops",
    "COAST_GUARD": "🚨 Coast Guard",
}
```

### VAD + STT Pipeline

1. **Continuous Scan**: Monitor all priority channels
2. **Voice Detection**: Trigger STT on voice activity
3. **Context Tagging**: Label by channel type
4. **Priority Alerting**: Immediate notification for Ch 16
5. **Transcription**: Store for Ada context (safety, navigation, weather)

### Race/Fleet Mode

When Ada detects regatta activity or fleet operations:

```python
FLEET_MODE_CHANNELS = [
    6,   # Primary intership
    72,  # Fleet coordination
    73,  # Sailing clubs
]

# Example: "Phisedelia Race Net"
# Monitor Ch 6 and 73 continuously
# Transcribe all race committee communications
# Alert crew to important announcements
```

### Geographic Context

Ada.Sea should adjust monitoring based on location:

- **Istanbul (Bosphorus/Marmara)**: Priority on Ch 72, 73
- **Aegean Coast**: Ch 73 for marinas, Ch 6 for intership
- **Mediterranean**: Ch 73 standard, increase safety monitoring (Ch 13, 16)
- **Open Sea**: Ch 16 mandatory, Ch 13 for traffic

### Practical Example

**Scenario**: Approaching Ataköy Marina from Marmara Sea

1. Monitor **Ch 16** (safety)
2. Monitor **Ch 73** (Ataköy working)
3. Monitor **Ch 6** (intership with nearby vessels)
4. Call Ataköy on **Ch 73**: "Ataköy Marina, Ataköy Marina, this is sailing vessel Phisedelia, requesting berth assignment"
5. Switch to assigned working channel if directed
6. Ada transcribes all comms for crew reference

---

## 📊 Quick Reference Tables

### By Frequency (Ascending)

| Freq (MHz) | Ch | Type | Primary Use |
|------------|----|----|-------------|
| 156.300 | 06 | Intership | Ship-to-ship primary |
| 156.375 | 67 | Official | Turkish Coast Guard |
| 156.400 | 08 | Intership | Tender operations |
| 156.450 | 09 | Port/Intership | Marina backup |
| 156.500 | 10 | Intership | Fleet coordination |
| 156.525 | 70 | DSC | Digital distress |
| 156.550 | 11 | Port | Port operations |
| 156.600 | 12 | Port | Port operations |
| 156.625 | 72 | Intership | Turkey marinas/intership |
| 156.650 | 13 | Safety | Bridge-to-bridge |
| 156.675 | 73 | Marina | **Turkey marina standard** |
| 156.700 | 14 | Port | Port operations |
| 156.800 | 16 | **EMERGENCY** | **Distress/calling** |
| 156.875 | 77 | Intership | Short-range ops |

### By Usage Priority (Turkey)

1. **Ch 16** (156.800) - EMERGENCY - Always monitor
2. **Ch 73** (156.675) - Marina standard in Turkey
3. **Ch 72** (156.625) - Istanbul marinas, intership
4. **Ch 6** (156.300) - Ship-to-ship operational
5. **Ch 13** (156.650) - Bridge-to-bridge safety

---

## 🔧 Operational Recommendations

### For Cruising in Turkey

1. **Set dual watch**: Ch 16 (emergency) + Ch 73 (marinas)
2. **Pre-program**: Save all marina channels before departure
3. **Monitor locally**: Switch to regional intership (Ch 6, 72) when coastal cruising
4. **Race mode**: Add Ch 6 and 73 for fleet communications

### For Ada.Sea SDR

1. **Baseline scan**: Ch 16, 73, 72, 6, 13 (5-channel rotation)
2. **Geographic tuning**: Adjust based on GPS position
3. **Emergency priority**: Ch 16 breaks through all other monitoring
4. **Transcription**: Save all Ch 16 traffic; selectively log others
5. **Learning mode**: Build profile of frequently-used channels per location

### Call Protocol

1. **Initial call**: Use Ch 16 or marina working channel
2. **Switch**: Move to assigned working channel
3. **Keep clear**: Avoid long transmissions on calling channels
4. **Phonetics**: Use NATO phonetic alphabet for vessel names
5. **Example**: "Ataköy Marina, this is PAPA-HOTEL-INDIA-SIERRA-ECHO-DELTA-ECHO-LIMA-INDIA-ALPHA"

---

## 📚 References

- **ITU Radio Regulations**: Appendix 18 (VHF Maritime Mobile)
- **Turkish Ministry of Transport**: Marine Communications Regulations
- **Marina Guides**: Rod Heikell's "Turkish Waters & Cyprus Pilot"
- **Practical Experience**: Turkish sailing community consensus

---

## 🚀 Next Steps for Ada

- [ ] Implement SDR frequency scanner with priority channels
- [ ] Build VAD (Voice Activity Detection) + STT pipeline
- [ ] Create channel classifier (emergency/intership/marina/port)
- [ ] Design Ada Observer UI for VHF monitoring
- [ ] Add geographic awareness (auto-tune by GPS)
- [ ] Integrate with race/fleet mode
- [ ] Test on real VHF traffic recordings

---

**Document Version**: 1.0
**Maintained by**: Ada.Sea Development Team
**Feedback**: Update as new marinas or channels are confirmed

⚓️ *Fair winds and following seas* ⚓️
