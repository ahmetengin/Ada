# 🔒 ADA.SEA - PRIVACY-FIRST & ZERO-TRUST ARCHITECTURE

## KRITIK FARK: ZORA vs ADA.SEA

### Zora'nın Privacy Modeli
```
Zora Server (Cloud)
    ↓
Third-party Services
    ↓
User consent ambiguous
```

### Ada.Sea'nın Zero-Trust Modeli
```
Ada.Sea (100% Edge - Mac Mini M4)
    ↓
NO automatic cloud sync
    ↓
NO third-party data sharing
    ↓
EXPLICIT captain command required for ANY data transfer
```

---

## PRIVACY MANIFESTO

**"Kaptan ne derse o olur. Nokta."** (What the captain says, goes. Period.)

**Core Principles:**

1. **Zero Trust by Default** - Hiçbir otomatik paylaşım
2. **Explicit Consent** - Her paylaşım için sesli/manuel onay
3. **Minimal Data** - Sadece gerekli minimum
4. **Complete Audit Trail** - Tam şeffaflık
5. **Captain Control** - Silme, düzeltme, durdurma hakları
6. **Edge Computing** - Veriler teknede kalır
7. **Zero-Knowledge Cloud** - Opsiyonel, şifreli, okunamaz
8. **Regulation Ready** - KVKK ve GDPR uyumlu

---

## 1. ARCHITECTURE OVERVIEW

### Data Classification Levels

Ada.sea implements a **4-level data classification system**:

#### LEVEL 0: PRIVATE (Never Share Without Explicit Command)
- GPS history
- Communication logs
- Financial data
- Crew personal information
- Passenger personal information
- Sensor raw data
- Security camera footage
- Passwords & API keys

**Policy:** NEVER shared automatically. Requires captain voice confirmation every time.

#### LEVEL 1: RESTRICTED (Essential Data Only, With Approval)
- Current position (NOT history)
- Vessel specifications
- Arrival time
- Contact information

**Policy:** Can be shared for specific services (e.g., marina reservation) with captain approval.

#### LEVEL 2: CONDITIONAL (With Captain Consent)
- Weather preferences
- Route planning style
- Fuel consumption statistics
- Maintenance schedule

**Policy:** Can be shared with captain consent. Standing permissions allowed.

#### LEVEL 3: ANONYMOUS (Anonymous/Aggregated Only)
- Anchorage ratings (no vessel ID)
- Weather reports (crowd-sourced, anonymous)

**Policy:** Can be auto-shared IF properly anonymized (no vessel identification).

---

## 2. CONSENT FLOW

### Example: Marina Berth Reservation

```
User (Voice): "Kanal 72, Yalikavak Marina'da berth reserve et"

Ada.sea: "Yalikavak Marina'ya rezervasyon için
         şu bilgileri göndermem gerekiyor:
         - Tekne adı: Phisedelia
         - Uzunluk: 65 feet
         - Varış tarihi: Yarın saat 14:00
         - Süre: 2 gece

         Onaylıyor musunuz?"

Captain (Voice): "Evet, paylaş"

Ada.sea: ✅ "Rezervasyon talebi gönderildi.
         Yalikavak Marina'dan yanıt bekleniyor..."

[AUDIT LOG CREATED]
{
  timestamp: "2025-11-12T14:32:00Z",
  destination: "Yalikavak Marina",
  data_shared: {
    vessel_name: "Phisedelia",
    vessel_length: 65,
    arrival_date: "2025-11-13T14:00:00Z",
    duration_nights: 2
  },
  captain_authorization: "voice_confirmed",
  captain_id: "boss@ada.sea",
  NOT_SENT: [
    "gps_history",
    "past_locations",
    "crew_info",
    "financial_data",
    "communication_logs"
  ]
}
```

### Consent Methods

1. **Voice Confirmation** (Required for PRIVATE data)
   - Captain says: "Evet, paylaş" or "Hayır"
   - Voice recognition confirms captain identity
   - Transcription logged for audit trail

2. **Manual UI Confirmation** (For RESTRICTED/CONDITIONAL data)
   - Tap to approve/deny on Ada Observer cockpit interface
   - Biometric confirmation (Face ID / Touch ID)

3. **Standing Permission** (For frequent, low-risk operations)
   - Captain can pre-approve specific data sharing
   - Example: "Ada.marina'ya tekne ölçülerini otomatik gönderebilirsin"
   - Can be revoked anytime
   - Expires after set period

---

## 3. IMPLEMENTATION

### Core Components

