-- Terminoptionen für die Hochzeit (Vergleich mit Noten 0–10) und erste Aufgaben zur Entscheidung.
create table public.date_options (
  id uuid primary key default gen_random_uuid(),
  option_date date not null,
  status text not null default 'Möglich',
  offer_until date,
  score_weather numeric(3, 1) check (score_weather is null or score_weather between 0 and 10),
  score_venue numeric(3, 1) check (score_venue is null or score_venue between 0 and 10),
  score_guests numeric(3, 1) check (score_guests is null or score_guests between 0 and 10),
  price numeric(12, 2) check (price is null or price >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.date_options (option_date, status, score_weather, score_venue, score_guests, notes) values
  ('2027-08-14', 'Möglich', 7, 7.6, 6, 'Sicher möglich. Sonnenuntergang ca. 20:23 Uhr. Wenig Starkregen in 35 Jahren Daten (22 % der Tage). Danach ist Mariä Himmelfahrt (15.08.): in Jahren mit Werktag ein freier Tag nach dem Hochzeitstag. 2027 ist der 15.08. ein Sonntag.'),
  ('2027-08-21', 'Möglich', 7, 6.5, 7, 'Könnte bald weg sein. Davor drei standesamtliche Trauungen, euer Slot ab ca. 13:30 Uhr (Raster 14:00 prüfen). Weniger Hitze und Verkehr. Sonnenuntergang ca. 20:11 Uhr.'),
  ('2027-07-31', 'Angebot offen', 6, 6.8, 4, 'Angebot unbestätigt, noch frei, könnte bald weg sein. Wahrscheinlich Stau-Samstag (Ferienstart Baden-Württemberg 29.07., Bayern 02.08.). Meiste Starkregentage (32 %), längster Abend (Sonnenuntergang ca. 20:45 Uhr).'),
  ('2027-06-19', 'Verworfen', null, null, null, 'Freunde heiraten an diesem Tag.'),
  ('2027-09-11', 'Möglich', null, null, null, 'Wetter kühler (ca. 24 % der Tage unter 18 °C), letzter Ferientag in Baden-Württemberg, Bayern und Salzburg. Sonnenuntergang ca. 19:30 Uhr.'),
  ('2027-09-18', 'Möglich', null, null, null, 'Nur eventuell. Wetter am schlechtesten, Wiesn-Anstich in München, Sonnenuntergang ca. 19:15 Uhr.');

insert into public.tasks (title, phase, assignee, priority, notes) values
  ('Standesamt Mattsee anrufen: Samstag-Slot (13:30/14:00) und Dokumente klären', '1 – 12+ Monate vorher', 'Beide', 'Hoch', 'Sylvia Nußbaumer, +43 6217 7885-17. Kein Rechtsanspruch auf einen Termin. Ehefähigkeitszeugnis braucht bis zu 6 Monate Vorlauf, falls beide Deutsche sind.'),
  ('Schloss: Zahlungsplan schriftlich fixieren (10 % / 50 % einen Monat vorher / Rest nach der Hochzeit)', '1 – 12+ Monate vorher', 'Beide', 'Hoch', 'Standard-AGB (100 % binnen 10 Tagen für Erstkunden außerhalb Österreichs) ausschließen. Berechnungsgrundlage, Storno und kostenlose Umbuchung zwischen den Terminen mit aufnehmen.'),
  ('Schloss: schriftliche Option (ca. 14 Tage) für die Wunschtermine anfragen', '1 – 12+ Monate vorher', 'Beide', 'Hoch', null),
  ('Schloss: Zutritt/Aufbauzeit, Endzeit Musik, Regen-Plan-B und Exklusivität klären', '1 – 12+ Monate vorher', 'Beide', 'Hoch', 'Trauung im Tassilosaal (120 oder 150 Personen?), Schlosshof-Außentrauung (Zusatz ca. 1.089 €), Entscheidungsfrist bei Regen, Parken, Fremdcatering/DJ erlaubt?'),
  ('Termin des Seefests Mattsee 2027 und Konzerttermine am Schloss erfragen', '1 – 12+ Monate vorher', 'Beide', 'Mittel', null),
  ('Save-the-date an die Gäste schicken', '2 – 9 bis 12 Monate vorher', 'Beide', 'Hoch', 'Festspiele (16.07.–29.08.2027) machen Hotels knapp: früh Bescheid geben.'),
  ('Hotelkontingente in Mattsee/Flachgau optionieren, Shuttle anfragen', '2 – 9 bis 12 Monate vorher', 'Beide', 'Mittel', 'Heigerer Taxi und Knauseder. Salzburg-Stadt ist in der Festspielzeit teuer.'),
  ('Vorgespräch zum Essen, Probeessen und Menü passend zur Jahreszeit', '3 – 6 bis 9 Monate vorher', 'Beide', 'Mittel', null),
  ('Gästeliste prüfen: Gruppen, doppelte Namen, offene Begleitungen', '1 – 12+ Monate vorher', 'Beide', 'Mittel', 'Namen mit „X“, „?“ und in Klammern klären. Zählung weicht von der Liste ab (Familie Bene eng: 12 statt 9, entfernt: 59 statt 61).');
