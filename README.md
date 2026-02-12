# Smart Water Intelligence Dashboard (SRM Campus)

A real-time IoT monitoring system for campus water infrastructure.

## 🚀 Quick Start (Demo Mode)

Since Docker is likely not running, the system will use an **internal simulation mode** with local persistence.

1. **Start Backend**:
   ```bash
   cd backend
   node server.js
   ```
   *Runs on http://localhost:3001 - Includes API & WebSocket Server*

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   *Runs on http://localhost:3002 (or 3000)*

3. **View Dashboard**: Open your browser to the frontend URL.

## 🐳 Full Stack Mode (With Docker)

To enable the real MQTT broker and Database:

1. **Start Infrastructure**:
   ```bash
   docker-compose up -d
   ```
2. **Start Backend**:
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   node server.js
   ```
3. **Start Simulator** (Generates MQTT data):
   ```bash
   cd simulator
   npm start [normal|leak|high_demand]
   ```
   *Example: `npm start leak` to simulate a pipe burst.*

4. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

## Tech Stack
- **Frontend**: Next.js 14, TailwindCSS, Shadcn UI, Recharts, Leaflet
- **Backend**: Node.js, Express, Socket.io, Prisma (PostgreSQL)
- **Data**: MQTT (Mosquitto), PostgreSQL, Redis

## ✨ Key Features
- **Real-time Monitoring**: Sub-second updates via WebSockets for Flow, Pressure, and Level.
- **AI Analytics & Forecast**:
  - 24-hour demand prediction using LSTM models.
  - Anomaly detection (Leak probability).
  - ROI & Savings calculator based on optimization.
- **Interactive Geospatial Map**:
  - Live zone status with pulsing critical alerts.
  - Heatmap visualization of water demand.
  - "Google Earth" style fly-to navigation.
- **Smart Alerts & Dispatch**:
  - Instant critical alerts for low pressure/leaks.
  - Technician dispatch system with job assignment.
- **Reporting Module**:
  - CSV Export for daily logs.
  - Historical comparison (Today vs Yesterday).
- **System Health**:
  - Live sensor connectivity status.
  - Pump efficiency monitoring.
