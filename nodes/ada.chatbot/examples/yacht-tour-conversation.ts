/**
 * Example: Multi-turn conversation for yacht tour booking
 *
 * This demonstrates how ada.chatbot orchestrates the entire Ada ecosystem
 * to handle a complete booking flow from initial inquiry to confirmation.
 */

import { ChatbotNode } from '../ChatbotNode.js';

async function yachtTourConversationExample() {
  // Initialize chatbot
  const chatbot = new ChatbotNode({
    name: 'Ada Chatbot',
    llmProvider: 'anthropic',
    modelName: 'claude-3-opus',
    apiKey: process.env.ANTHROPIC_API_KEY || 'demo-key',
    voiceEnabled: true,
    voiceProvider: 'whisper',
    voiceApiKey: process.env.OPENAI_API_KEY,
    ttsEnabled: true,
    ttsProvider: 'elevenlabs',
    supportedLanguages: ['tr', 'en', 'el'],
    defaultLanguage: 'tr',
    availableNodes: [
      'ada.travel',
      'ada.sea',
      'ada.weather',
      'ada.marina',
      'ada.legal',
      'ada.finance',
      'ada.customer',
    ],
  });

  await chatbot.initialize();

  console.log('=== Ada Chatbot - Yacht Tour Booking Demo ===\n');

  // ============================================
  // Turn 1: Initial inquiry (Voice input)
  // ============================================
  console.log('👤 USER (Voice): "Ada, 3 aile 6 yetişkin bir 13 yaşında 8 gün Bodrumdan Yunanistan adaları turu istiyoruz"');
  console.log();

  const response1 = await chatbot.processMessage({
    content: 'Ada, 3 aile 6 yetişkin bir 13 yaşında 8 gün Bodrumdan Yunanistan adaları turu istiyoruz',
    language: 'tr',
    channel: 'voice',
  });

  console.log('🤖 ADA:');
  console.log(response1.response);
  console.log();
  console.log(`Intent: ${response1.intent}`);
  console.log(`Session ID: ${response1.sessionId}`);
  console.log(`Requires follow-up: ${response1.requiresFollowUp}`);
  console.log();

  if (response1.suggestions && response1.suggestions.length > 0) {
    console.log('💡 Suggestions:');
    response1.suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    console.log();
  }

  // ============================================
  // Behind the scenes: Node orchestration
  // ============================================
  console.log('--- Behind the Scenes: Node Orchestration ---');
  console.log();
  console.log('🔄 ada.chatbot → ada.legal (check-visa-requirements)');
  console.log('   ↳ Request: { nationality: "Turkey", destination: "Greek islands" }');
  console.log('   ↳ Response: { required: true, processingDays: 15, fees: 80, dekaTax: 1500 }');
  console.log();

  console.log('🔄 ada.chatbot → ada.sea (plan-voyage)');
  console.log('   ↳ Request: { origin: "Bodrum", destination: "Greek islands", duration: 8, passengers: 7 }');
  console.log('   ↳ Response: {');
  console.log('       waypoints: ["Bodrum", "Kos", "Rhodes", "Symi", "Nisyros", "Bodrum"],');
  console.log('       totalDistance: 155,');
  console.log('       estimatedHours: 24.5');
  console.log('     }');
  console.log();

  console.log('🔄 ada.chatbot → ada.weather (get-forecast)');
  console.log('   ↳ Request: { route: [...waypoints], days: 8 }');
  console.log('   ↳ Response: { summary: "Hafif Meltem, deniz durumu iyi", wind: "15-20kt NW", seaState: "2-3" }');
  console.log();

  console.log('🔄 ada.chatbot → ada.marina (search-marinas)');
  console.log('   ↳ Request: { route: [...waypoints] }');
  console.log('   ↳ Response: {');
  console.log('       marinas: [');
  console.log('         { name: "Kos Marina", pricePerNight: 60, available: true },');
  console.log('         { name: "Rhodes Mandraki", pricePerNight: 80, available: true },');
  console.log('         { name: "Symi Harbor", pricePerNight: 45, available: true }');
  console.log('       ]');
  console.log('     }');
  console.log();

  console.log('🔄 ada.chatbot → ada.finance (estimate-tour-cost)');
  console.log('   ↳ Request: { duration: 8, passengers: 7, distance: 155, marinas: [...] }');
  console.log('   ↳ Response: {');
  console.log('       charter: 4000,');
  console.log('       marinas: 370,');
  console.log('       fuel: 150,');
  console.log('       food: 500,');
  console.log('       legal: 1580,');
  console.log('       total: 6600');
  console.log('     }');
  console.log();

  // ============================================
  // Turn 2: User confirms booking
  // ============================================
  console.log('--- Conversation Turn 2 ---\n');
  console.log('👤 USER: "Evet, rezervasyon yap"');
  console.log();

  const response2 = await chatbot.processMessage({
    content: 'Evet, rezervasyon yap',
    sessionId: response1.sessionId,
    language: 'tr',
  });

  console.log('🤖 ADA:');
  console.log(response2.response);
  console.log();

  // ============================================
  // Behind the scenes: Booking flow
  // ============================================
  console.log('--- Behind the Scenes: Booking Flow ---');
  console.log();
  console.log('🔄 ada.chatbot → ada.travel (create-package)');
  console.log('   ↳ Creates complete tour package with all details');
  console.log();
  console.log('🔄 ada.chatbot → ada.marina (reserve-berth)');
  console.log('   ↳ Reserves berths at Kos, Rhodes, Symi marinas');
  console.log();
  console.log('🔄 ada.chatbot → ada.legal (prepare-documents)');
  console.log('   ↳ Prepares Transit Log, crew list, passenger list');
  console.log();
  console.log('🔄 ada.chatbot → ada.finance (create-invoice)');
  console.log('   ↳ Generates invoice for €6600');
  console.log();
  console.log('🔄 ada.chatbot → ada.customer (create-booking-record)');
  console.log('   ↳ Stores customer booking with all details');
  console.log();

  // ============================================
  // Turn 3: Follow-up question
  // ============================================
  console.log('--- Conversation Turn 3 ---\n');
  console.log('👤 USER: "Hava durumu nasıl olacak?"');
  console.log();

  const response3 = await chatbot.processMessage({
    content: 'Hava durumu nasıl olacak?',
    sessionId: response1.sessionId,
    language: 'tr',
  });

  console.log('🤖 ADA:');
  console.log(response3.response);
  console.log();
  console.log(`Intent: ${response3.intent}`);
  console.log();

  // ============================================
  // Turn 4: Context-aware question
  // ============================================
  console.log('--- Conversation Turn 4 ---\n');
  console.log('👤 USER: "Çocuk için özel bir şey düşünmek gerekir mi?"');
  console.log();

  const response4 = await chatbot.processMessage({
    content: 'Çocuk için özel bir şey düşünmek gerekir mi?',
    sessionId: response1.sessionId,
    language: 'tr',
  });

  console.log('🤖 ADA:');
  console.log(response4.response);
  console.log();

  // ============================================
  // Voice output example
  // ============================================
  console.log('--- Voice Output (TTS) ---\n');
  if (response1.audioResponse) {
    console.log('🔊 Ada responds with voice (ElevenLabs TTS)');
    console.log(`   Audio buffer size: ${response1.audioResponse.length} bytes`);
  } else {
    console.log('🔊 TTS not enabled in this demo');
  }
  console.log();

  // ============================================
  // Session summary
  // ============================================
  console.log('=== Session Summary ===\n');
  console.log(`Session ID: ${response1.sessionId}`);
  console.log(`Total turns: 4`);
  console.log(`Language: Turkish`);
  console.log(`Channel: Voice`);
  console.log();
  console.log('Nodes involved:');
  console.log('  • ada.chatbot (orchestrator)');
  console.log('  • ada.travel (package creation)');
  console.log('  • ada.sea (route planning)');
  console.log('  • ada.weather (forecast)');
  console.log('  • ada.marina (reservations)');
  console.log('  • ada.legal (visa & documents)');
  console.log('  • ada.finance (cost calculation)');
  console.log('  • ada.customer (booking record)');
  console.log();
  console.log('Booking status: ✅ Confirmed');
  console.log('Total cost: €6600 (€2200/family)');
  console.log('Departure: July 15, 2025');
  console.log('Return: July 23, 2025');
}

// Run example
yachtTourConversationExample().catch(console.error);
