importScripts('libs/mqtt.min.js');

let mqttClient = null;
let currentSessionId = null;

// Broker publiczny
const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request.action === "init_remote") {
        currentSessionId = request.sessionId;
        connectToMqtt(currentSessionId);
        sendResponse({status: "connecting"});
        return true;
    }

    if (request.action === "speak_remote") {
        const text = request.text;
        if (!text || !currentSessionId) return;

        publishText(text);
        sendResponse({status: "sent"});
    }

    if (request.action === "stop_remote") {
        if (mqttClient) {
            mqttClient.end();
            mqttClient = null;
        }
        currentSessionId = null;
    }
});

function connectToMqtt(sessionId) {
    if (mqttClient && mqttClient.connected) {
        // Już połączony, ewentualnie sprawdź czy sessionID się zgadza
        console.log("MQTT already connected");
        return;
    }

    const clientId = 'prime_host_' + Math.random().toString(16).substr(2, 8);
    
    console.log(`Connecting to MQTT broker: ${BROKER_URL} as ${clientId}`);
    
    // Globalne mqtt z importScripts
    mqttClient = mqtt.connect(BROKER_URL, {
        clientId: clientId,
        clean: true,
        keepalive: 60
    });

    mqttClient.on('connect', () => {
        console.log('MQTT Connected!');
        // Wysyłamy wiadomość powitalną
        mqttClient.publish(`primevoice/${sessionId}`, JSON.stringify({
            type: 'status',
            msg: 'CONNECTED_HOST'
        }));
    });

    mqttClient.on('error', (err) => {
        console.error('MQTT Error:', err);
    });
    
    mqttClient.on('offline', () => {
        console.log('MQTT Offline');
    });
}

function publishText(text) {
    if (!mqttClient || !mqttClient.connected) {
        console.warn("MQTT not connected, trying to reconnect...");
        if (currentSessionId) connectToMqtt(currentSessionId);
        return;
    }

    const topic = `primevoice/${currentSessionId}`;
    const payload = JSON.stringify({
        type: 'speak',
        text: text,
        lang: 'pl-PL' // Domyślnie PL, można to sparametryzować
    });

    mqttClient.publish(topic, payload);
    console.log(`Published to ${topic}: ${text}`);
}
