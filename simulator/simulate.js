const mqtt = require('mqtt');
require('dotenv').config();

const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';
const client = mqtt.connect(MQTT_URL);

console.log(`Connecting to ${MQTT_URL}...`);

const ZONES = [
    'Oori Hostel', 'Sannasi Hostel', 'Academic Block',
    'Food Court', 'Library', 'Sports Complex'
];

let mode = process.argv[2] || 'normal'; // normal, leak, high_demand

console.log(`Simulator Mode: ${mode.toUpperCase()}`);

// Initial state
const zoneState = {};
ZONES.forEach(zone => {
    zoneState[zone] = {
        flow: 100 + Math.random() * 20,
        pressure: 30 + Math.random() * 5,
        level: 70 + Math.random() * 10
    };
});

client.on('connect', () => {
    console.log('Simulator connected!');

    setInterval(() => {
        ZONES.forEach(zone => {
            const s = zoneState[zone];

            // Base random walk
            s.flow += (Math.random() - 0.5) * 5;
            s.pressure += (Math.random() - 0.5) * 2;
            s.level += (Math.random() - 0.5) * 1;

            // Custom Logic: Only Food Court is Critical, others Normal
            if (zone === "Food Court") {
                // Force Critical State
                s.pressure = 10 + (Math.random() * 4); // Low pressure (< 15 is critical)
                s.flow = 200 + (Math.random() * 20); // High flow
            } else {
                // Force Normal State
                s.pressure = 30 + (Math.random() * 5); // Healthy pressure (> 25)
                s.flow = 80 + (Math.random() * 10); // Normal flow
                s.level = 70 + (Math.random() * 5);
            }

            // Constraints
            s.flow = Math.max(0, s.flow);
            s.pressure = Math.max(0, s.pressure);
            s.level = Math.max(0, Math.min(100, s.level));

            // Determine Health
            let health = 'ok';
            if (s.pressure < 15) health = 'critical';
            else if (s.pressure < 25) health = 'warning';

            const payload = {
                zone,
                flow: parseFloat(s.flow.toFixed(2)),
                pressure: parseFloat(s.pressure.toFixed(2)),
                level: parseFloat(s.level.toFixed(2)),
                health,
                timestamp: Date.now()
            };

            client.publish(`water/zones/${zone}/sensors`, JSON.stringify(payload));
        });
        // console.log('.');
    }, 2000);
});

client.on('error', (err) => {
    // console.error('Simulator connection error:', err.message);
    // process.exit(1); // Do not exit, keep retry logic alive
});
