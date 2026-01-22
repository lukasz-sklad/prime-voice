import { 
    PiperWebEngine, 
    PhonemizeWebRuntime, 
    OnnxWebRuntime,
    FetchProvider 
} from './libs/piper-tts-web.js';

let engine = null;
let activeSession = null;

// Niestandardowy Provider do plików lokalnych (jeśli biblioteka wspiera)
// Ale biblioteka używa FetchProvider.

async function getEngine() {
    if (engine) return engine;

    console.log("[Piper] Tworzenie silnika...");
    
    // Konfiguracja Phonemizer Runtime (wskazujemy folder libs/)
    const phonemizeRuntime = new PhonemizeWebRuntime({
        basePath: chrome.runtime.getURL('libs/') // Pełna ścieżka: chrome-extension://.../libs/
    });
    
    // Konfiguracja ONNX Runtime (wskazujemy workery w libs/worker/)
    // OnnxWebRuntime zazwyczaj nie potrzebuje ścieżki w konstruktorze, ale jego worker tak.
    // Biblioteka Poket-Jony może mieć hardcodowane ścieżki do workerów.
    // Zaryzykujmy domyślny, a jeśli błąd - będziemy patchować.
    
    engine = new PiperWebEngine({
        phonemizeRuntime: phonemizeRuntime
        // onnxRuntime: ... (zostawiamy domyślny)
    });
    
    return engine;
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playAudio(pcmData, sampleRate) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const buffer = audioCtx.createBuffer(1, pcmData.length, sampleRate);
    buffer.getChannelData(0).set(pcmData);
    
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'speak_piper') {
        const text = msg.text;
        const voiceId = msg.voiceId || 'pl_PL-gosia-medium';

        (async () => {
            try {
                const eng = await getEngine();
                
                console.log(`[Piper] Generowanie: "${text}" (${voiceId})`);
                
                // generate(text, voiceId, speakerId)
                // Biblioteka pobierze model ONNX automatycznie przez HuggingFaceProvider (domyślny)
                // Cache API w przeglądarce powinno to zapamiętać po pierwszym razie.
                
                const result = await eng.generate(text, voiceId);
                
                // result.audio to prawdopodobnie Float32Array (surowe PCM)
                // result.sampleRate
                
                if (result && result.audio) {
                     // Sprawdź format. Biblioteka zwraca obiekt { audio: Float32Array, sampleRate: number }?
                     // W kodzie źródłowym PiperWebEngine.js: return response;
                     // A OnnxRuntime.generate zwraca: { audio: Float32Array, sampleRate: ... }
                     // Zakładamy że tak jest.
                     
                     const sampleRate = result.sampleRate || 22050;
                     playAudio(result.audio, sampleRate);
                     console.log("[Piper] Odtwarzanie...");
                }

            } catch (err) {
                console.error("[Piper Error]", err);
            }
        })();
        
        sendResponse({status: "processing"});
    }
    return true; // Keep channel open
});

console.log("[Offscreen] Moduł załadowany.");