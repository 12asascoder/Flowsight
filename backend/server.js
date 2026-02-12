const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const mlService = require('./ml-service');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';

app.use(cors());
app.use(express.json());

// Initialize ML Service
mlService.initialize().catch(err => {
  console.error('Failed to initialize ML service:', err);
});

// API Endpoints
app.get('/', (req, res) => {
  res.send('Water Intelligence Backend Running with ML');
});

const ZONES = ['Oori Hostel', 'Sannasi Hostel', 'Academic Block', 'Food Court', 'Library', 'Sports Complex'];

// Generate Daily Pattern (Bell curves for Morning 7-9am and Evening 6-8pm)
function getBaseDemand(hour) {
  let flow = 50;
  // Morning Peak (Mean 8am)
  flow += 100 * Math.exp(-Math.pow(hour - 8, 2) / 2.25);
  // Evening Peak (Mean 19pm)
  flow += 80 * Math.exp(-Math.pow(hour - 19, 2) / 4);
  return flow + (Math.random() - 0.5) * 10;
}

// In-Memory Mock Data Store (Flooded on startup)
const MOCK_DB = {
  history: {},
  forecast: []
};

console.log('Flooding system with 30 days of historical data...');
const NOW = new Date();
ZONES.forEach(zone => {
  MOCK_DB.history[zone] = [];
  for (let d = 30; d >= 0; d--) {
    for (let h = 0; h < 24; h++) {
      const time = new Date(NOW);
      time.setDate(time.getDate() - d);
      time.setHours(h, 0, 0, 0);

      const flow = getBaseDemand(h);
      const pressure = Math.max(0, 40 - (flow / 10) + (Math.random() * 2));

      MOCK_DB.history[zone].push({
        timestamp: time.toISOString(),
        flow: parseFloat(flow.toFixed(2)),
        pressure: parseFloat(pressure.toFixed(2)),
        level: 80 - (Math.sin(h / 4) * 10) + (Math.random() * 2)
      });
    }
  }
});

// Generate Forecast
for (let h = 0; h < 24; h++) {
  const nextTime = new Date(NOW);
  nextTime.setHours(NOW.getHours() + h + 1, 0, 0, 0);
  const hour = nextTime.getHours();
  const predicted = getBaseDemand(hour);

  MOCK_DB.forecast.push({
    time: nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    predicted: parseFloat(predicted.toFixed(2)),
    upper: parseFloat((predicted * 1.2).toFixed(2)),
    lower: parseFloat((predicted * 0.8).toFixed(2)),
    actual: h < 2 ? parseFloat((predicted + (Math.random() * 5)).toFixed(2)) : null
  });
}
console.log('System flooded with insights.');

// Enhanced History API
app.get('/api/history/:zone', async (req, res) => {
  const { zone } = req.params;
  const history = MOCK_DB.history[zone];
  if (history) return res.json(history.slice(-48)); // Return last 48h
  res.json([]);
});

// Enhanced Forecast API
app.get('/api/forecast', (req, res) => {
  res.json(MOCK_DB.forecast);
});

// ============ ML API Endpoints ============

