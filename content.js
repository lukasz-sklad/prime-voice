let observer = null;
let lastText = "";
let synthesis = window.speechSynthesis;
let selectedVoice = null;
let isEnabled = false;
let debounceTimer = null;
let isBlockedTemporarily = false; // Nowa zmienna dla cooldownu

console.log("%c > PRIME VOICE HACK v6.0 (ANTI-LIST) INJECTED < ", "background: #000; color: #0f0; font-size: 20px; border: 1px solid #0f0;");

const SUBTITLE_SELECTORS = [
    '.atvwebplayersdk-captions-text',
    'div[data-testid="caption-text-container"]'
];

// Lista słów, które zdradzają, że to menu
const FORBIDDEN_WORDS = [
    "Polski", "English", "Deutsch", "Français", "Italiano", "Español", "Português", 
    "Nederlands", "Norsk", "Dansk", "Svenska", "Suomi", "Türkçe", "Русский", 
    "Latinoamérica", "Audio", "Subtitles", "Off", "Wł.", "Wył.", "Bokmål", "Magyar", "Čeština",
    "Języki", "Napisy", "Dźwięk", "Galego", "Català", "Euskara", "Română",
    "Filipino", "Indonesia", "العربية", "ไทย"
];

// Regex budowany raz dla wydajności
const FORBIDDEN_REGEX = new RegExp(FORBIDDEN_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');

function setVoice(voiceName) {
    const voices = synthesis.getVoices();
    selectedVoice = voices.find(v => v.name === voiceName);
}

function cleanUpText(text) {
    if (!text) return "";
    
    const matches = [...text.matchAll(FORBIDDEN_REGEX)];
    
    // Jeśli w tekście są 2 lub więcej nazwy języków, to na 100% jest to doklejona lista.
    // Ucinamy tekst PRZED pierwszą znalezioną nazwą języka.
    if (matches.length >= 2) {
        const firstMatchIndex = matches[0].index;
        console.log(`> AGGRESSIVE CLEANUP: Cut at index ${firstMatchIndex} ("${matches[0][0]}")`);
        activateTemporaryBlock();
        return text.substring(0, firstMatchIndex).trim();
    }
    
    // Specyficzny przypadek Prime Video: długi tekst zawierający "Polski" 
    // (napisy rzadko mają > 100 znaków i słowo "Polski" jednocześnie)
    if (text.includes("Polski") && text.length > 100) {
        const polskiIndex = text.indexOf("Polski");
        console.log(`> PRIME SPECIFIC CLEANUP: Cut at "Polski"`);
        activateTemporaryBlock();
        return text.substring(0, polskiIndex).trim();
    }

    return text;
}

function activateTemporaryBlock() {
    if (isBlockedTemporarily) return;
    isBlockedTemporarily = true;
    console.log("> TEMP BLOCK ACTIVATED (1s)");
    setTimeout(() => {
        isBlockedTemporarily = false;
    }, 1000);
}

function isSafeToRead(text) {
    if (!text) return false;
    const cleanText = text.trim();
    if (cleanText.length < 2) return false;

    // Policz wystąpienia regexem
    const matches = cleanText.match(FORBIDDEN_REGEX) || [];
    const forbiddenCount = matches.length;

    // ZASADA 1: BEZWZGLĘDNA BLOKADA LISTY (3 lub więcej języków)
    if (forbiddenCount >= 3) {
        console.log(`> BLOCKED (HEAVY LIST DETECTED): ${cleanText.substring(0, 50)}...`);
        return false;
    }

    // ZASADA 2: Jeśli znaleziono jakiekolwiek zakazane słowo i tekst jest krótki -> BLOKUJ
    if (forbiddenCount >= 1 && cleanText.length < 100) {
        console.log(`> BLOCKED (LANGUAGE/MENU DETECTED): ${cleanText}`);
        return false;
    }

    // ZASADA 3: Sprawdź czy tekst ma dużo nowych linii lub przecinków (lista)
    const newLines = (cleanText.match(/\n/g) || []).length;
    const commas = (cleanText.match(/,/g) || []).length;
    if (newLines > 2 || commas > 3) return false;

    return true;
}

function speak(text) {
    if (!isEnabled) return;
    if (isBlockedTemporarily) return; // Respektuj blokadę
    
    // --- BRUTAL BAN v2 (LOOP CHECK) ---
    const lowerText = text.toLowerCase();
    let detectedForbidden = 0;
    
    for (const word of FORBIDDEN_WORDS) {
        if (lowerText.includes(word.toLowerCase())) {
            detectedForbidden++;
        }
    }

    // Jeśli znaleziono 2 lub więcej słowa z listy (np. Polski + English), to NA PEWNO jest menu.
    // Ignorujemy bezwzględnie.
    if (detectedForbidden >= 2) {
        console.log(`> BRUTAL BAN v2: Blocked menu list (Count: ${detectedForbidden}, Len: ${text.length}). Text: "${text.substring(0, 30)}..."`);
        activateTemporaryBlock();
        return;
    }
    // ----------------------------------

    // Najpierw czyścimy tekst z doklejonych list
    const cleanedText = cleanUpText(text);
    
    if (cleanedText === lastText) return;
    
    // Sprawdzenie bezpieczeństwa na wyczyszczonym tekście
    if (!isSafeToRead(cleanedText)) return;
    
    lastText = cleanedText;
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = 1.2; 
    
    synthesis.speak(utterance);
    console.log(`> READ: ${cleanedText}`);
}

function startObserving() {
    if (observer) return;
    const targetNode = document.body;
    
    observer = new MutationObserver((mutations) => {
        handleMutations();
    });

    observer.observe(targetNode, { childList: true, subtree: true, characterData: true });
    console.log("> OBSERVER STARTED");
}

function handleMutations() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    // Czas reakcji 200ms
    debounceTimer = setTimeout(() => {
        checkForSubtitles();
    }, 200);
}

