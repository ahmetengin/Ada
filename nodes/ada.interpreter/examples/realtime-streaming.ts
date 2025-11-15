/**
 * Real-time Streaming Example - Ada.Interpreter
 * Demonstrates WebSocket streaming for live conferences
 */

import { InterpreterNode, AudioSegment, InterpreterOutput } from '../InterpreterNode.js';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

// ============================================================================
// WebSocket Server for Live Streaming
// ============================================================================

class InterpreterStreamingServer extends EventEmitter {
  private wss: WebSocket.Server;
  private interpreter: InterpreterNode;
  private clients: Set<WebSocket> = new Set();

  constructor(port: number, interpreter: InterpreterNode) {
    super();
    this.interpreter = interpreter;
    this.wss = new WebSocket.Server({ port });
    this.setupServer();
  }

  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('✅ Client connected');
      this.clients.add(ws);

      ws.on('message', async (data: WebSocket.Data) => {
        await this.handleMessage(ws, data);
      });

      ws.on('close', () => {
        console.log('❌ Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send welcome message
      this.send(ws, {
        type: 'connected',
        message: 'Ada.Interpreter streaming server',
        timestamp: new Date().toISOString()
      });
    });

    console.log(`🌐 Streaming server started on port ${this.wss.options.port}`);
  }

  private async handleMessage(ws: WebSocket, data: WebSocket.Data): Promise<void> {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'audio-chunk':
          await this.handleAudioChunk(message);
          break;

        case 'start-session':
          this.handleStartSession(message);
          break;

        case 'end-session':
          await this.handleEndSession(message);
          break;

        case 'get-statistics':
          await this.handleGetStatistics(ws);
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.send(ws, {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleAudioChunk(message: any): Promise<void> {
    const segment: AudioSegment = {
      id: message.segmentId || generateId(),
      audioData: message.audioData, // base64 or buffer
      timestamp: new Date(message.timestamp || Date.now()),
      duration: message.duration,
      micSource: message.micSource || 'speaker_mic',
      sessionId: message.sessionId,
      room: message.room
    };

    // Process audio segment
    const output = await this.interpreter.processAudioSegment(segment);

    // Broadcast to all connected clients
    this.broadcast({
      type: 'interpretation',
      data: output
    });
  }

  private handleStartSession(message: any): void {
    console.log('🎬 Session started:', message.sessionId);

    this.broadcast({
      type: 'session-started',
      sessionId: message.sessionId,
      room: message.room,
      timestamp: new Date().toISOString()
    });
  }

  private async handleEndSession(message: any): Promise<void> {
    console.log('🎬 Session ended:', message.sessionId);

    // Generate session summary
    const summary = await this.interpreter.generateSessionSummary(message.sessionId);

    this.broadcast({
      type: 'session-ended',
      sessionId: message.sessionId,
      summary,
      timestamp: new Date().toISOString()
    });
  }

  private async handleGetStatistics(ws: WebSocket): Promise<void> {
    const stats = await this.interpreter.processTask({
      type: 'get-statistics',
      data: {}
    });

    this.send(ws, {
      type: 'statistics',
      data: stats
    });
  }

  private send(ws: WebSocket, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  private broadcast(data: any): void {
    const message = JSON.stringify(data);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  async close(): Promise<void> {
    this.wss.close();
    console.log('🔌 Streaming server closed');
  }
}

// ============================================================================
// Client Example
// ============================================================================

class InterpreterStreamingClient {
  private ws: WebSocket;
  private handlers: Map<string, Function[]> = new Map();

  constructor(serverUrl: string) {
    this.ws = new WebSocket(serverUrl);
    this.setupClient();
  }

  private setupClient(): void {
    this.ws.on('open', () => {
      console.log('✅ Connected to streaming server');
      this.emit('connected');
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      const message = JSON.parse(data.toString());
      this.emit(message.type, message);
    });

    this.ws.on('close', () => {
      console.log('❌ Disconnected from server');
      this.emit('disconnected');
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });
  }

  on(event: string, handler: Function): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  private emit(event: string, data?: any): void {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  sendAudioChunk(segment: Partial<AudioSegment>): void {
    this.send({
      type: 'audio-chunk',
      ...segment
    });
  }

  startSession(sessionId: string, room: string): void {
    this.send({
      type: 'start-session',
      sessionId,
      room
    });
  }

  endSession(sessionId: string): void {
    this.send({
      type: 'end-session',
      sessionId
    });
  }

  getStatistics(): void {
    this.send({
      type: 'get-statistics'
    });
  }

  private send(data: any): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  close(): void {
    this.ws.close();
  }
}

// ============================================================================
// Demo: Server + Client
// ============================================================================

async function main() {
  console.log('🎤 Ada.Interpreter - Real-time Streaming Demo\n');

  // ========================================================================
  // 1. Initialize Interpreter
  // ========================================================================

  const interpreter = new InterpreterNode({
    name: 'Streaming Conference Interpreter',
    interpreterInfo: {
      name: 'Ada Streaming Interpreter',
      supportedLanguages: ['en', 'tr', 'ar', 'ru', 'el', 'fr', 'de', 'it'],
      primaryLanguage: 'en',
      maxLatency: 200, // Ultra-low latency for streaming
      qualityMode: 'speed'
    },
    sessionInfo: {
      sessionId: 'live-stream-2025',
      room: 'Virtual Hall 1',
      targetLanguages: ['en', 'tr', 'ar'],
      passkitEndpoint: 'https://congress.kites.com/passkit'
    }
  });

  await interpreter.initialize();
  console.log('✅ Interpreter initialized\n');

  // ========================================================================
  // 2. Start Streaming Server
  // ========================================================================

  const server = new InterpreterStreamingServer(8080, interpreter);

  // Wait for server to start
  await sleep(1000);

  // ========================================================================
  // 3. Connect Client
  // ========================================================================

  const client = new InterpreterStreamingClient('ws://localhost:8080');

  // Setup event handlers
  client.on('connected', () => {
    console.log('📱 Client connected to server\n');
  });

  client.on('interpretation', (message: any) => {
    const output: InterpreterOutput = message.data;
    console.log('\n📊 INTERPRETATION RECEIVED:');
    console.log('─'.repeat(80));
    console.log(`[${output.detectedLanguage.toUpperCase()}] ${output.sttSource}`);
    console.log(`Caption: ${output.caption.replace(/\n/g, ' / ')}`);
    console.log(`Processing: ${output.processingTime}ms | Confidence: ${(output.confidence * 100).toFixed(1)}%`);
    console.log('─'.repeat(80));
  });

  client.on('session-started', (message: any) => {
    console.log('\n🎬 SESSION STARTED:', message.sessionId);
  });

  client.on('session-ended', (message: any) => {
    console.log('\n🎬 SESSION ENDED:', message.sessionId);
    console.log('\nSummary:', message.summary.summary);
    console.log('Total Segments:', message.summary.total_segments);
  });

  // Wait for client to connect
  await sleep(1000);

  // ========================================================================
  // 4. Simulate Live Conference Stream
  // ========================================================================

  console.log('🎙️ Starting live conference simulation...\n');

  // Start session
  client.startSession('live-stream-2025', 'Virtual Hall 1');
  await sleep(500);

  // Simulate audio chunks
  const chunks = [
    { duration: 3000, micSource: 'speaker_mic' as const, text: 'Welcome to the conference' },
    { duration: 2000, micSource: 'speaker_mic' as const, text: 'Today we will discuss AI' },
    { duration: 4000, micSource: 'audience_mic' as const, text: 'I have a question' },
    { duration: 5000, micSource: 'speaker_mic' as const, text: 'Great question, let me explain' },
    { duration: 3000, micSource: 'speaker_mic' as const, text: 'Thank you everyone' }
  ];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    client.sendAudioChunk({
      segmentId: `stream-segment-${i + 1}`,
      audioData: `base64_audio_${i + 1}`, // In production: real audio
      timestamp: new Date(),
      duration: chunk.duration,
      micSource: chunk.micSource,
      sessionId: 'live-stream-2025',
      room: 'Virtual Hall 1'
    });

    // Realistic delay between chunks
    await sleep(chunk.duration + 500);
  }

  // ========================================================================
  // 5. End Session and Get Statistics
  // ========================================================================

  await sleep(1000);

  client.endSession('live-stream-2025');
  await sleep(1000);

  client.getStatistics();
  await sleep(1000);

  // ========================================================================
  // 6. Cleanup
  // ========================================================================

  console.log('\n🧹 Cleaning up...');

  client.close();
  await server.close();
  await interpreter.shutdown();

  console.log('✅ Demo complete');
  process.exit(0);
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run demo
main().catch(console.error);
