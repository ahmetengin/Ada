/**
 * Q&A Session Example - Ada.Interpreter
 * Demonstrates Q&A mode with speaker and audience interactions
 */

import { InterpreterNode, AudioSegment } from '../InterpreterNode.js';

async function main() {
  console.log('🎤 Ada.Interpreter - Q&A Session Example\n');

  // ========================================================================
  // 1. Initialize Interpreter for Q&A Session
  // ========================================================================

  const interpreter = new InterpreterNode({
    name: 'Maritime Summit Q&A Interpreter',
    interpreterInfo: {
      name: 'Ada Q&A Interpreter',
      supportedLanguages: ['en', 'tr', 'ar', 'ru', 'el', 'fr', 'de', 'it'],
      primaryLanguage: 'en',
      maxLatency: 300, // Lower latency for Q&A
      qualityMode: 'speed' // Prioritize speed for interactive sessions
    },
    sessionInfo: {
      sessionId: 'maritime-summit-2025-qa',
      room: 'Main Hall',
      targetLanguages: ['en', 'tr', 'ar'],
      passkitEndpoint: 'https://congress.kites.com/passkit'
    }
  });

  await interpreter.initialize();
  console.log('✅ Q&A Interpreter initialized\n');

  // ========================================================================
  // 2. Simulate Q&A Exchange
  // ========================================================================

  // Speaker introduces Q&A session
  console.log('🎙️ SPEAKER: Opening Q&A session...');
  const introduction: AudioSegment = {
    id: 'qa-segment-001',
    audioData: 'speaker_opening_audio',
    timestamp: new Date(),
    duration: 4000,
    micSource: 'speaker_mic',
    sessionId: 'maritime-summit-2025-qa',
    room: 'Main Hall'
  };

  let output = await interpreter.processAudioSegment(introduction);
  displayQAOutput(output, 'SPEAKER');

  // Wait a moment
  await sleep(1000);

  // Audience Question 1
  console.log('\n👤 AUDIENCE: Question from attendee...');
  const question1: AudioSegment = {
    id: 'qa-segment-002',
    audioData: 'audience_question_1_audio',
    timestamp: new Date(),
    duration: 5000,
    micSource: 'audience_mic', // ← Audience microphone
    sessionId: 'maritime-summit-2025-qa',
    room: 'Main Hall'
  };

  output = await interpreter.processAudioSegment(question1);
  displayQAOutput(output, 'AUDIENCE');

  await sleep(1000);

  // Speaker Answer 1
  console.log('\n🎙️ SPEAKER: Answering question...');
  const answer1: AudioSegment = {
    id: 'qa-segment-003',
    audioData: 'speaker_answer_1_audio',
    timestamp: new Date(),
    duration: 8000,
    micSource: 'speaker_mic',
    sessionId: 'maritime-summit-2025-qa',
    room: 'Main Hall'
  };

  output = await interpreter.processAudioSegment(answer1);
  displayQAOutput(output, 'SPEAKER');

  await sleep(1000);

  // Audience Question 2
  console.log('\n👤 AUDIENCE: Another question...');
  const question2: AudioSegment = {
    id: 'qa-segment-004',
    audioData: 'audience_question_2_audio',
    timestamp: new Date(),
    duration: 6000,
    micSource: 'audience_mic',
    sessionId: 'maritime-summit-2025-qa',
    room: 'Main Hall'
  };

  output = await interpreter.processAudioSegment(question2);
  displayQAOutput(output, 'AUDIENCE');

  await sleep(1000);

  // Speaker Answer 2
  console.log('\n🎙️ SPEAKER: Final answer...');
  const answer2: AudioSegment = {
    id: 'qa-segment-005',
    audioData: 'speaker_answer_2_audio',
    timestamp: new Date(),
    duration: 7000,
    micSource: 'speaker_mic',
    sessionId: 'maritime-summit-2025-qa',
    room: 'Main Hall'
  };

  output = await interpreter.processAudioSegment(answer2);
  displayQAOutput(output, 'SPEAKER');

  // ========================================================================
  // 3. Generate Session Summary
  // ========================================================================

  console.log('\n\n📊 Generating Q&A Session Summary...\n');

  const summary = await interpreter.generateSessionSummary('maritime-summit-2025-qa');

  console.log('=' .repeat(80));
  console.log('Q&A SESSION SUMMARY');
  console.log('=' .repeat(80));
  console.log('');

  console.log('Session ID:', summary.session_id);
  console.log('Room:', summary.room);
  console.log('Duration:', formatDuration(summary.start_time, summary.end_time));
  console.log('');

  console.log('Statistics:');
  console.log('→ Total Segments:', summary.total_segments);
  console.log('→ Speaker Segments:', summary.speaker_segments);
  console.log('→ Audience Segments:', summary.audience_segments);
  console.log('→ Languages Detected:', summary.languages_detected.join(', '));
  console.log('');

  console.log('Key Points:');
  summary.key_points.forEach((point, i) => {
    console.log(`${i + 1}. ${point}`);
  });
  console.log('');

  console.log('Highlights:');
  summary.highlights.forEach((highlight, i) => {
    console.log(`• ${highlight}`);
  });
  console.log('');

  console.log('Notable Quotes:');
  summary.quotes.forEach((quote, i) => {
    console.log(`${i + 1}. ${quote}`);
  });
  console.log('');

  console.log('Action Items:');
  summary.action_items.forEach((item, i) => {
    console.log(`☐ ${item}`);
  });
  console.log('');

  console.log('Summary:');
  console.log(summary.summary);
  console.log('');

  console.log('=' .repeat(80));

  // ========================================================================
  // 4. Get Statistics
  // ========================================================================

  console.log('\n📈 Session Statistics:\n');

  const stats = await interpreter.processTask({
    type: 'get-statistics',
    data: {}
  });

  console.log('Total Segments Processed:', stats.totalSegments);
  console.log('Active Sessions:', stats.activeSessions);
  console.log('Average Processing Time:', stats.averageProcessingTime.toFixed(0), 'ms');
  console.log('Average Confidence:', (stats.averageConfidence * 100).toFixed(1) + '%');
  console.log('');

  console.log('Language Distribution:');
  Object.entries(stats.languageDistribution).forEach(([lang, count]) => {
    console.log(`→ ${lang}:`, count);
  });
  console.log('');

  console.log('Speaker Type Distribution:');
  console.log('→ Speaker:', stats.speakerSegments);
  console.log('→ Audience:', stats.audienceSegments);

  // ========================================================================
  // 5. Shutdown
  // ========================================================================

  console.log('\n✅ Q&A session complete');
  await interpreter.shutdown();
}

// Helper function to display Q&A output
function displayQAOutput(output: any, speaker: string): void {
  const icon = speaker === 'SPEAKER' ? '🎙️' : '👤';
  const border = speaker === 'SPEAKER' ? '─' : '┄';

  console.log('');
  console.log(border.repeat(80));
  console.log(`${icon} ${speaker} (${output.detectedLanguage.toUpperCase()}) - ${output.processingTime}ms`);
  console.log(border.repeat(80));
  console.log('');
  console.log('Original:', output.sttSource);
  console.log('');

  // Show translations
  if (output.translations.tr && output.detectedLanguage !== 'tr') {
    console.log('[TR]', output.translations.tr);
  }
  if (output.translations.ar && output.detectedLanguage !== 'ar') {
    console.log('[AR]', output.translations.ar);
  }
  console.log('');

  // Show caption
  console.log('Caption:', output.caption.replace(/\n/g, ' / '));
  console.log(border.repeat(80));
}

// Helper function to format duration
function formatDuration(start: Date, end: Date): string {
  const durationMs = end.getTime() - start.getTime();
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// Helper function for delay
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run example
main().catch(console.error);
