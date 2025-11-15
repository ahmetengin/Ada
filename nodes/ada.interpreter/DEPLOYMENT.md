# Ada.Interpreter - Deployment Guide

Complete guide for deploying Ada.Interpreter in production environments.

---

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Configuration](#configuration)
6. [API Integration](#api-integration)
7. [Performance Tuning](#performance-tuning)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

---

## 🖥️ System Requirements

### Minimum Requirements

- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **Network**: 100 Mbps
- **OS**: Ubuntu 22.04 LTS or higher

### Recommended Production Requirements

- **CPU**: 16 cores (for 100+ concurrent streams)
- **RAM**: 32 GB
- **Storage**: 500 GB NVMe SSD
- **Network**: 1 Gbps
- **OS**: Ubuntu 22.04 LTS
- **GPU**: Optional (for faster STT processing)

---

## 🌍 Environment Setup

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install build essentials
sudo apt install -y build-essential git
```

### 2. Create Application User

```bash
sudo useradd -m -s /bin/bash ada-interpreter
sudo usermod -aG sudo ada-interpreter
```

### 3. Clone Repository

```bash
cd /opt
sudo git clone https://github.com/ahmetengin/Ada.git
sudo chown -R ada-interpreter:ada-interpreter Ada
cd Ada
```

### 4. Install Application Dependencies

```bash
npm install
npm run build
```

### 5. Configure Environment Variables

```bash
# Create .env file
cat > /opt/Ada/.env << EOF
# API Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PASSKIT_API_KEY=your_passkit_api_key_here

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ada_interpreter
DB_USER=ada_interpreter
DB_PASSWORD=your_secure_password_here

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Application
NODE_ENV=production
PORT=8080
METRICS_PORT=9090

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/ada-interpreter/app.log

# Security
SSL_CERT_PATH=/etc/ssl/certs/ada-interpreter.crt
SSL_KEY_PATH=/etc/ssl/private/ada-interpreter.key
EOF

# Set permissions
chmod 600 /opt/Ada/.env
```

### 6. Setup Database

```bash
# Create database user
sudo -u postgres psql << EOF
CREATE USER ada_interpreter WITH PASSWORD 'your_secure_password_here';
CREATE DATABASE ada_interpreter OWNER ada_interpreter;
GRANT ALL PRIVILEGES ON DATABASE ada_interpreter TO ada_interpreter;
EOF

# Run migrations (if available)
npm run migrate
```

---

## 🐳 Docker Deployment

### Dockerfile

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ffmpeg

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S ada && \
    adduser -S ada -u 1001

# Change ownership
RUN chown -R ada:ada /app

# Switch to non-root user
USER ada

# Expose ports
EXPOSE 8080 9090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["node", "dist/nodes/ada.interpreter/index.js"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  interpreter:
    build: .
    container_name: ada-interpreter
    restart: unless-stopped
    ports:
      - "8080:8080"
      - "9090:9090"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    volumes:
      - ./config:/app/config:ro
      - ./logs:/app/logs
    networks:
      - ada-network
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          cpus: '2'
          memory: 4G

  postgres:
    image: postgres:14-alpine
    container_name: ada-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=ada_interpreter
      - POSTGRES_USER=ada_interpreter
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - ada-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ada_interpreter"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ada-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - ada-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  prometheus:
    image: prom/prometheus:latest
    container_name: ada-prometheus
    restart: unless-stopped
    ports:
      - "9091:9090"
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - ada-network

  grafana:
    image: grafana/grafana:latest
    container_name: ada-grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
      - ./config/grafana:/etc/grafana/provisioning
    depends_on:
      - prometheus
    networks:
      - ada-network

networks:
  ada-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  prometheus-data:
  grafana-data:
```

### Deploy with Docker

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f interpreter

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## ☸️ Kubernetes Deployment

### Deployment YAML

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ada-interpreter
  namespace: ada
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ada-interpreter
  template:
    metadata:
      labels:
        app: ada-interpreter
    spec:
      containers:
      - name: interpreter
        image: ada/interpreter:latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: ada-config
              key: db_host
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: ada-secrets
              key: openai_api_key
        resources:
          requests:
            memory: "4Gi"
            cpu: "2000m"
          limits:
            memory: "8Gi"
            cpu: "4000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ada-interpreter
  namespace: ada
spec:
  selector:
    app: ada-interpreter
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: metrics
    port: 9090
    targetPort: 9090
  type: LoadBalancer
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace ada

# Apply deployment
kubectl apply -f k8s/deployment.yaml

# Check status
kubectl get pods -n ada
kubectl get services -n ada

# View logs
kubectl logs -f deployment/ada-interpreter -n ada

# Scale deployment
kubectl scale deployment ada-interpreter --replicas=5 -n ada
```

---

## ⚙️ Configuration

### Load Configuration

```typescript
import fs from 'fs';
import path from 'path';

const env = process.env.NODE_ENV || 'development';
const configPath = path.join(__dirname, 'config', `${env}.json`);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Merge with environment variables
config.whisper.apiKey = process.env.OPENAI_API_KEY;
config.claude.apiKey = process.env.ANTHROPIC_API_KEY;
config.passkit.apiKey = process.env.PASSKIT_API_KEY;
```

---

## 🔌 API Integration

### Whisper Integration

```bash
# Test Whisper API
curl https://api.openai.com/v1/audio/transcriptions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F file="@/path/to/audio.mp3" \
  -F model="whisper-1"
```

### Claude Integration

```bash
# Test Claude API
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## 🚀 Performance Tuning

### 1. Optimize Latency

- Use `qualityMode: 'speed'` for ultra-low latency
- Enable Redis caching for translations
- Use connection pooling for database

### 2. Scale Horizontally

- Deploy multiple instances behind load balancer
- Use Redis for session sharing
- Implement sticky sessions for WebSocket connections

### 3. Monitor Performance

- Track processing time per segment
- Monitor API response times
- Set up alerts for latency spikes

---

## 📊 Monitoring

### Prometheus Metrics

Available at `http://localhost:9090/metrics`

### Key Metrics

- `ada_interpreter_segments_total` - Total segments processed
- `ada_interpreter_processing_time` - Processing time histogram
- `ada_interpreter_api_calls_total` - API calls to Whisper/Claude
- `ada_interpreter_errors_total` - Total errors

### Grafana Dashboard

Import dashboard from `config/grafana/dashboard.json`

---

## 🔧 Troubleshooting

### Common Issues

**Issue**: High latency

**Solution**:
- Check API response times
- Increase instance count
- Enable caching

**Issue**: WebSocket disconnections

**Solution**:
- Increase heartbeat interval
- Check network stability
- Review connection limits

**Issue**: Out of memory

**Solution**:
- Reduce max concurrent segments
- Implement proper cleanup
- Increase memory allocation

---

## 📞 Support

For deployment issues:
- GitHub Issues: https://github.com/ahmetengin/Ada/issues
- Documentation: https://docs.ada-interpreter.com

---

**Ada.Interpreter** — Enterprise-grade conference interpretation, ready for production.
