/**
 * Basic Usage Example - Ada.Interpreter
 * Demonstrates basic setup and single-segment processing
 */

import { InterpreterNode, AudioSegment } from '../InterpreterNode.js';

async function main() {
  console.log('🎤 Ada.Interpreter - Basic Usage Example\n');

  // ========================================================================
  // 1. Initialize Interpreter
  // ========================================================================

  console.log('Initializing interpreter...');

  const interpreter = new InterpreterNode({
    name: 'Maritime Tech Summit Interpreter',
    interpreterInfo: {
      name: 'Ada Conference Interpreter',
      supportedLanguages: ['en', 'tr', 'ar', 'ru', 'el', 'fr', 'de', 'it'],
      primaryLanguage: 'en',
      maxLatency: 500, // milliseconds
      qualityMode: 'balanced' // 'speed' | 'balanced' | 'quality'
    },
    sessionInfo: {
      sessionId: 'maritime-summit-2025-keynote',
      room: 'Main Hall',
      targetLanguages: ['en', 'tr', 'ar'], // Translate to these languages
      passkitEndpoint: 'https://congress.kites.com/passkit'
    }
  });

  await interpreter.initialize();
  console.log('✅ Interpreter initialized\n');

  // ========================================================================
  // 2. Process a Speaker Segment
  // ========================================================================

  console.log('Processing speaker segment...');

  const speakerSegment: AudioSegment = {
    id: 'segment-001',
    audioData: 'base64_encoded_audio_data_here', // In production: real audio buffer
    timestamp: new Date(),
    duration: 3000, // 3 seconds
    micSource: 'speaker_mic',
    sessionId: 'maritime-summit-2025-keynote',
    room: 'Main Hall'
  };

  const output = await interpreter.processAudioSegment(speakerSegment);

  console.log('✅ Processing completed in', output.processingTime, 'ms\n');

  // ========================================================================
  // 3. Display Output
  // ========================================================================

  console.log('📊 Interpretation Output:');
  console.log('=' .repeat(80));
  console.log(interpreter.formatOutput(output));
  console.log('=' .repeat(80));

  // ========================================================================
  // 4. Access Individual Components
  // ========================================================================

  console.log('\n📝 Individual Components:\n');

  console.log('Original Text (STT):');
  console.log('→', output.sttSource);
  console.log('');

  console.log('Detected Language:');
  console.log('→', output.detectedLanguage);
  console.log('');

  console.log('Translations:');
  Object.entries(output.translations).forEach(([lang, text]) => {
    console.log(`→ [${lang.toUpperCase()}]`, text);
  });
  console.log('');

  console.log('TTS Clean Text:');
  console.log('→', output.ttsCleanText);
  console.log('');

  console.log('Caption:');
  console.log('→', output.caption.replace(/\n/g, ' / '));
  console.log('');

  console.log('Speaker Type:');
  console.log('→', output.speaker);
  console.log('');

  console.log('Confidence:');
  console.log('→', (output.confidence * 100).toFixed(1) + '%');
  console.log('');

  // ========================================================================
  // 5. Shutdown
  // ========================================================================

  await interpreter.shutdown();
  console.log('✅ Interpreter shutdown complete');
}

// Run example
main().catch(console.error);
