---
name: security-engineering
description: Use when the user asks for proactive security engineering work — threat modeling, secure architecture design, authorized penetration testing / vulnerability assessment, system/config hardening, applied cryptography guidance, or incident response planning — "zrób threat model", "zaprojektuj bezpieczną architekturę", "przeprowadź pentest naszej aplikacji", "harden this server/config", "jakiej biblioteki kryptograficznej użyć", "zbuduj plan reagowania na incydenty", "STRIDE analysis", "zero trust architecture", "CIS hardening". Not for reviewing a pending diff/PR (the built-in security-review skill does that), not for the routine app-level checklist (auth, SQL injection, secrets) already baked into backend-dev while building an API, and not for CI/CD secrets/IAM/pipeline scanning mechanics (use devops-platform). Offensive actions (pentesting, exploit development, active scanning) require clear authorization context — own system, signed pentest engagement, CTF, or scoped bug-bounty program.
---

# Security engineering

Ten skill pomaga proaktywnie projektować i wzmacniać bezpieczeństwo systemów — modelowanie zagrożeń, architektura, testy penetracyjne, hardening, kryptografia stosowana, reagowanie na incydenty. To nie jest przegląd konkretnego diffa (do tego jest `security-review`) ani podstawowy checklist bezpieczeństwa aplikacji przy budowie API (to już robi `backend-dev`) — to głębsza, systemowa praca inżynierska.

## Krok 0 — Autoryzacja przed działaniami ofensywnymi

- Zanim wykonasz cokolwiek aktywnego wobec systemu (skanowanie podatności, próba eksploitacji, testy penetracyjne) — potwierdź jasny kontekst autoryzacji: własny system/środowisko testowe, podpisana umowa pentestingowa z określonym zakresem, zawody CTF, lub program bug bounty z jasno zdefiniowanym scope.
- Bez takiego kontekstu ogranicz się do wiedzy defensywnej/edukacyjnej (jak coś działa, jak się przed tym bronić) i nie generuj gotowych narzędzi ofensywnych wymierzonych w system, do którego autoryzacja nie jest potwierdzona.
- Nawet w kontekście autoryzowanym: trzymaj się zdefiniowanego zakresu (adresy/systemy w scope), unikaj technik destrukcyjnych i DoS chyba że explicit w umowie, i nie buduj narzędzi do masowego atakowania, kompromitacji łańcucha dostaw ani obchodzenia detekcji w celach złośliwych.
- Jeśli podczas autoryzowanej pracy natrafisz na podatność poza zleconym zakresem, zasygnalizuj to użytkownikowi zamiast samodzielnie ją eksploatować.

## Krok 1 — Rozpoznaj typ zadania

Ustal, o który z poniższych obszarów chodzi — każdy ma inną metodologię, opisaną w kolejnych krokach: threat modeling, projektowanie architektury bezpieczeństwa, ocena podatności/pentest, hardening, kryptografia stosowana, reagowanie na incydenty. Zadania często się łączą (np. threat model prowadzi do konkretnych rekomendacji architektonicznych) — nie traktuj ich jako rozłącznych.

## Krok 2 — Threat modeling (STRIDE)

- Zbuduj/poproś o diagram przepływu danych (DFD): procesy, magazyny danych, przepływy, granice zaufania (trust boundaries) — bez tego threat modeling jest gdybaniem.
- Dla każdego elementu na granicy zaufania przeanalizuj kategorie STRIDE: Spoofing (podszywanie), Tampering (manipulacja danymi), Repudiation (zaprzeczalność działań), Information disclosure (wyciek danych), Denial of Service, Elevation of privilege.
- Dla każdego zidentyfikowanego zagrożenia oceń ryzyko (prawdopodobieństwo × wpływ) i zaproponuj konkretną mitygację — nie kończ na samej liście zagrożeń bez rekomendacji.
- Priorytetyzuj mitygacje po realnym ryzyku, nie po łatwości implementacji.

## Krok 3 — Bezpieczna architektura

