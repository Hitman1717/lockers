import aedes from 'aedes';
import { createServer } from 'net';

const AedesBroker = aedes();
const port = parseInt(process.env.MQTT_PORT || '1883', 10);

export function startMqttBroker(customPort = port) {
  return new Promise((resolve, reject) => {
    const server = createServer(AedesBroker.handle);

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[MQTT Broker] Port ${customPort} already in use (external Mosquitto or broker is running).`);
        resolve({ server: null, alreadyRunning: true });
      } else {
        console.error('[MQTT Broker] Server error:', err);
        reject(err);
      }
    });

    server.listen(customPort, () => {
      console.log(`[MQTT Broker] Embedded Aedes MQTT broker running on port ${customPort}`);
      resolve({ server, alreadyRunning: false });
    });

    // Logging broker events
    AedesBroker.on('client', (client) => {
      console.log(`[MQTT Broker] Client connected: ${client ? client.id : 'unknown'}`);
    });

    AedesBroker.on('clientDisconnect', (client) => {
      console.log(`[MQTT Broker] Client disconnected: ${client ? client.id : 'unknown'}`);
    });

    AedesBroker.on('publish', (packet, client) => {
      if (client) {
        // Only log non-internal topics
        if (!packet.topic.startsWith('$SYS/')) {
          console.log(`[MQTT Broker] [${client.id}] -> [${packet.topic}]: ${packet.payload.toString()}`);
        }
      }
    });
  });
}

// Standalone execution check
const isDirectRun = process.argv[1] && process.argv[1].endsWith('broker.js');
if (isDirectRun) {
  startMqttBroker().catch((err) => {
    console.error('[MQTT Broker] Startup failed:', err);
    process.exit(1);
  });
}

export default AedesBroker;
