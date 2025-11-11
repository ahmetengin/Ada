/**
 * Ada Multi-Agent Observability Server
 *
 * Provides:
 * - HTTP API for event ingestion and querying
 * - WebSocket streaming for real-time updates
 * - SQLite persistence with WAL mode
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { ObservabilityDatabase } from './database';
import type { ObservabilityEvent, EventFilter } from './types';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8765;
const HOST = process.env.HOST || '0.0.0.0';

class ObservabilityServer {
  private db: ObservabilityDatabase;
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor() {
    this.db = new ObservabilityDatabase();
    this.wss = new WebSocketServer({ noServer: true });

    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('📡 New WebSocket client connected');
      this.clients.add(ws);

      ws.on('close', () => {
        console.log('📡 WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  private broadcast(event: ObservabilityEvent): void {
    const message = JSON.stringify(event);

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('❌ Failed to send to client:', error);
        }
      }
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url!, `http://${req.headers.host}`);

    try {
      // POST /events - Create new event
      if (req.method === 'POST' && url.pathname === '/events') {
        let body = '';

        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const event: ObservabilityEvent = JSON.parse(body);

            // Validate required fields
            if (!event.timestamp || !event.source_app || !event.session_id || !event.event_type) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing required fields' }));
              return;
            }

            const eventId = this.db.insertEvent(event);
            const savedEvent = { ...event, id: eventId };

            // Broadcast to WebSocket clients
            this.broadcast(savedEvent);

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id: eventId, message: 'Event created' }));

            console.log(`✅ Event received: ${event.event_type} from ${event.source_app}`);
          } catch (error) {
            console.error('❌ Error parsing event:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });

        return;
      }

      // GET /events/recent - Get recent events
      if (req.method === 'GET' && url.pathname === '/events/recent') {
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        const events = this.db.getRecentEvents(limit, offset);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(events));
        return;
      }

      // GET /events - Get filtered events
      if (req.method === 'GET' && url.pathname === '/events') {
        const filter: EventFilter = {
          source_app: url.searchParams.get('source_app') || undefined,
          session_id: url.searchParams.get('session_id') || undefined,
          event_type: url.searchParams.get('event_type') as any || undefined,
          agent_id: url.searchParams.get('agent_id') || undefined,
          agent_type: url.searchParams.get('agent_type') || undefined,
          start_time: url.searchParams.get('start_time') || undefined,
          end_time: url.searchParams.get('end_time') || undefined,
          limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 100,
          offset: url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : 0
        };

        const events = this.db.getFilteredEvents(filter);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(events));
        return;
      }

      // GET /events/filter-options - Get available filter values
      if (req.method === 'GET' && url.pathname === '/events/filter-options') {
        const options = this.db.getFilterOptions();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(options));
        return;
      }

      // GET /agents - Get all agents
      if (req.method === 'GET' && url.pathname === '/agents') {
        const agents = this.db.getAgents();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(agents));
        return;
      }

      // GET /sessions - Get all sessions
      if (req.method === 'GET' && url.pathname === '/sessions') {
        const sessions = this.db.getSessions();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sessions));
        return;
      }

      // GET /stats - Get system statistics
      if (req.method === 'GET' && url.pathname === '/stats') {
        const stats = this.db.getSystemStats();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));
        return;
      }

      // GET /health - Health check
      if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          clients: this.clients.size
        }));
        return;
      }

      // 404 Not Found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));

    } catch (error) {
      console.error('❌ Request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  start(): void {
    const server = createServer((req, res) => {
      this.handleRequest(req, res);
    });

    // Handle WebSocket upgrade
    server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url!, `http://${request.headers.host}`);

      if (url.pathname === '/stream') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    server.listen(PORT, HOST, () => {
      console.log('🚀 Ada Observability Server started');
      console.log(`📍 HTTP API: http://${HOST}:${PORT}`);
      console.log(`📡 WebSocket: ws://${HOST}:${PORT}/stream`);
      console.log('\n📊 Available endpoints:');
      console.log('  POST   /events              - Create new event');
      console.log('  GET    /events              - Get filtered events');
      console.log('  GET    /events/recent       - Get recent events');
      console.log('  GET    /events/filter-options - Get filter options');
      console.log('  GET    /agents              - Get all agents');
      console.log('  GET    /sessions            - Get all sessions');
      console.log('  GET    /stats               - Get system statistics');
      console.log('  GET    /health              - Health check');
      console.log('  WS     /stream              - Real-time event stream');
      console.log('\n✅ Ready to receive events!');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n⏹️  Shutting down server...');
      this.db.close();
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
  }
}

// Start the server
const server = new ObservabilityServer();
server.start();
