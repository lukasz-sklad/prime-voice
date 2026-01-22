document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const toggleBtn = document.getElementById('toggleBtn');
    const statusLog = document.getElementById('statusLog');
    const voiceSelect = document.getElementById('voiceSelect');
    
    // Tabs
    const tabs = document.querySelectorAll('.tab');
    const panels = {
        localPanel: document.getElementById('localPanel'),
        remotePanel: document.getElementById('remotePanel')
    };

    // Remote UI
    const connectRemoteBtn = document.getElementById('connectRemoteBtn');
    const remoteSection = document.getElementById('remoteSection');
    const qrContainer = document.getElementById('qrCode');
    const directLink = document.getElementById('directLink');

    let isRunning = false;
    let currentMode = 'local'; // 'local' | 'remote'
    let sessionId = null;

    // --- TAB SWITCHING ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            Object.values(panels).forEach(p => p && p.classList.add('hidden'));
            
            const targetId = tab.getAttribute('data-target');
            const targetPanel = panels[targetId];
            if (targetPanel) {
                targetPanel.classList.remove('hidden');
                currentMode = targetId === 'localPanel' ? 'local' : 'remote';
            }
        });
    });

    // --- VOICE LOADING (HYBRID: TTS + SYNTHESIS) ---
    function loadVoices() {
        // Zbieramy unikalne głosy z obu źródeł
        const allVoices = new Map();

        // 1. Chrome TTS (Dodatki)
        chrome.tts.getVoices((ttsVoices) => {
            if (ttsVoices) {
                ttsVoices.forEach(v => {
                    allVoices.set(v.voiceName, { 
                        name: v.voiceName, 
                        lang: v.lang || '?', 
                        source: 'Ext' 
                    });
                });
            }

            // 2. SpeechSynthesis (Systemowe)
            const synthVoices = speechSynthesis.getVoices();
            synthVoices.forEach(v => {
                // Jeśli głos o tej nazwie już jest (np. z extension), to go nie nadpisujmy, 
                // chyba że chcemy dać priorytet. Zostawmy Ext jako ważniejszy.
                if (!allVoices.has(v.name)) {
                    allVoices.set(v.name, { 
                        name: v.name, 
                        lang: v.lang, 
                        source: 'Sys' 
                    });
                }
            });

            renderVoiceList(Array.from(allVoices.values()));
        });
    }

    function renderVoiceList(voices) {
        voiceSelect.innerHTML = '';
        
        if (voices.length === 0) {
            const opt = document.createElement('option');
            opt.text = "Brak głosów (zainstaluj Piper!)";
            voiceSelect.appendChild(opt);
            return;
        }

        // Sortowanie
        voices.sort((a, b) => {
            const langA = (a.lang || '').toLowerCase();
            const langB = (b.lang || '').toLowerCase();
            // Najpierw PL
            const isPlA = langA.includes('pl');
            const isPlB = langB.includes('pl');
            
            if (isPlA && !isPlB) return -1;
            if (!isPlA && isPlB) return 1;
            
            // Potem Piper
            const isPiperA = a.name.toLowerCase().includes('piper');
            const isPiperB = b.name.toLowerCase().includes('piper');
            if (isPiperA && !isPiperB) return -1;
            if (!isPiperA && isPiperB) return 1;
            
            return a.name.localeCompare(b.name);
        });

        voices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.name;
            opt.text = `${v.name} (${v.source})`;
            
            // Auto-select
            if (!voiceSelect.value) opt.selected = true;
            
            voiceSelect.appendChild(opt);
        });
    }

    // Init Voices
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    // Extra check po chwili
    setTimeout(loadVoices, 500);

    // --- START / STOP ---
    toggleBtn.addEventListener('click', () => {
        isRunning = !isRunning;
        
        if (isRunning) {
            toggleBtn.textContent = "ZATRZYMAJ";
            toggleBtn.classList.add('running');
            statusLog.innerHTML = "AKTYWNY (" + currentMode.toUpperCase() + ")";
            statusLog.classList.add('active');
        } else {
            toggleBtn.textContent = "URUCHOM LEKTORA";
            toggleBtn.classList.remove('running');
            statusLog.innerHTML = "Gotowy";
            statusLog.classList.remove('active');
        }

        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (!tabs[0]) return;
            
            if (isRunning) {
                if (currentMode === 'remote') {
                    // Jeśli sessionId puste, wygeneruj
                    if (!sessionId) {
                        connectRemoteBtn.click(); // Symulacja kliknięcia żeby wygenerować ID
                    }
                    // Wyślij start z małym opóźnieniem żeby ID zdążyło się ustawić
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: "init_remote",
                            sessionId: sessionId
                        });
                    }, 100);
                } else {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "start",
                        voiceName: voiceSelect.value
                    });
                }
            } else {
                chrome.tabs.sendMessage(tabs[0].id, { action: "stop" });
            }
        });
    });

    // --- REMOTE QR ---
    connectRemoteBtn.addEventListener('click', () => {
        sessionId = Math.random().toString(36).substring(2, 8);
        const url = `https://lukasz-sklad.github.io/prime-voice/mobile.html?session=${sessionId}`;
        
        remoteSection.classList.remove('hidden');
        qrContainer.innerHTML = '';
        
        // Sprawdź czy QRCode library jest załadowana
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrContainer, { text: url, width: 128, height: 128 });
        } else {
            qrContainer.textContent = "Błąd: Biblioteka QR niezaładowana.";
        }
        
        directLink.innerHTML = `<a href="${url}" target="_blank">Link: ${sessionId}</a>`;
        
        // Powiadom background o nowej sesji
        chrome.runtime.sendMessage({ action: "init_remote", sessionId: sessionId });
    });
});
