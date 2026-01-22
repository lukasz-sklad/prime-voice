chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'speak_piper') {
        console.log('[Offscreen] Otrzymano tekst do syntezy:', msg.text);
        // Tu później wejdzie logika Piper WASM
        // Na razie symulujemy pracę
        sendResponse({status: 'queued'});
    }
});

console.log("[Offscreen] Silnik audio gotowy.");
