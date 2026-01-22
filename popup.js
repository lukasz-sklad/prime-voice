document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleBtn');
    const statusLog = document.getElementById('statusLog');
    const voiceSelect = document.getElementById('voiceSelect');
    let isRunning = false;
  
    // Ładowanie głosów
    function loadVoices() {
      const voices = speechSynthesis.getVoices();
      voiceSelect.innerHTML = '';
      
      // Jeśli nie ma głosów, spróbuj ponownie za chwilę (czasami lista ładuje się asynchronicznie)
      if (voices.length === 0) {
          setTimeout(loadVoices, 100);
          return;
      }

      voices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        const defaultLabel = voice.default ? ' (Domyślny)' : '';
        option.textContent = `${voice.name} (${voice.lang})${defaultLabel}`;
        
        // Preferuj polski
        if (voice.lang.includes('pl')) option.selected = true;
        voiceSelect.appendChild(option);
      });
    }
  
    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  
    // Obsługa przycisku
    toggleBtn.addEventListener('click', () => {
      isRunning = !isRunning;
      
      if (isRunning) {
        // Zmiana na stan aktywny
        toggleBtn.textContent = "Zatrzymaj lektora";
        toggleBtn.classList.add('running');
        
        statusLog.innerHTML = "System aktywny<br>Skanowanie napisów...";
        statusLog.classList.add('active');
        
        // Wyślij sygnał do content.js
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs.length === 0) return;
            
            const selectedVoiceIndex = voiceSelect.value;
            const voices = speechSynthesis.getVoices();
            const voiceName = voices[selectedVoiceIndex] ? voices[selectedVoiceIndex].name : null;

            chrome.tabs.sendMessage(tabs[0].id, {
                action: "start",
                voiceName: voiceName
            });
        });

      } else {
        // Zmiana na stan nieaktywny
        toggleBtn.textContent = "Uruchom lektora";
        toggleBtn.classList.remove('running');
        
        statusLog.innerHTML = "System zatrzymany";
        statusLog.classList.remove('active');
        
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs.length === 0) return;
            chrome.tabs.sendMessage(tabs[0].id, {action: "stop"});
        });
      }
    });
  });