- Defense in depth — projektuj wiele niezależnych warstw obrony, żeby awaria jednej nie kompromitowała całości.
- Least privilege — każdy komponent/użytkownik/serwis ma tylko uprawnienia niezbędne do swojej funkcji, nigdy "na wszelki wypadek".
- Zero trust — nie zakładaj zaufania na podstawie samej lokalizacji sieciowej (sieć wewnętrzna ≠ bezpieczna); każde żądanie weryfikuj niezależnie od pochodzenia.
- Segmentacja sieci/mikrosegmentacja między komponentami o różnej wrażliwości (np. warstwa danych oddzielona od warstwy publicznej).
- Secure defaults i fail closed — w razie błędu/awarii system powinien domyślnie odmawiać dostępu, nie zezwalać.

## Krok 4 — Ocena podatności i testy penetracyjne (tylko autoryzowane)

- Trzymaj się metodologii: rekonesans → skanowanie/identyfikacja podatności → (jeśli w zakresie) próba eksploitacji → raportowanie — nie przeskakuj do exploitation bez wcześniejszej weryfikacji, że jest to w scope.
- Używaj uznanych, standardowych narzędzi i technik zgodnych z zakresem zlecenia; nie testuj systemów/adresów poza zdefiniowanym scope.
- Klasyfikuj znalezione podatności (np. wg CVSS) i dla każdej podaj: dowód (PoC w granicach autoryzacji), realny wpływ, konkretną rekomendację remediacji.
- Po zakończeniu testu zaproponuj retest po wdrożeniu poprawek, jeśli to sensowne w kontekście zlecenia.

## Krok 5 — Hardening systemów i konfiguracji

- Opieraj rekomendacje na uznanych benchmarkach (CIS Benchmarks, OWASP ASVS) zamiast improwizować listę kontrolną od zera.
- Minimalizuj powierzchnię ataku: wyłączaj nieużywane usługi/porty/moduły, usuwaj domyślne konta i hasła.
- Wymuszaj MFA wszędzie, gdzie to możliwe, i least privilege dla kont serwisowych/administracyjnych.
- Zapewnij systematyczne zarządzanie patchami (proces, nie jednorazowa akcja) i segmentację/firewalling zgodną z Krokiem 3.

## Krok 6 — Kryptografia stosowana

- Używaj sprawdzonych, aktualnie rekomendowanych bibliotek i algorytmów — nigdy nie implementuj własnych prymitywów kryptograficznych (szyfrów, generatorów losowości, protokołów) od zera.
- Hasła hashuj algorytmami do tego przeznaczonymi (bcrypt, scrypt, Argon2) z odpowiednim cost factorem — nigdy MD5/SHA1/SHA256 bez soli i stretchingu.
- Zarządzanie kluczami przez dedykowany mechanizm (KMS/HSM/secret manager) z rotacją — klucze nigdy hardkodowane ani w repo.
- Wymuszaj aktualne wersje protokołów (TLS 1.2+/1.3) i flaguj przestarzałe/złamane algorytmy (DES, RC4, MD5 do integralności) jako do wymiany.

## Krok 7 — Reagowanie na incydenty

- Buduj/stosuj playbook wg faz: identyfikacja → powstrzymanie (containment) → eradykacja przyczyny → odzyskanie → wnioski powdrożeniowe (post-mortem bez obwiniania).
- Definiuj role i ścieżkę komunikacji (kto decyduje, kto informuje interesariuszy/klientów/regulatora) zanim incydent wystąpi — runbook przygotowany z wyprzedzeniem, nie improwizowany w trakcie.
- Post-mortem zawsze kończ konkretnymi action items z właścicielem i terminem, nie tylko opisem co się stało.

## Krok 8 — Weryfikacja i raportowanie

- Każdy finding raportuj z: severity, konkretnym dowodem/scenariuszem, i jednoznaczną rekomendacją naprawy — nie zostawiaj samej listy problemów bez priorytetyzacji.
- Jeśli zadanie okaże się w praktyce przeglądem konkretnego diffa/PR, a nie pracą projektową/systemową, przekieruj do skilla `security-review` zamiast dublować tamten proces.
