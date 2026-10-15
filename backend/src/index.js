import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { startMqttBroker } from './broker.js';
import mqttService from './services/mqtt.js';
import dataStore from './services/store.js';

import authRouter from './routes/auth.js';
import hierarchyRouter from './routes/hierarchy.js';
import employeesRouter from './routes/employees.js';
import kioskRouter from './routes/kiosk.js';
import reportsRouter from './routes/reports.js';
import { initSnapshotService, KIOSK_SNAPSHOTS_DIR, LOCKERS_INFO_DIR } from './services/snapshotService.js';

dotenv.config();

// Initialize snapshot storage and cleanup lifecycle
initSnapshotService();

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve local kiosk snapshot images and locker biometrics
app.use('/snapshots', express.static(KIOSK_SNAPSHOTS_DIR));
app.use('/lockersInfo', express.static(LOCKERS_INFO_DIR));

// Mount API Routes
app.use('/api/auth', authRouter);
app.use('/api', hierarchyRouter); // includes /api/hierarchy and /api/lockers
app.use('/api/employees', employeesRouter);
app.use('/api/kiosk', kioskRouter);
app.use('/api/reports', reportsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Smart Locker backend core is operational',
    timestamp: new Date().toISOString(),
    mqttConnected: mqttService.isConnected,
    totalLockers: dataStore.lockers.length
  });
});

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Send initial snapshot of lockers to newly connected client
  socket.emit('lockers:init', dataStore.getLockers());

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Start services
async function bootstrap() {
  try {
    // 1. Start embedded Aedes broker (or skip if Mosquitto is already running on 1883)
    await startMqttBroker();

    // 2. Initialize MQTT Coordinator Service
    mqttService.init(io);

    // 3. Start Express + Socket.IO Server
    server.listen(PORT, () => {
      console.log(`\n=================================================`);
      console.log(`🚀 Smart Locker Backend listening on port ${PORT}`);
      console.log(`📡 Socket.IO initialized for real-time events`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`=================================================\n`);
    });
  } catch (err) {
    console.error('Fatal bootstrap error:', err);
    process.exit(1);
  }
}

bootstrap();
