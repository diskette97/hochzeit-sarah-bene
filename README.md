# Hochzeit Sarah & Bene

Private Hochzeitsseite für Gäste plus Planungsbereich für das Brautpaar. Alles liegt hinter Login und Freischaltung.

Technik: Next.js + TypeScript, Datenbank PostgreSQL mit eigener Anmeldung (kein Supabase, kein Fremddienst). Gedacht für den Netcup-Server: Postgres, App und Caddy (HTTPS) laufen auf derselben Maschine, die Datenbank ist nicht von außen erreichbar.

## Bereiche

**Gästeseite** (alle Freigeschalteten): Start mit Countdown, Ablauf, Anfahrt & Unterkunft (mit Preisen, Links, Buchungsstichwort), Infos & FAQ (Dresscode, Kinder, Geschenke), Zusage-Formular, Wunschliste mit Reservierung.

**Planung** (Rolle Planer/Admin, unter `/plan`):
- Übersicht: Countdown, Budget, Aufgaben, Gäste, Zusagen
- Budget: Gesamtbudget, Posten pro Kategorie mit geplant/tatsächlich/bezahlt, Status, Fälligkeit, Link
- Aufgaben: Checkliste nach Phasen (12+ Monate bis nach der Hochzeit)
- Dienstleister & Angebote: Status, Preis, Link, Kontakt, Bewertung
- Gästeliste: Seite, Gruppe, A/B/C, Rückmeldung, Personen, Ernährung, Tisch
- Zusagen: Rückmeldungen, die Gäste über die Seite abgegeben haben
- Ideen: Merkliste mit Link und Preis
- Gästeseite bearbeiten: alle Texte, Ablauf, Unterkünfte, FAQ, Wunschliste
- Benutzer (nur Admin): Freischalten, Rollen vergeben, sperren, Passwort neu setzen

## Rollen und Freischaltung

| Rolle | Darf |
|---|---|
| admin (Sarah & Bene) | alles, inkl. Benutzer freischalten |
| planer (Trauzeugen/Helfer) | Planung und Gästeseite bearbeiten |
| gast | Gästeseite ansehen, zusagen, Geschenke reservieren |

- Wer sich registriert, hat den Status `pending` und sieht nichts, bis ein Admin freischaltet.
- Admin-Konten entstehen nur über das Skript `create-admin` (nicht über die Registrierung). So kann kein Fremder Admin werden.
- Es gibt keinen E-Mail-Versand. „Passwort vergessen“ löst ein Admin unter Benutzer → „Passwort setzen“.
- Gäste sehen nie, wer ein Geschenk reserviert hat; nur Planer sehen den Namen.
- Fehlversuche beim Login werden begrenzt (je 15 Minuten: 8 pro E-Mail und IP, 30 pro E-Mail insgesamt, 40 pro IP); Registrierungen: 10 Versuche pro IP und Stunde.

## Auf dem Netcup-Server einrichten

Voraussetzung: Debian-Server mit root-Zugriff, eine Domain oder die kostenlose IP-Domain `<IP-mit-Bindestrichen>.sslip.io` (z. B. `152-53-114-139.sslip.io`), Ports 80 und 443 erreichbar.

```bash
# Projektordner auf den Server bringen (git clone oder Kopie), dann als root:
cd hochzeit-sarah-bene
DOMAIN=152-53-114-139.sslip.io bash deploy/setup-server.sh
bash /opt/hochzeit/deploy/create-admin.sh deine@mail.de "Bene"
```

Das Skript installiert PostgreSQL, Node 22 und Caddy, legt Datenbank und Benutzer an, baut die App, richtet den systemd-Dienst `hochzeit` ein, holt ein HTTPS-Zertifikat und plant ein tägliches Backup nach `/var/backups/hochzeit` (14 Tage). Es lässt sich für Updates erneut ausführen; Daten bleiben erhalten.

Nützlich: `systemctl status hochzeit`, `journalctl -u hochzeit -n 50`.

## Lokal entwickeln

```bash
cp .env.example .env.local     # DATABASE_URL anpassen
npm install
npm run db:migrate
npm run create-admin -- deine@mail.de "Bene"
npm run dev
```

## Tests

`npm test` prüft die Berechnungen (Budget, Countdown, Gästezahlen, Zahlen-Parser) und die Anmelde-Logik (Passwort-Hash, Token, E-Mail/IP, Zugriffsprüfung jeder Seite und Server Action).
