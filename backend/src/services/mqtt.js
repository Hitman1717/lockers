import mqtt from 'mqtt';
import dataStore from './store.js';

class MqttService {
  constructor() {
    this.client = null;
    this.io = null;
    this.isConnected = false;
  }

  init(ioInstance, brokerUrl = process.env.MQTT_URL || 'mqtt://127.0.0.1:1883') {
    this.io = ioInstance;

    console.log(`[MQTT Service] Connecting to broker at ${brokerUrl}...`);
    this.client = mqtt.connect(brokerUrl, {
      clientId: `backend-service-${Math.random().toString(16).substring(2, 8)}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 3000
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('[MQTT Service] Connected successfully to MQTT Broker');

      // Subscribe to device feedback topics
      this.client.subscribe('lockers/+/status', (err) => {
        if (!err) console.log('[MQTT Service] Subscribed to lockers/+/status');
      });
      this.client.subscribe('lockers/+/heartbeat', (err) => {
        if (!err) console.log('[MQTT Service] Subscribed to lockers/+/heartbeat');
      });
    });

    this.client.on('message', (topic, payload) => {
      try {
        const message = JSON.parse(payload.toString());
        this.handleMessage(topic, message);
      } catch (err) {
        console.warn(`[MQTT Service] Failed to parse message on ${topic}:`, err.message);
      }
    });

    this.client.on('error', (err) => {
      console.error('[MQTT Service] Client error:', err.message);
    });

    this.client.on('offline', () => {
      this.isConnected = false;
      console.log('[MQTT Service] Client is offline');
    });
  }

  handleMessage(topic, message) {
    const parts = topic.split('/');
    // e.g. lockers/101/status or lockers/101/heartbeat
    const lockerId = parts[1];
    const subTopic = parts[2];

    if (subTopic === 'status') {
      console.log(`[MQTT Service] Status update for Locker ${lockerId}:`, message);
      const updates = {};
      if (message.status) updates.status = message.status;
      if (message.batteryLevel !== undefined) updates.batteryLevel = message.batteryLevel;
      updates.lastHeartbeat = new Date().toISOString();

      const updated = dataStore.updateLocker(lockerId, updates);
      dataStore.logEvent(lockerId, message.event || 'DEVICE_ACK', message);

      if (this.io && updated) {
        this.io.emit('locker:update', updated);
        this.io.emit('locker:event', {
          lockerId,
          event: message.event || 'DEVICE_ACK',
          details: message,
          timestamp: new Date().toISOString()
        });
      }
    } else if (subTopic === 'heartbeat') {
      const updates = {
        lastHeartbeat: new Date().toISOString()
      };
      if (message.batteryLevel !== undefined) updates.batteryLevel = message.batteryLevel;
      const updated = dataStore.updateLocker(lockerId, updates);

      if (this.io && updated) {
        this.io.emit('locker:heartbeat', {
          lockerId,
          lastHeartbeat: updates.lastHeartbeat,
          batteryLevel: updates.batteryLevel
        });
      }
    }
  }

  sendUnlockCommand(lockerId, meta = {}) {
    if (!this.client || !this.isConnected) {
      console.warn(`[MQTT Service] Warning: broker not connected. Simulating local unlock for locker ${lockerId}`);
      // Simulate state update immediately if broker is offline
      const updated = dataStore.updateLocker(lockerId, { status: 'unlocked' });
      dataStore.logEvent(lockerId, 'LOCAL_SIMULATED_UNLOCK', meta);
      if (this.io && updated) {
        this.io.emit('locker:update', updated);
      }
      return Promise.resolve({ success: true, simulated: true });
    }

    return new Promise((resolve, reject) => {
      const topic = `lockers/${lockerId}/command`;
      const payload = JSON.stringify({
        action: 'unlock',
        lockerId: String(lockerId),
        timestamp: new Date().toISOString(),
        ...meta
      });

      this.client.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) {
          console.error(`[MQTT Service] Failed to publish unlock to ${topic}:`, err);
          return reject(err);
        }
        console.log(`[MQTT Service] Published unlock command to ${topic}`);
        dataStore.logEvent(lockerId, 'UNLOCK_COMMAND', meta);

        // Optimistically update status to 'unlocked'
        const updated = dataStore.updateLocker(lockerId, { status: 'unlocked' });
        if (this.io && updated) {
          this.io.emit('locker:update', updated);
        }

        resolve({ success: true, topic });
      });
    });
  }
}

export const mqttService = new MqttService();
export default mqttService;