```typescript
// 1. PrivacyCore - Main privacy controller
const privacyCore = new PrivacyCore({
  captainId: 'boss@ada.sea',
  vesselName: 'Phisedelia',
  enableVoiceConsent: true,
});

// 2. Request data transfer (requires captain approval)
const result = await privacyCore.requestDataTransfer({
  destination: 'Yalikavak Marina',
  purpose: 'Berth reservation',
  dataType: ['vessel_specifications', 'arrival_time'],
  data: {
    vessel_name: 'Phisedelia',
    vessel_length: 65,
    arrival_date: new Date('2025-11-13T14:00:00Z'),
  },
  classificationLevel: 'RESTRICTED',
  size: 256,
  requiresApproval: true,
});

// 3. Captain approves (via voice/UI)
privacyCore.grantPermission(
  result.requestId,
  true, // granted
  'voice',
  'Evet, paylaş'
);

// 4. Data is transferred + logged
// 5. Captain receives notification
```

### Ada.Marina Integration (Privacy-Safe)

```typescript
const marinaIntegration = new AdaMarinaPrivacyIntegration(privacyCore);

// Check-in to West Istanbul Marina
await marinaIntegration.checkInToMarina({
  marinaId: 'west-istanbul-marina',
  marinaName: 'West Istanbul Marina',
  vesselName: 'Phisedelia',
  berthNumber: 'C-42',
  currentPosition: {
    latitude: 40.9872,
    longitude: 29.0872,
  },
});

// Captain will be asked for permission before any data is sent
```

---

## 4. AUDIT TRAIL & TRANSPARENCY

Every data transfer is logged with complete transparency:

```typescript
// Get audit report for last 7 days
const audit = privacyCore.getAuditTrail(7);

console.log(`Total transfers: ${audit.summary.totalTransfers}`);
console.log(`Approved: ${audit.summary.approvedTransfers}`);
console.log(`Denied: ${audit.summary.deniedTransfers}`);

// Export logs for captain review
const logsJSON = privacyCore.exportAuditLogs('json');
const logsCSV = privacyCore.exportAuditLogs('csv');
```

### Voice Commands for Audit Review

```
Captain: "Ada, veri paylaşım geçmişini göster"
Ada: "Son 7 günde 3 veri paylaşımı:
      - Yalikavak Marina: vessel specs (onaylandı)
      - West Istanbul Marina: check-in (onaylandı)
      - Unknown Caller: location request (reddedildi)"

Captain: "Ada, Yalikavak Marina'ya ne gönderdin?"
Ada: "Yalikavak Marina'ya gönderilen:
      - Tekne uzunluğu: 65 feet
      - Varış tarihi: 13 Kasım
      - Süre: 2 gece
      Tarih: 12 Kasım 14:32"

Captain: "Ada, tüm otomatik paylaşımları iptal et"
Ada: "Tüm standing permissions iptal edildi.
      Artık her paylaşım için onayınız gerekecek."
```

---

## 5. ZERO-KNOWLEDGE CLOUD BACKUP (Optional)

**Optional Feature:** Captain can enable encrypted cloud backups.

**Zero-Knowledge Guarantee:**
- Encryption key derived from captain's passphrase
- Key NEVER sent to Ada.sea servers
- Ada.sea stores encrypted blobs it CANNOT read
- Only captain can decrypt backups
- Captain can delete all backups instantly

### Enable Backup

```typescript
const backup = new ZeroKnowledgeBackup({
  captainId: 'boss@ada.sea',
  vesselName: 'Phisedelia',
  backupEndpoint: 'https://backup.ada.sea',
  localKeyStorage: '/secure/keys',
});

// Captain must provide passphrase
await backup.enableBackup('captain-secret-passphrase-12345');

// Backup data (encrypted client-side)
await backup.backupData('logbook', {
  entries: [...],
  journey: {...},
});

// Restore data (requires passphrase)
const restored = await backup.restoreBackup(
  backupId,
  'captain-secret-passphrase-12345'
);
```

**What Ada.sea Servers See:**
```json
{
  "backup_id": "a3f9c8b2...",
  "vessel_name": "Phisedelia",
  "timestamp": "2025-11-12T15:00:00Z",
  "encrypted_blob": "U2FsdGVkX1+vupppZksvRf5pq5g5...",
  "iv": "c8b2a3f9...",
  "auth_tag": "9d7e6f5c...",
  "size": 4096,
  "readable_by": "CAPTAIN ONLY - ZERO-KNOWLEDGE ENCRYPTION"
}
```

**Ada.sea CANNOT read the backup data.** Only the captain with the passphrase can decrypt.

---

## 6. COMPLIANCE

### KVKK (Turkish Data Protection Law) Compliance

