importScripts('libs/mqtt.min.js');

let mqttClient = null;

// Broker publiczny
const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';

// --- OFFSCREEN SETUP (PIPER WASM) ---
async function createOffscreen() {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Piper TTS synthesis'
    });
}
createOffscreen(); // Startujemy silnik od razu

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // --- PIPER LOCAL (WASM) ---
    if (request.action === "speak_piper") {
        createOffscreen().then(() => {
            chrome.runtime.sendMessage({
                type: 'speak_piper',
                text: request.text,
                voiceId: request.voiceId
            });
        });
        sendResponse({status: "processing_local"});
        return true;
    }

    // --- REMOTE ---
    if (request.action === "init_remote") {
        const sessionId = request.sessionId;
        chrome.storage.local.set({ sessionId: sessionId }, () => {
            console.log("Session saved:", sessionId);
            connectToMqtt(sessionId);
        });
        sendResponse({status: "connecting"});
        return true;
    }

    if (request.action === "speak_remote") {
        const text = request.text;
        if (!text) return;

        chrome.storage.local.get(['sessionId'], (res) => {
            if (res.sessionId) {
                publishText(text, res.sessionId);
            } else {
                console.error("No session ID found in storage!");
            }
        });
        sendResponse({status: "processing"});
    }

    if (request.action === "stop_remote") {
        if (mqttClient) {
            mqttClient.end();
            mqttClient = null;
        }
        chrome.storage.local.remove(['sessionId']);
    }
});

function connectToMqtt(sessionId) {
    if (mqttClient && mqttClient.connected) return;

    const clientId = 'prime_host_' + Math.random().toString(16).substr(2, 8);
    mqttClient = mqtt.connect(BROKER_URL, { clientId: clientId, clean: true, keepalive: 60 });

    mqttClient.on('connect', () => {
        console.log('MQTT Connected for session:', sessionId);
        mqttClient.publish(`primevoice/${sessionId}`, JSON.stringify({
            type: 'status',
            msg: 'CONNECTED_HOST'
        }));
    });
}

function publishText(text, sessionId) {
    if (!mqttClient || !mqttClient.connected) {
        connectToMqtt(sessionId);
        // Kolejkujemy wysyłkę po krótkiej chwili na połączenie
        setTimeout(() => publishText(text, sessionId), 500);
        return;
    }

    const topic = `primevoice/${sessionId}`;
    const payload = JSON.stringify({
        type: 'speak',
        text: text,
        lang: 'pl-PL'
    });

    mqttClient.publish(topic, payload);
    console.log(`[MQTT SEND] ${text}`);
}