// ML Demand Forecasting for specific zone
app.get('/api/ml/forecast/:zone', async (req, res) => {
  try {
    const { zone } = req.params;
    const history = MOCK_DB.history[zone];

    if (!history) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    const prediction = await mlService.predictDemand(zone, history);
    res.json({
      zone,
      forecast: prediction,
      generatedAt: new Date().toISOString(),
      modelVersion: '1.0.0'
    });
  } catch (error) {
    console.error('ML Forecast error:', error);
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
});

// ML Leak Probability Detection (all zones)
app.get('/api/ml/leak-probability', async (req, res) => {
  try {
    const results = {};

    for (const zone of ZONES) {
      const history = MOCK_DB.history[zone];
      if (history && history.length >= 20) {
        const recentReadings = history.slice(-20);
        results[zone] = await mlService.detectLeak(recentReadings);
      } else {
        results[zone] = { probability: 0, classification: 'insufficient_data', confidence: 0 };
      }
    }

    res.json({
      zones: results,
      timestamp: new Date().toISOString(),
      alertCount: Object.values(results).filter(r => r.classification === 'leak').length
    });
  } catch (error) {
    console.error('Leak detection error:', error);
    res.status(500).json({ error: 'Detection failed', details: error.message });
  }
});

// ML Pump Schedule Optimization
app.get('/api/ml/pump-schedule', async (req, res) => {
  try {
    // Get average tank level across all zones
    const avgTankLevel = ZONES.reduce((sum, zone) => {
      const latest = MOCK_DB.history[zone]?.slice(-1)[0];
      return sum + (latest?.level || 80);
    }, 0) / ZONES.length;

    // Get demand forecast for optimization
    const demandForecast = MOCK_DB.forecast;

    const currentState = {
      tankLevel: avgTankLevel,
      timestamp: new Date()
    };

    const schedule = await mlService.optimizePumpSchedule(currentState, demandForecast);

    res.json({
      schedule,
      currentTankLevel: avgTankLevel,
      optimizationGoal: 'minimize_energy_cost',
      estimatedSavings: '₹450/day',
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pump optimization error:', error);
    res.status(500).json({ error: 'Optimization failed', details: error.message });
  }
});

// ML Tank Level Predictions
app.get('/api/ml/tank-predictions/:zone', async (req, res) => {
  try {
    const { zone } = req.params;
    const history = MOCK_DB.history[zone];

    if (!history) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    const recentData = history.slice(-12);
    const predictions = await mlService.predictTankLevels(zone, recentData);

    res.json({
      zone,
      predictions,
      alerts: predictions.filter(p => p.alert !== 'normal'),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Tank prediction error:', error);
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
});

// ML ROI Estimation
app.get('/api/ml/roi-estimate', async (req, res) => {
  try {
    // Calculate current vs optimized consumption
    const totalConsumption = ZONES.reduce((sum, zone) => {
      const latest = MOCK_DB.history[zone]?.slice(-24);
      const avgFlow = latest?.reduce((s, r) => s + r.flow, 0) / latest?.length || 0;
      return sum + avgFlow;
    }, 0);

    const optimizationData = {
      currentConsumption: totalConsumption * 24, // Daily
      optimizedConsumption: totalConsumption * 24 * 0.85, // 15% reduction
      leakReduction: 12, // %
      pumpEfficiency: 0.92,
      waterCostPerLiter: 0.02, // ₹
      electricityCostPerKwh: 6, // ₹
      maintenanceCost: 5000, // ₹/month
      implementationCost: 50000 // ₹
    };

    const roi = await mlService.estimateROI(optimizationData);

    res.json({
      roi,
      assumptions: {
        waterCostPerLiter: '₹0.02',
        electricityCostPerKwh: '₹6',
        expectedLeakReduction: '12%'
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('ROI estimation error:', error);
    res.status(500).json({ error: 'Estimation failed', details: error.message });
  }
});

// ML Sensor Health Check
app.get('/api/ml/sensor-health', async (req, res) => {
  try {
    const healthStatus = {};

    for (const zone of ZONES) {
      const history = MOCK_DB.history[zone];
      if (history && history.length >= 10) {
        const recentReadings = history.slice(-10);

        // Simple variance check for now
        const flowVariance = recentReadings.reduce((sum, r, i, arr) => {
          if (i === 0) return 0;
          return sum + Math.abs(r.flow - arr[i - 1].flow);
        }, 0) / recentReadings.length;

        healthStatus[zone] = {
          status: flowVariance > 50 ? 'noisy' : 'healthy',
          variance: flowVariance,
          confidence: 0.85
        };
      } else {
        healthStatus[zone] = { status: 'insufficient_data', variance: 0, confidence: 0 };
      }
    }

    res.json({
      sensors: healthStatus,
      faultySensors: Object.entries(healthStatus).filter(([_, v]) => v.status === 'noisy').map(([k]) => k),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sensor health check error:', error);
    res.status(500).json({ error: 'Health check failed', details: error.message });
  }
});

// ML Model Status
app.get('/api/ml/status', (req, res) => {
  res.json({
    initialized: mlService.isInitialized,
    models: Object.keys(mlService.models),
    modelCount: Object.keys(mlService.models).length,
    bufferSize: mlService.dataBuffer.sensorReadings.length,
    version: '1.0.0'
  });
});

// Device Simulation Loop
setInterval(() => {
  // Simulate New Device Connection
  if (Math.random() < 0.1) { // 10% chance every 5s
    const newDevice = `Sensor-${Math.floor(Math.random() * 9000) + 1000}`;
    const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
    io.emit('device-status', {
      message: `New IoT Device ${newDevice} connected in ${zone}`,
      type: 'connection',
      timestamp: new Date()
    });
  }
}, 5000);

// MQTT Setup
const client = mqtt.connect(MQTT_URL, {
  reconnectPeriod: 5000,
});

let isMqttConnected = false;

client.on('connect', () => {
  console.log('Connected to MQTT Broker');
  isMqttConnected = true;
  client.subscribe('water/zones/+/sensors');
});

client.on('error', (err) => {
  // Only log if we were previously connected, or haven't logged it yet
  if (isMqttConnected) {
    console.log('MQTT Error (Broker offline):', err.message);
    isMqttConnected = false;
  }
});

client.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const zoneName = topic.split('/')[2];

    // Validation
    if (!payload.timestamp) payload.timestamp = new Date();

    // Add to ML service buffer
    mlService.addSensorReading({ ...payload, zone: zoneName });

    // Leak Detection Logic (Rule-based + ML)
    let health = payload.health || 'ok';
    if (payload.pressure < 15 && payload.flow > 120) {
      health = 'critical';
      console.log(`[ALERT] Potential Leak in ${zoneName}`);
    }

    const enrichedData = { ...payload, zone: zoneName, health };

    // Broadcast
    io.emit('sensor-update', enrichedData);

    // Async Persistence
    try {
      // Upsert Zone
      const zone = await prisma.zone.upsert({
        where: { name: zoneName },
        update: {},
        create: { name: zoneName }
      });

      // Create Reading
      await prisma.sensorReading.create({
        data: {
          zoneId: zone.id,
          flow: parseFloat(payload.flow),
          pressure: parseFloat(payload.pressure),
          level: parseFloat(payload.level),
          health: health,
          timestamp: new Date(payload.timestamp)
        }
      });
    } catch (dbError) {
      // DB error ignored
    }

  } catch (e) {
    console.error('Error processing message:', e);
  }
});


// Fallback Simulation (Advanced)
const ZONE_STATE = {};
ZONES.forEach(z => {
  ZONE_STATE[z] = { flow: 100, pressure: 30, level: 80, mode: 'normal' };
});

setInterval(() => {
  if (isMqttConnected) return; // Only run fallback if MQTT down

  ZONES.forEach(zone => {
    const state = ZONE_STATE[zone];

    // Random walk
    state.flow += (Math.random() - 0.5) * 5;
    state.pressure += (Math.random() - 0.5) * 2;
    state.level += (Math.random() - 0.5) * 1;

    // Introduce rare events
    if (Math.random() < 0.005) state.mode = 'leak';
    if (state.mode === 'leak' && Math.random() < 0.05) state.mode = 'normal';

    if (state.mode === 'leak') {
      state.pressure = Math.max(5, state.pressure - 2);
      state.flow = Math.min(200, state.flow + 5);
    } else {
      // Return to normal
      if (state.pressure < 30) state.pressure += 1;
      if (state.flow > 100) state.flow -= 2;
    }

    // Custom Logic: Only Food Court is Critical, others Normal
    if (zone === "Food Court") {
      state.pressure = 10 + (Math.random() * 4); // Critical (<15)
      state.flow = 200 + (Math.random() * 20);
    } else {
      state.pressure = 30 + (Math.random() * 5); // Normal (>25)
      state.flow = 80 + (Math.random() * 10);
    }

    // Clamp
    state.pressure = Math.max(0, state.pressure);
    state.flow = Math.max(0, state.flow);

    const isCritical = zone === "Food Court" || state.pressure < 15;

    const data = {
      zone,
      flow: parseFloat(state.flow.toFixed(2)),
      pressure: parseFloat(state.pressure.toFixed(2)),
      level: parseFloat(state.level.toFixed(2)),
      health: isCritical ? 'critical' : 'ok',
      timestamp: Date.now()
    };

    io.emit('sensor-update', data);
  });

}, 2000);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

server.listen(PORT, () => {
  console.log(`Server reading on port ${PORT}`);
});
