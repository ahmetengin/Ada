/**
 * Privacy Demo - Ada.sea Privacy-First Architecture
 * Demonstrates captain consent flow and zero-trust data sharing
 */

import { PrivacyCore } from '../core/privacy/PrivacyCore.js';
import { AdaMarinaPrivacyIntegration } from '../core/privacy/AdaMarinaPrivacyIntegration.js';
import { ZeroKnowledgeBackup } from '../core/privacy/ZeroKnowledgeBackup.js';

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Ada.sea Privacy-First Architecture Demo        ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // 1. Initialize Privacy Core
  console.log('1️⃣  Initializing Privacy Core...\n');

  const privacyCore = new PrivacyCore({
    captainId: 'boss@ada.sea',
    vesselName: 'Phisedelia',
    enableVoiceConsent: true,
    defaultSettings: {
      autoShareDisabled: true,      // Zero trust by default
      cloudSyncEnabled: false,       // No cloud by default
      notifyOnEveryShare: true,
    },
  });

  console.log('✓ Privacy Core initialized');
  console.log('  - Zero Trust: ENABLED');
  console.log('  - Cloud Sync: DISABLED');
  console.log('  - Captain Consent: REQUIRED\n');

  // 2. Setup Privacy Event Handlers
  privacyCore.on('consent:required', (event) => {
    console.log('\n🔒 [CONSENT REQUIRED]');
    console.log(`   ${event.prompt.promptText}\n`);

    // Simulate captain voice approval after 2 seconds
    setTimeout(() => {
      console.log('🎤 Captain: "Evet, paylaş"\n');
      privacyCore.grantPermission(event.requestId, true, 'voice', 'Evet, paylaş');
    }, 2000);
  });

  privacyCore.on('data:transfer', (event) => {
    console.log('📤 [DATA TRANSFERRED]');
    console.log(`   To: ${event.destination}`);
    console.log(`   Data Types: ${event.dataType.join(', ')}`);
    console.log(`   Bytes: ${event.log.bytesSent}`);
    console.log(`   Authorization: ${event.log.captainAuthorization.method}\n`);
  });

  // 3. West Istanbul Marina Check-in Scenario
  console.log('\n2️⃣  Scenario: West Istanbul Marina Check-in\n');
  console.log('Captain (Voice): "Ada, West Istanbul Marina\'ya check-in yap"\n');

  const marinaIntegration = new AdaMarinaPrivacyIntegration(privacyCore);

  // Wait for consent and execute
  await new Promise(resolve => setTimeout(resolve, 500));

  const checkInResult = await marinaIntegration.checkInToMarina({
    marinaId: 'west-istanbul-marina',
    marinaName: 'West Istanbul Marina',
    vesselName: 'Phisedelia',
    berthNumber: 'C-42',
    currentPosition: {
      latitude: 40.9872,
      longitude: 29.0872,
    },
  });

  // Wait for consent flow to complete
  await new Promise(resolve => setTimeout(resolve, 3000));

  if (checkInResult.success) {
    console.log('✓ Ada: "Check-in tamamlandı."\n');
  }

  // 4. View Audit Trail
  console.log('\n3️⃣  Viewing Audit Trail\n');

  const auditReport = privacyCore.getAuditTrail(7);
  console.log(`Total Transfers (Last 7 Days): ${auditReport.summary.totalTransfers}`);
  console.log(`  ✓ Approved: ${auditReport.summary.approvedTransfers}`);
  console.log(`  ✗ Denied: ${auditReport.summary.deniedTransfers}`);
  console.log(`  ⚠ Failed: ${auditReport.summary.failedTransfers}`);
  console.log(`  📊 Total Bytes Shared: ${auditReport.summary.totalBytesShared}\n`);

  // Show recent transfers
  if (auditReport.transfers.length > 0) {
    console.log('Recent Transfers:');
    auditReport.transfers.forEach((transfer, index) => {
      console.log(`  ${index + 1}. ${transfer.destination}`);
      console.log(`     - Data: ${transfer.dataSummary}`);
      console.log(`     - Result: ${transfer.result}`);
      console.log(`     - Time: ${transfer.timestamp.toLocaleString()}`);
    });
    console.log();
  }

  // 5. Create Standing Permission for Yalikavak Marina
  console.log('\n4️⃣  Creating Standing Permission for Yalikavak Marina\n');

  const standingPerm = privacyCore.createStandingPermission(
    'Yalikavak Marina',
    ['vessel_specifications', 'arrival_time'],
    'Otomatik berth reservation',
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    ['only_for_berth_reservation']
  );

  console.log('✓ Standing Permission Created:');
  console.log(`  - Marina: ${standingPerm.destination}`);
  console.log(`  - Data Types: ${standingPerm.dataTypes.join(', ')}`);
  console.log(`  - Expires: ${standingPerm.expiresAt?.toLocaleDateString()}`);
  console.log(`  - Purpose: ${standingPerm.purpose}\n`);

  // 6. Zero-Knowledge Backup Demo
  console.log('\n5️⃣  Zero-Knowledge Backup (Optional)\n');

  const backup = new ZeroKnowledgeBackup({
    captainId: 'boss@ada.sea',
    vesselName: 'Phisedelia',
    backupEndpoint: 'https://backup.ada.sea',
    localKeyStorage: '/secure/keys',
  });

  // Enable backup
  const backupEnabled = await backup.enableBackup('captain-secret-passphrase-12345');
  console.log(backupEnabled.message);

  // Create a backup
  console.log('\nCreating encrypted backup...');
  const backupResult = await backup.backupData('logbook', {
    entries: [
      { time: new Date(), note: 'Departed from Bodrum' },
      { time: new Date(), note: 'Arrived at Yalikavak' },
    ],
    journey: {
      distance: 15,
      duration: 120,
    },
  });

  if (backupResult.success) {
    console.log(`✓ Backup created: ${backupResult.backupId}`);
    console.log('  - Encryption: AES-256-GCM');
    console.log('  - Readable by: Captain only');
    console.log('  - Ada.sea servers: CANNOT read this data\n');
  }

  // Show backup status
  const backupStatus = backup.getBackupStatus();
  console.log('Backup Status:');
  console.log(`  - Enabled: ${backupStatus.enabled}`);
  console.log(`  - Backup Count: ${backupStatus.backupCount}`);
  console.log(`  - Total Size: ${backupStatus.totalSize} bytes`);
  console.log(`  - Key ID: ${backupStatus.keyId}\n`);

  // 7. Privacy Statistics
  console.log('\n6️⃣  Privacy Statistics\n');

  const privacyStats = privacyCore.getPrivacyStats();
  console.log('Privacy Statistics:');
  console.log(`  - Total Transfers: ${privacyStats.totalTransfers}`);
  console.log(`  - Approved: ${privacyStats.approvedCount}`);
  console.log(`  - Denied: ${privacyStats.deniedCount}`);
  console.log(`  - Standing Permissions: ${privacyStats.standingPermissionsCount}`);
  console.log(`  - Blocked Destinations: ${privacyStats.blockedDestinations}`);
  console.log(`  - Audit Log Size: ${privacyStats.auditLogSize} entries\n`);

  // 8. Export Audit Logs
  console.log('\n7️⃣  Export Options\n');

  console.log('Captain can export audit logs for review:');
  console.log('  - JSON format: privacyCore.exportAuditLogs("json")');
  console.log('  - CSV format: privacyCore.exportAuditLogs("csv")');
  console.log('  - Backup info: backup.exportBackupInfo()\n');

  // Voice commands demo
  console.log('\n8️⃣  Voice Commands for Privacy Control\n');
  console.log('Captain can use these voice commands:');
  console.log('  • "Ada, veri paylaşım geçmişini göster"');
  console.log('  • "Ada, Yalikavak Marina\'ya ne gönderdin?"');
  console.log('  • "Ada, tüm otomatik paylaşımları durdur"');
  console.log('  • "Ada, [destination] ile paylaşımı engelle"');
  console.log('  • "Ada, yedekleme durumunu göster"');
  console.log('  • "Ada, tüm bulut yedeklerini sil"\n');

  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║            Demo Completed Successfully            ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
}

// Run the demo
main().catch(console.error);