```typescript
const kvkkCompliance = {
  dataController: {
    name: 'Ada.sea Platform',
    contact: 'privacy@ada.sea',
    dpo: 'veri-sorumlusu@ada.sea',
  },

  principles: {
    lawfulness: 'Captain explicit consent',
    purpose_limitation: 'Only specified purposes',
    data_minimization: 'Minimum necessary data',
    accuracy: 'Captain verifies all data',
    storage_limitation: 'Captain controls retention',
    security: 'AES-256, E2E encryption',
    accountability: 'Complete audit trail',
  },

  captainRights: {
    access: 'Ada, verilerimi göster',
    rectification: 'Ada, [veri]yi düzelt',
    erasure: 'Ada, [veri]yi sil',
    restriction: 'Ada, [veri] paylaşımını durdur',
    portability: 'Ada, verilerimi dışa aktar',
    objection: 'Ada, [işleme] itiraz ediyorum',
  },
};
```

### GDPR (EU Data Protection) Compliance

For vessels operating in EU waters:

- **Legal Basis:** Explicit captain consent (Article 6)
- **Data Protection by Design:** Privacy-first architecture
- **Data Protection by Default:** All sharing disabled initially
- **Right to Access:** Instant data export
- **Right to Erasure:** Right to be forgotten
- **Right to Portability:** Standard formats (JSON/CSV)
- **DPIA:** Data Protection Impact Assessment for new features

---

## 7. COMPARISON: ADA.SEA vs COMPETITORS

| Feature | Zora | Garmin | Raymarine | **Ada.Sea** |
|---------|------|--------|-----------|-------------|
| **Cloud Default** | ✓ Yes | ✓ Yes | ✓ Yes | ✗ **No** |
| **Auto Sharing** | ✓ Yes | Limited | Limited | ✗ **No** |
| **Captain Control** | Limited | Limited | Limited | ✓ **Total** |
| **Audit Trail** | ✗ No | ✗ No | ✗ No | ✓ **Yes** |
| **Zero-Knowledge** | ✗ No | ✗ No | ✗ No | ✓ **Yes** |
| **Voice Privacy Control** | ✗ No | ✗ No | ✗ No | ✓ **Yes** |
| **KVKK Compliant** | ? | ✗ No | ✗ No | ✓ **Yes** |
| **GDPR Compliant** | ? | Partial | Partial | ✓ **Yes** |
| **On-device AI** | ✗ No | ✗ No | ✗ No | ✓ **Yes** |
| **Open Source Core** | ✗ No | ✗ No | ✗ No | ✓ **Yes** |

---

## 8. CAPTAIN VOICE COMMANDS

### Enable/Disable Sharing

```
"Ada, Yalikavak Marina ile veri paylaşımını aktif et"
"Ada, tüm otomatik paylaşımları durdur"
"Ada, [destination] ile paylaşımı engelle"
```

### Review Sharing History

```
"Ada, hangi bilgileri kimle paylaştım?"
"Ada, son 24 saatte ne paylaştın?"
"Ada, veri paylaşım geçmişini göster"
"Ada, Yalikavak Marina'ya ne gönderdin?"
```

### Manage Permissions

```
"Ada, Ada.marina'ya tekne ölçülerini otomatik gönderebilirsin"
"Ada, konumumu hiç kimseyle paylaşma"
"Ada, mali bilgilerimi hiçbir zaman gönderme"
```

### Delete Data

```
"Ada, Yalikavak Marina'daki rezervasyon verilerimi sil"
"Ada, tüm bulut yedeklerini sil"
"Ada, veri paylaşım geçmişini temizle"
```

### Backup Control

```
"Ada, yedeklemeyi aktif et"
"Ada, yedeklemeyi durdur"
"Ada, yedek durumunu göster"
"Ada, son yedekleme ne zaman yapıldı?"
```

---

## 9. FIRST-TIME SETUP

When Ada.sea is first installed, the captain sees:

```
╔═══════════════════════════════════════════════════╗
║   Ada.sea İlk Kurulum - Privacy-First Setup      ║
╚═══════════════════════════════════════════════════╝

Hoş geldiniz Kaptan!

Ada.sea, verilerinizi korumak için tasarlandı:

✓ Tüm veriler teknede (Mac Mini M4)
✓ Hiçbir otomatik bulut senkronizasyonu
✓ Hiçbir otomatik veri paylaşımı
✓ Her paylaşım için sizin onayınız gerekir

Örnek Senaryolar:

📍 Marina rezervasyonu
   → Sizin sesli onayınız gerekir

🌊 Hava durumu verisi
   → Anonim, kimliksiz paylaşım

🗺️ Rota planlaması
   → Tamamen yerel, hiçbir paylaşım

Şimdi ne yapmak istersiniz?

[1] Yerel kuruluma devam et (önerilen)
[2] Opsiyonel bulut yedeklemeyi öğren
[3] Gizlilik ayarlarını incele
[4] Demo senaryoları göster

Seçiminiz: _
```

