# Ada Ecosystem 🌊

**Kendi kendini çoğaltan, AI destekli node ekosistemi** - Denizcilik, marina, seyahat ve kongre yönetimi için.

## 🎯 Genel Bakış

Ada Ekosistemi, birbirleriyle iletişim kurabilen, kendi hafızaları ve yetenekleri olan, kendilerini klonlayabilen yapay zeka node'larından oluşan bir sistemdir. Her node tipi kendi alanında uzmanlaşmıştır ve tıpkı insanlar gibi birbirleriyle etkileşime girebilir.

## 🏗️ Mimari

### Temel Bileşenler

```
ada-ecosystem/
├── core/                      # Temel sistem bileşenleri
│   ├── BaseNode.ts           # Tüm node'lar için temel şablon
│   ├── NodeMemory.ts         # Hafıza yönetim sistemi
│   ├── NodeCommunication.ts  # Node'lar arası iletişim
│   ├── NodeReplication.ts    # Kendini çoğaltma sistemi
│   └── types.ts              # Ortak tip tanımlamaları
│
├── nodes/                     # Node türleri
│   ├── ada.sea/              # Yat yönetimi node'u
│   ├── ada.marina/           # Marina yönetimi node'u
│   ├── ada.travel/           # Seyahat acentesi node'u
│   └── ada.congress/         # Kongre yönetimi node'u
│
└── examples/                  # Örnek kullanımlar
    └── ecosystem-demo.ts     # Tam ekosistem demosu
```

## 🚢 Node Türleri

### 1. **ada.sea** - Yat Yönetimi Node'u

12 metre üzeri yatları yapay zeka ile yönetir.

**Yetenekler:**
- 🛰️ NMEA2000 veri entegrasyonu (CAN > PRG > JSON)
- 🌤️ Hava durumu takibi ve rota optimizasyonu
- 👥 Mürettebat yönetimi (lisans, sertifika, belge kontrolü)
- 🛂 Yolcu yönetimi (pasaport, vize, sağlık kontrolleri)
- 🍽️ AI destekli menü planlama ve provizyon
- 🗺️ Seyir planlaması ve güvenlik değerlendirmesi
- ⚓ Marina ile iletişim ve rezervasyon

### 2. **ada.marina** - Marina Yönetimi Node'u

Modern marina operasyonlarını AI ile yönetir. West Istanbul Marina (WIM) referans alınarak tasarlanmıştır - 155,000 m².

**Yetenekler:**
- 🚤 Berth (rıhtım) yönetimi
- 📅 Rezervasyon sistemi
- 📄 Sözleşme yönetimi (günlük, haftalık, aylık, yıllık)
- 🧾 E-Fatura entegrasyonu (Türk vergi sistemi)
- ⚡ Hizmet yönetimi (elektrik, su, yakıt, bakım)
- 💰 Gelir yönetimi ve raporlama

### 3. **ada.travel** - Seyahat Acentesi Node'u

Tüm seyahat acenteliği operasyonlarını yönetir.

**Yetenekler:**
- ✈️ Uçak rezervasyonu
- 🏨 Otel rezervasyonu
- 🚌 Tur yönetimi (günlük turlar, paket turlar)
- 🚗 Kara ulaşımı koordinasyonu
- 📦 Paket tur oluşturma

### 4. **ada.congress** - Kongre Yönetimi Node'u

Katılımcıları evlerinden alıp, etkinlik boyunca yöneterek, tekrar evlerine götürene kadar tüm süreci yönetir.

**Yetenekler:**
- 📧 Davetiye yönetimi
- 📝 Kayıt sistemi
- 💳 Ödeme yönetimi
- 📱 Apple PassKit QR kod entegrasyonu
- 🗓️ Tam itinerari (yolculuk planı) yönetimi
- ✈️ Lojistik koordinasyon

## 🧬 Kendini Çoğaltma (Self-Replication)

Her node kendini klonlayabilir:

```typescript
const clone = await yacht.clone('Azure Dream Clone 1', {
  inheritMemory: true,
  inheritConnections: true,
  purpose: 'Handle increased load',
});
```

## 💬 Node'lar Arası İletişim

Node'lar tıpkı insanlar gibi birbirleriyle iletişim kurar:

```typescript
// Soru-cevap
const response = await yachtNode.requestFromNode(
  marinaNodeId,
  'check-availability',
  {}
);
```

## 🚀 Kurulum ve Çalıştırma

```bash
# Bağımlılıkları yükle
npm install

# Demo'yu çalıştır
npm run dev
```

## 🌟 Özellikler

✨ **Kendini Çoğaltma** - Node'lar ihtiyaç halinde kendilerini klonlar
✨ **İnsan Gibi İletişim** - Node'lar arası doğal iletişim
✨ **Hafıza Sistemi** - Her node öğrenir ve hatırlar
✨ **Domain Uzmanlığı** - Her node kendi alanında uzman
✨ **Tam Otomasyon** - Minimal insan müdahalesi
✨ **Gerçek Zamanlı** - Anlık veri işleme ve karar verme

---

**Ada Ecosystem** - Geleceğin yapay zeka destekli iş süreçleri platformu 🚀