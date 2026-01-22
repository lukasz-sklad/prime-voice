importScripts('libs/mqtt.min.js');

let mqttClient = null;
let currentVoiceName = null;

// Broker publiczny
const BROKER_URL = 'wss://test.mosquitto.org:8081';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // --- USTAWIENIE GŁOSU (LOKALNY) ---
    if (request.action === "set_voice") {
        currentVoiceName = request.voiceName;
        console.log("[Background] Voice set to:", currentVoiceName);
    }

    // --- ZDALNE MÓWIENIE (DEDYKOWANE) ---
    if (request.action === "speak_remote") {
        if (request.sessionId) {
            publishText(request.text, request.sessionId);
        } else {
            console.warn("[Background] Missing sessionId for speak_remote");
        }
    }

    // --- GŁÓWNA KOMENDA MÓWIENIA (LOKALNE) ---
    if (request.action === "speak") {
        const text = request.text;
        const mode = request.mode || 'local';
        
        if (mode === 'remote') {
            const sessionId = request.sessionId;
            // Pobieramy sesję z parametru lub storage w razie potrzeby
            if (sessionId) {
                publishText(text, sessionId);
            } else {
                console.warn("[Background] Missing sessionId for remote speak");
            }
        } else {
            // Lokalny TTS (obsługuje Piper Extension)
            speakLocal(text);
        }
    }

    // --- ZDALNE STEROWANIE ---
    if (request.action === "init_remote") {
        const sessionId = request.sessionId;
        console.log("[Background] Init Remote:", sessionId);
        connectToMqtt(sessionId);
        sendResponse({status: "connecting"});
        return true;
    }

    // --- ZATRZYMYWANIE ---
    if (request.action === "stop_all" || request.action === "stop_remote") {
        chrome.tts.stop();
        // MQTT nie rozłączamy, żeby było gotowe
    }
});

function speakLocal(text) {
    // chrome.tts.stop(); // Usunięte - przerywanie może psuć Pipera Extension
    
    const options = {
        rate: 1.2,
        enqueue: false // Przerywaj poprzednie
    };
    
    if (currentVoiceName) {
        options.voiceName = currentVoiceName;
    }
    
    console.log(`[TTS] Speaking: "${text}" (Voice: ${currentVoiceName || 'Default'})`);
    
    chrome.tts.speak(text, options, () => {
        if (chrome.runtime.lastError) {
            console.error("[TTS Error]:", chrome.runtime.lastError.message);
            // Częsty błąd: "Invalid voice". Może trzeba przekazać też lang?
        }
    });
}

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
    
    mqttClient.on('error', (err) => console.error("MQTT Error:", err));
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