---

## 10. DEMO SCENARIO: WEST ISTANBUL MARINA

```typescript
// West Istanbul Marina check-in scenario
async function westIstanbulMarinaDemo() {
  console.log('\n=== West Istanbul Marina Check-in Demo ===\n');

  // Captain voice command
  console.log('Captain: "Ada, West Istanbul Marina\'ya check-in yap"\n');

  // Ada asks for permission
  console.log('Ada.sea: "Marina\'ya şu bilgileri göndermem gerekiyor:');
  console.log('         - Tekne: Phisedelia');
  console.log('         - Uzunluk: 65 feet');
  console.log('         - Berth: C-42');
  console.log('         Onaylıyor musunuz?"\n');

  // Captain approves
  console.log('Captain: "Evet"\n');

  // Execute check-in
  const result = await marinaIntegration.checkInToMarina({
    marinaId: 'west-istanbul-marina',
    marinaName: 'West Istanbul Marina',
    vesselName: 'Phisedelia',
    berthNumber: 'C-42',
    currentPosition: { latitude: 40.9872, longitude: 29.0872 },
  });

  // Confirmation
  console.log('Ada.sea: ✓ "Check-in tamamlandı."\n');

  // Audit log
  console.log('[AUDIT LOG]');
  console.log('- Sent: vessel_name, length, berth_number, current_position');
  console.log('- NOT sent: GPS history, crew info, financial data');
  console.log('- Captain: voice_confirmation');
  console.log('- Time: 2025-11-12T15:45:00Z\n');
}
```

---

## 11. TECHNICAL DETAILS

### Encryption

- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key Derivation:** PBKDF2 with 100,000 iterations
- **Random IV:** Generated per backup
- **Authentication:** GCM auth tag for integrity

### Data Storage

- **Primary:** On-device (Mac Mini M4) encrypted SQLite
- **Backup (optional):** Zero-knowledge cloud (captain's key only)
- **Logs:** Encrypted locally, retention controlled by captain

### Security Architecture

```
LAYER 1: Physical Security
├─ Mac Mini M4 on-board
├─ Captain's physical control
└─ No remote admin access

LAYER 2: Network Security
├─ VPN for any outbound (if enabled)
├─ Firewall: deny all inbound by default
└─ mTLS for marina connections

LAYER 3: Application Security
├─ Sandboxed processes
├─ Encrypted local storage (AES-256)
└─ Memory encryption

LAYER 4: Data Security
├─ AES-256-GCM encryption
├─ Zero-knowledge backup
└─ Secure key management (PBKDF2)

LAYER 5: Access Control
├─ Captain biometric auth
├─ Voice signature verification
└─ Session timeouts

LAYER 6: Audit & Compliance
├─ Complete activity log
├─ Tamper-proof audit trail
└─ Regular security reviews
```

---

## 12. DEVELOPMENT & TESTING

### Run Privacy Tests

```bash
# Run privacy unit tests
npm test -- privacy

# Run integration tests
npm test -- integration/privacy

# Run compliance tests (KVKK/GDPR)
npm test -- compliance
```

### Privacy Code Examples

See `examples/privacy/` directory for:
- `basic-consent-flow.ts` - Basic captain consent
- `marina-integration.ts` - Ada.Marina privacy integration
- `zero-knowledge-backup.ts` - Encrypted backup demo
- `audit-trail.ts` - Audit logging examples

---

## 13. SUPPORT & CONTACT

### Privacy Questions

- Email: privacy@ada.sea
- Data Protection Officer: veri-sorumlusu@ada.sea
- Privacy Hotline: +90 xxx xxx xxxx

### Report Privacy Issues

If you discover a privacy issue:

1. **DO NOT** open a public GitHub issue
2. Email: security@ada.sea with details
3. Use PGP key: [link to PGP key]
4. We respond within 24 hours

---

## 🎯 SUMMARY

**Ada.sea is the maritime industry's most privacy-conscious platform.**

**What makes us different:**

1. ✓ **Zero automatic sharing** - Everything requires captain approval
2. ✓ **Edge-first architecture** - Data stays on your vessel
3. ✓ **Complete transparency** - Full audit trail of all transfers
4. ✓ **Voice-controlled privacy** - Natural Turkish voice commands
5. ✓ **Zero-knowledge backup** - Even we can't read your backups
6. ✓ **KVKK/GDPR compliant** - Ready for Turkish and EU regulations
7. ✓ **Captain owns data** - Delete, export, control everything

**Demo it at West Istanbul Marina with Phisedelia!**

---

*Last updated: 2025-11-12*
*Version: 1.0.0*
*License: See LICENSE file*
