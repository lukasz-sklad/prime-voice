# Prime Voice Reader

Zaawansowane rozszerzenie do przeglądarek (Chrome, Chromium, Edge), które odczytuje napisy z Amazon Prime Video na głos, używając syntezatorów mowy AI.

Działa idealnie na **Steam Deck**, Linuxie, Windowsie i macOS.

## Funkcje

*   **Lokalny Lektor AI:** Współpracuje z darmowym dodatkiem [Piper TTS](https://chromewebstore.google.com/detail/piper-text-to-speech-voic/ppnfahcipommelgaapjalhooaeeblmeg), oferując naturalne, ludzkie głosy (np. Gosia PL) działające 100% offline.
*   **Zdalny Lektor (Android):** Zamień swój telefon w bezprzewodowy głośnik. Dodatek wysyła napisy do telefonu przez Internet (MQTT), a telefon odczytuje je swoim wysokiej jakości syntezatorem (Google/Samsung).
*   **Inteligentne Wykrywanie:** Automatycznie pomija nazwy języków w menu, reklamy i elementy interfejsu. Czyta tylko dialogi.
*   **Bezpieczeństwo:** Nie wymaga logowania, nie śledzi użytkownika.

## Instalacja

### 1. Pobranie Dodatku
1.  Pobierz to repozytorium lub sklonuj je:
    ```bash
    git clone https://github.com/lukasz-sklad/prime-voice.git
    ```
2.  Otwórz w przeglądarce stronę zarządzania rozszerzeniami: `chrome://extensions` (lub `edge://extensions`).
3.  Włącz **Tryb dewelopera** (prawy górny róg).
4.  Kliknij **Załaduj rozpakowane** (Load unpacked) i wybierz folder z pobranym projektem.

### 2. Konfiguracja Głosu (Zalecane: Piper TTS)
Aby uzyskać najlepszą jakość głosu offline:
1.  Zainstaluj dodatek [Piper Text-to-Speech](https://chromewebstore.google.com/detail/piper-text-to-speech-voic/ppnfahcipommelgaapjalhooaeeblmeg) z Chrome Web Store.
2.  W ustawieniach Pipera pobierz głos **Polski (pl_PL)**, np. `pl_PL-gosia-medium`.
3.  Zrestartuj przeglądarkę.
4.  W **Prime Voice Reader** w zakładce **Lokalny** wybierz głos `Piper pl_PL-gosia-medium`.

## Instrukcja Obsługi

### Tryb Lokalny (PC)
1.  Otwórz film na Prime Video.
2.  Kliknij ikonę **Prime Voice Reader**.
3.  W zakładce **Lokalny** wybierz głos z listy.
4.  Kliknij **URUCHOM LEKTORA**.

### Tryb Zdalny (Telefon)
Użyj telefonu jako lektora (przydatne, gdy systemowe głosy na PC są słabej jakości).

1.  Otwórz dodatek na PC i przejdź do zakładki **Zdalny**.
2.  Kliknij **Generuj Kod Połączenia**.
3.  Zeskanuj kod QR telefonem.
4.  Na telefonie kliknij duży przycisk **AKTYWUJ GŁOS**.
5.  Na PC kliknij **URUCHOM LEKTORA**.
6.  Gotowe! Telefon będzie czytał napisy synchronicznie z filmem.

## Rozwiązywanie Problemów

*   **Brak dźwięku lokalnie:** Upewnij się, że masz zainstalowany głos w systemie lub dodatku Piper. Sprawdź, czy karta nie jest wyciszona.
*   **Telefon nie czyta:** Upewnij się, że kliknąłeś "AKTYWUJ GŁOS" na ekranie telefonu (przeglądarki mobilne blokują dźwięk bez interakcji). Sprawdź głośność multimediów w telefonie.
*   **Brak napisów:** Upewnij się, że napisy na Prime Video są włączone (nawet jeśli ich nie chcesz widzieć, muszą być aktywne, aby dodatek je widział). Możesz zmienić ich styl na przezroczysty w ustawieniach Amazonu.

## Licencja
MIT