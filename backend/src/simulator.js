import mqtt from 'mqtt';

const brokerUrl = process.env.MQTT_URL || 'mqtt://127.0.0.1:1883';
const simulatedLockers = ['101', '102', '103', '104', '105', '201', '202'];

console.log(`[IoT Simulator] Connecting to broker at ${brokerUrl}...`);
const client = mqtt.connect(brokerUrl, {
  clientId: `locker-hardware-simulator-${Math.random().toString(16).substring(2, 8)}`,
  reconnectPeriod: 3000
});

client.on('connect', () => {
  console.log('[IoT Simulator] Connected to MQTT broker!');
  console.log(`[IoT Simulator] Simulating ${simulatedLockers.length} hardware lockers:`, simulatedLockers.join(', '));

  // Subscribe to command topic for all simulated lockers
  client.subscribe('lockers/+/command', (err) => {
    if (!err) {
      console.log('[IoT Simulator] Subscribed to lockers/+/command');
    }
  });

  // Start sending periodic heartbeats
  startHeartbeats();
});

client.on('message', (topic, payload) => {
  try {
    const parts = topic.split('/');
    const lockerId = parts[1];
    const command = JSON.parse(payload.toString());

    console.log(`\n[IoT Simulator] Received command on [${topic}]:`, command);

    if (command.action === 'unlock') {
      console.log(`[IoT Simulator] ⚡ Hardware relay fired for Locker ${lockerId}! Latch popped open.`);

      // 1. Send immediate Device ACK
      setTimeout(() => {
        const ackPayload = {
          lockerId,
          status: 'unlocked',
          event: 'DEVICE_ACK',
          latchOpen: true,
          batteryLevel: Math.floor(85 + Math.random() * 15),
          timestamp: new Date().toISOString()
        };
        client.publish(`lockers/${lockerId}/status`, JSON.stringify(ackPayload), { qos: 1 });
        console.log(`[IoT Simulator] -> Published DEVICE_ACK to lockers/${lockerId}/status`);
      }, 400);

      // 2. Simulate door closing 4 seconds later
      setTimeout(() => {
        const nextStatus = command.isRelease ? 'available' : 'occupied';
        const doorClosedPayload = {
          lockerId,
          status: nextStatus,
          event: 'DOOR_CLOSED',
          latchOpen: false,
          batteryLevel: Math.floor(85 + Math.random() * 15),
          timestamp: new Date().toISOString()
        };
        client.publish(`lockers/${lockerId}/status`, JSON.stringify(doorClosedPayload), { qos: 1 });
        console.log(`[IoT Simulator] -> Door closed & latched. Published status '${nextStatus}' to lockers/${lockerId}/status`);
      }, 4500);
    }
  } catch (err) {
    console.error('[IoT Simulator] Error handling command:', err.message);
  }
});

function startHeartbeats() {
  setInterval(() => {
    if (!client.connected) return;
    simulatedLockers.forEach((lockerId) => {
      const heartbeatPayload = {
        lockerId,
        batteryLevel: Math.floor(88 + Math.random() * 12),
        firmwareVersion: '1.2.4',
        rssi: -58,
        timestamp: new Date().toISOString()
      };
      client.publish(`lockers/${lockerId}/heartbeat`, JSON.stringify(heartbeatPayload));
    });
  }, 15000);
}
