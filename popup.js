document.addEventListener('DOMContentLoaded', () => {
    // Elementy UI
    const toggleBtn = document.getElementById('toggleBtn');
    const statusLog = document.getElementById('statusLog');
    const voiceSelect = document.getElementById('voiceSelect');
    const tabs = document.querySelectorAll('.tab');
    const panels = {
        localPanel: document.getElementById('localPanel'),
        remotePanel: document.getElementById('remotePanel'),
        piperPanel: document.getElementById('piperPanel')
    };
    
    // Elementy Remote
    const connectRemoteBtn = document.getElementById('connectRemoteBtn');
    const remoteSection = document.getElementById('remoteSection');
    const qrContainer = document.getElementById('qrCode');
    const directLink = document.getElementById('directLink');

    // Elementy Piper
    const downloadPiperBtn = document.getElementById('downloadPiperBtn');
    const activatePiperBtn = document.getElementById('activatePiperBtn');
    const piperStatus = document.getElementById('piperStatus');
    const piperControls = document.getElementById('piperControls');

    let isRunning = false;
    let currentMode = 'local'; // 'local' | 'remote' | 'piper'
    let sessionId = null;

    // --- OBSŁUGA ZAKŁADEK ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // UI Update
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            Object.values(panels).forEach(p => {
                if(p) p.classList.add('hidden');
            });
            
            const targetId = tab.getAttribute('data-target');
            if (panels[targetId]) {
                panels[targetId].classList.remove('hidden');
                
                // Logic Update
                if (targetId === 'localPanel') currentMode = 'local';
                else if (targetId === 'remotePanel') currentMode = 'remote';
                else if (targetId === 'piperPanel') currentMode = 'piper';
                
                console.log("Mode switched to:", currentMode);
            }
        });
    });

    const panels = {
        localPanel: document.getElementById('localPanel'),
        remotePanel: document.getElementById('remotePanel')
    };
    
    // Elementy Remote
    const connectRemoteBtn = document.getElementById('connectRemoteBtn');
    const remoteSection = document.getElementById('remoteSection');
    const qrContainer = document.getElementById('qrCode');
    const directLink = document.getElementById('directLink');

    let isRunning = false;
    let currentMode = 'local'; // 'local' | 'remote'
    let sessionId = null;

    // --- OBSŁUGA ZAKŁADEK ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // UI Update
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            Object.values(panels).forEach(p => {
                if(p) p.classList.add('hidden');
            });
            
            const targetId = tab.getAttribute('data-target');
            if (panels[targetId]) {
                panels[targetId].classList.remove('hidden');
                
                // Logic Update
                if (targetId === 'localPanel') currentMode = 'local';
                else if (targetId === 'remotePanel') currentMode = 'remote';
                
                console.log("Mode switched to:", currentMode);
            }
        });
    });

    // --- ŁADOWANIE GŁOSÓW (LOKALNE) ---
    let voiceLoadAttempts = 0;
    
    function loadVoices() {
        let voices = speechSynthesis.getVoices();
        voiceSelect.innerHTML = '';

        if (voices.length === 0) {
            voiceLoadAttempts++;
            if (voiceLoadAttempts < 10) {
                // Próbuj przez ok. 2 sekundy (10 * 200ms)
                setTimeout(loadVoices, 200);
            } else {
                // Poddajemy się - brak głosów systemowych
                const option = document.createElement('option');
                option.text = "⚠️ BRAK GŁOSÓW SYSTEMOWYCH";
                voiceSelect.appendChild(option);
                
                const option2 = document.createElement('option');
                option2.text = ">> Zainstaluj Piper TTS (link powyżej) >>";
                voiceSelect.appendChild(option2);
                
                statusLog.innerHTML = "Brak głosów TTS.<br>Zainstaluj dodatek Piper lub użyj telefonu.";
                statusLog.style.color = "orange";
            }
            return;
        }

        // Reset licznika jeśli się udało
        voiceLoadAttempts = 0;

        // Sortowanie: Najpierw PL, potem reszta. W ramach PL, preferuj Google/Microsoft/Piper
        voices.sort((a, b) => {
            const langA = a.lang.toLowerCase();
            const langB = b.lang.toLowerCase();
            const isPlA = langA.includes('pl');
            const isPlB = langB.includes('pl');

            if (isPlA && !isPlB) return -1;
            if (!isPlA && isPlB) return 1;
            
            // Promuj "dobre" głosy (w tym Piper!)
            const isPremiumA = a.name.includes('Piper') || a.name.includes('Google') || a.name.includes('Microsoft');
            const isPremiumB = b.name.includes('Piper') || b.name.includes('Google') || b.name.includes('Microsoft');
            
            if (isPremiumA && !isPremiumB) return -1;
            if (!isPremiumA && isPremiumB) return 1;

            return a.name.localeCompare(b.name);
        });

        voices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = voice.name; 
            
            let label = voice.name;
            if (voice.default) label += ' (Domyślny)';
            
            option.textContent = label;
            
            // Auto-select pierwszego polskiego
            if (voice.lang.includes('pl') && !voiceSelect.value) {
                option.selected = true;
            }
            voiceSelect.appendChild(option);
        });
        
        // Jeśli nic nie wybrano (brak PL), wybierz pierwszy dostępny
        if (!voiceSelect.value && voices.length > 0) {
            voiceSelect.selectedIndex = 0;
        }
    }

    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
    // Extra reload po 1s dla zewnętrznych extensions
    setTimeout(loadVoices, 1000);

    // --- LOGIKA START/STOP (LOKALNA) ---
    toggleBtn.addEventListener('click', () => {
        isRunning = !isRunning;
        updateUIState(isRunning);
        
        // Wyślij sygnał do content.js
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs.length === 0) return;
            
            if (isRunning) {
                const selectedVoiceName = voiceSelect.value;
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "start_local",
                    voiceName: selectedVoiceName
                });
            } else {
                chrome.tabs.sendMessage(tabs[0].id, {action: "stop"});
            }
        });
    });

    function updateUIState(running) {
        if (running) {
            toggleBtn.textContent = "ZATRZYMAJ LEKTORA";
            toggleBtn.classList.add('running');
            statusLog.innerHTML = "Lektor AKTYWNY<br>Szukam napisów...";
            statusLog.classList.add('active');
        } else {
            toggleBtn.textContent = "URUCHOM LEKTORA";
            toggleBtn.classList.remove('running');
            statusLog.innerHTML = "System gotowy";
            statusLog.classList.remove('active');
        }
    }

    // --- LOGIKA REMOTE (ZDALNA) ---
    connectRemoteBtn.addEventListener('click', () => {
        // 1. Generuj ID sesji
        sessionId = Math.random().toString(36).substring(2, 10);
        
        // 2. URL aplikacji klienckiej
        const clientUrl = `https://lukasz-sklad.github.io/prime-voice/mobile.html?session=${sessionId}`;
        
        // 3. Pokaż sekcję
        remoteSection.classList.remove('hidden');
        qrContainer.innerHTML = '';
        
        // 4. Generuj QR
        new QRCode(qrContainer, {
            text: clientUrl,
            width: 128,
            height: 128
        });
        
        directLink.innerHTML = `<a href="${clientUrl}" target="_blank">Link testowy (kliknij)</a>`;
        
        // 5. Powiadom content script o trybie remote (aby zaczął nadawać)
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs.length === 0) return;
            
            // Informujemy content script, że ma się połączyć z MQTT
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "init_remote",
                sessionId: sessionId
            });
        });
        
        connectRemoteBtn.textContent = `Sesja: ${sessionId} (Odśwież aby zmienić)`;
    });
});