function checkForSubtitles() {
    let bestCandidate = "";
    let maxLength = 0;

    for (const selector of SUBTITLE_SELECTORS) {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(el => {
            if (el.offsetParent === null) return;
            
            // Dodatkowe sprawdzenie widoczności (opacity, visibility, color, size)
            const style = window.getComputedStyle(el);
            if (style.visibility === 'hidden' || style.opacity === '0' || style.fontSize === '0px' || style.color === 'transparent' || style.display === 'none') return;

            // Sprawdzenie geometrii - ignoruj elementy 1x1px lub poza ekranem
            const rect = el.getBoundingClientRect();
            if (rect.width < 5 || rect.height < 5) return;
            
            const text = el.innerText;

            // --- DIAGNOSTYKA START ---
            // Jeśli tekst zawiera "Polski" i jest podejrzanie długi, zrzuć strukturę HTML do konsoli
            if (text.includes("Polski") && text.length > 50) {
                console.log("%c !!! DIAGNOSTIC DUMP !!! ", "background: red; color: white; font-size: 20px;");
                console.log("DETECTED TEXT:", text);
                console.log("ELEMENT HTML:", el.outerHTML);
                console.log("CLASSES:", el.className);
                // Nie blokujemy tutaj, żeby zobaczyć co się dzieje, filtrowanie pójdzie dalej w isSafeToRead
            }
            // --- DIAGNOSTYKA END ---
            
            // Tutaj filtrujemy
            if (isSafeToRead(text)) {
                if (text.length > maxLength) {
                    maxLength = text.length;
                    bestCandidate = text;
                }
            }
        });
    }

    if (bestCandidate) {
        speak(bestCandidate);
    }
}

function stopObserving() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
    if (debounceTimer) clearTimeout(debounceTimer);
    synthesis.cancel();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start") {
        isEnabled = true;
        if (request.voiceName) setVoice(request.voiceName);
        startObserving();
    } else if (request.action === "stop") {
        isEnabled = false;
        stopObserving();
    }
});
