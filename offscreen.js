// offscreen.js - Pełny silnik Piper TTS (Lokalny WASM)

let session = null;
let currentVoiceId = null;
let phonemizerModule = null;

const FILES = {
    wasm: 'libs/piper_phonemize.wasm',
    js: 'libs/piper_phonemize.js',
    voices: {
        'pl_PL-gosia-medium': {
            onnx: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/pl/pl_PL/gosia/medium/pl_PL-gosia-medium.onnx',
            json: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/pl/pl_PL/gosia/medium/pl_PL-gosia-medium.onnx.json'
        },
        'pl_PL-mw-medium': {
            onnx: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/pl/pl_PL/mw/medium/pl_PL-mw-medium.onnx',
            json: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/pl/pl_PL/mw/medium/pl_PL-mw-medium.onnx.json'
        }
    }
};

async function loadPhonemizer() {
    if (phonemizerModule) return phonemizerModule;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = FILES.js;
        script.onload = async () => {
            try {
                const module = await createPiperPhonemize({
                    locateFile: (path) => path.endsWith('.wasm') ? FILES.wasm : path
                });
                phonemizerModule = module;
                resolve(module);
            } catch (e) { reject(e); }
        };
        script.onerror = () => reject("Brak pliku libs/piper_phonemize.js");
        document.head.appendChild(script);
    });
}

async function loadVoice(voiceId) {
    if (session && currentVoiceId === voiceId) return session;
    const config = FILES.voices[voiceId];
    session = await ort.InferenceSession.create(config.onnx, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
    });
    currentVoiceId = voiceId;
    return session;
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playAudio(pcmData, sampleRate) {
    const buffer = audioCtx.createBuffer(1, pcmData.length, sampleRate);
    buffer.getChannelData(0).set(pcmData);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'speak_piper') {
        (async () => {
            try {
                await loadPhonemizer();
                await loadVoice(msg.voiceId);
                
                // 1. Phonemize
                const phonemeIds = phonemizerModule.phonemize(msg.text, "pl-PL"); // To wymaga poprawnej integracji API
                
                // 2. Inference
                const input = new ort.Tensor('int64', BigInt64Array.from(phonemeIds.map(BigInt)), [1, phonemeIds.length]);
                const results = await session.run({
                    input: input,
                    input_lengths: new ort.Tensor('int64', [BigInt(phonemeIds.length)], [1]),
                    scales: new ort.Tensor('float32', [0.667, 1.0, 0.8], [3])
                });
                
                playAudio(results.output.data, 22050);
            } catch (e) { console.error(e); }
        })();
    }
    return true;
});
