let observer = null;
let lastText = "";
let synthesis = window.speechSynthesis;
let selectedVoice = null;
let isEnabled = false;
let isRemote = false; // Tryb zdalny
let currentSessionId = null;

let debounceTimer = null;
let isBlockedTemporarily = false;

console.log("%c > PRIME VOICEREADER v3.2 (DIAGNOSTIC MODE) < ", "background: #000; color: #0f0; font-size: 20px; border: 1px solid #0f0; padding: 10px;");

// Rozszerzona lista selektorów
const SUBTITLE_SELECTORS = [
    '.atvwebplayersdk-captions-text',
    'div[data-testid="caption-text-container"]',
    'span[class*="caption"]',
    '.dm-captions-text',
    '[class*="atvwebplayersdk-captions"]'
];

const FORBIDDEN_WORDS = [
    "Polski", "English", "Deutsch", "Français", "Italiano", "Español", "Português", 
    "Nederlands", "Norsk", "Dansk", "Svenska", "Suomi", "Türkçe", "Русский", 
    "Latinoamérica", "Audio", "Subtitles", "Off", "Wł.", "Wył.", "Bokmål", "Magyar", "Čeština",
    "Języki", "Napisy", "Dźwięk", "Galego", "Català", "Euskara", "Română",
    "Filipino", "Indonesia", "العربية", "ไทย"
];

const FORBIDDEN_REGEX = new RegExp(FORBIDDEN_WORDS.map(w => w.replace(/[.*+?^${}()|[\\]/g, '\\$&')).join('|'), 'gi');

function setVoice(voiceName) {
    const voices = synthesis.getVoices();
    selectedVoice = voices.find(v => v.name === voiceName);
}

function cleanUpText(text) {
    if (!text) return "";
    
    const matches = [...text.matchAll(FORBIDDEN_REGEX)];
    
    if (matches.length >= 2) {
        const firstMatchIndex = matches[0].index;
        activateTemporaryBlock();
        return text.substring(0, firstMatchIndex).trim();
    }
    
    if (text.includes("Polski") && text.length > 100) {
        const polskiIndex = text.indexOf("Polski");
        activateTemporaryBlock();
        return text.substring(0, polskiIndex).trim();
    }

    return text;
}

function activateTemporaryBlock() {
    if (isBlockedTemporarily) return;
    isBlockedTemporarily = true;
    setTimeout(() => {
        isBlockedTemporarily = false;
    }, 1000);
}

function isSafeToRead(text) {
    if (!text) return false;
    const cleanText = text.trim();
    if (cleanText.length < 2) return false;

    const matches = cleanText.match(FORBIDDEN_REGEX) || [];
    const forbiddenCount = matches.length;

    if (forbiddenCount >= 3) return false;
    if (forbiddenCount >= 1 && cleanText.length < 100) return false;

    const newLines = (cleanText.match(/\n/g) || []).length;
    const commas = (cleanText.match(/,/g) || []).length;
    if (newLines > 2 || commas > 3) return false;

    return true;
}

function speak(text) {
    if (!isEnabled) return;
    if (isBlockedTemporarily) return;
    
    const lowerText = text.toLowerCase();
    let detectedForbidden = 0;
    for (const word of FORBIDDEN_WORDS) {
        if (lowerText.includes(word.toLowerCase())) detectedForbidden++;
    }
    if (detectedForbidden >= 2) {
        activateTemporaryBlock();
        return;
    }

    const cleanedText = cleanUpText(text);
    if (cleanedText === lastText) return;
    if (!isSafeToRead(cleanedText)) return;
    
    lastText = cleanedText;

    // --- LOGIKA MÓWIENIA ---
    if (isRemote) {
        // Kolorowe logi dla widoczności w konsoli
        console.log(`%c > REMOTE SEND: ${cleanedText} `, "background: #0000AA; color: #FFF; font-size: 14px; padding: 4px;");
        chrome.runtime.sendMessage({
            action: "speak_remote", // Przywrócono dedykowaną akcję
            text: cleanedText,
            sessionId: currentSessionId
        });
    } else {
        // Kolorowe logi dla widoczności w konsoli
        console.log(`%c > LOCAL READ: ${cleanedText} `, "background: #AAAA00; color: #000; font-size: 14px; padding: 4px;");
        
        // Lokalnie wysyłamy do background (aby użył chrome.tts)
        chrome.runtime.sendMessage({
            action: "speak",
            text: cleanedText,
            mode: 'local'
        });
    }
}

function startObserving() {
    if (observer) return;
    const targetNode = document.body;
    
    observer = new MutationObserver((mutations) => {
        handleMutations();
    });

    observer.observe(targetNode, { childList: true, subtree: true, characterData: true });
    console.log("%c > OBSERVER STARTED < ", "color: #0f0; font-weight: bold; font-size: 16px;");
}

function handleMutations() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        checkForSubtitles();
    }, 200);
}

function checkForSubtitles() {
    let bestCandidate = "";
    let maxLength = 0;
    const debugMode = true; 

    for (const selector of SUBTITLE_SELECTORS) {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(el => {
            if (el.offsetParent === null) return;
            
            const style = window.getComputedStyle(el);
            if (style.visibility === 'hidden' || style.opacity === '0' || style.display === 'none') return;

            const rect = el.getBoundingClientRect();
            if (rect.width < 5 || rect.height < 5) return;
            
            const text = el.innerText;
            if (!text || text.trim().length === 0) return;

            // Logujemy wszystko co znajdziemy
            if (debugMode && Math.random() > 0.95) { 
                console.log(`[SCAN] Found in ${selector}: "${text.substring(0, 30)}"...`);
            }
            
            if (isSafeToRead(text)) {
                if (text.length > maxLength) {
                    maxLength = text.length;
                    bestCandidate = text;
                }
            } else {
                 if (debugMode && Math.random() > 0.98) console.log(`[REJECTED] "${text.substring(0, 30)}"...`);
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
    
    chrome.runtime.sendMessage({ action: "stop_all" });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start") {
        isEnabled = true;
        isRemote = false;
        
        console.log("%c > START SIGNAL RECEIVED (LOCAL) < ", "color: cyan; font-weight: bold;");

        if (request.voiceName) {
            chrome.runtime.sendMessage({
                action: "set_voice", 
                voiceName: request.voiceName 
            });
        }
        
        startObserving();
    
    } else if (request.action === "init_remote") {
        isEnabled = true;
        isRemote = true;
        currentSessionId = request.sessionId;
        
        console.log(`%c > START SIGNAL RECEIVED (REMOTE: ${request.sessionId}) < `, "color: magenta; font-weight: bold;");

        chrome.runtime.sendMessage({
            action: "init_remote",
            sessionId: request.sessionId
        });
        
        startObserving();

    } else if (request.action === "stop") {
        isEnabled = false;
        stopObserving();
        
        if (isRemote) {
            chrome.runtime.sendMessage({ action: "stop_remote" });
        }
        isRemote = false;
        console.log("%c > STOP SIGNAL RECEIVED < ", "color: red; font-weight: bold;");
    }
});