-- Anreise: Parkplätze, Camper, Taxi, Hotels nach Preisgruppen; Verantwortliche bei Aufgaben.
-- Preise und Entfernungen stammen aus einer Recherche im Nov. 2026 (Gemeinde Mattsee, Buchungsportale,
-- Betreiberseiten). Sie sind Richtwerte und stehen im Feld "Hinweise" mit Quelle. Anzahl der Stellplätze
-- war nicht öffentlich zu finden und bleibt offen.

alter table public.tasks add column if not exists responsible text;

alter table public.accommodations add column if not exists tier text not null default 'Komfort';
alter table public.accommodations add column if not exists price_to numeric(10, 2) check (price_to is null or price_to >= 0);
alter table public.accommodations add column if not exists phone text;
alter table public.accommodations add column if not exists maps_query text;
alter table public.accommodations add column if not exists sort_order integer not null default 0;
alter table public.accommodations drop constraint if exists accommodations_tier_check;
alter table public.accommodations add constraint accommodations_tier_check check (tier in ('Günstig', 'Komfort', 'Camper'));

create table if not exists public.parking_spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  audience text not null default 'Alle Gäste',
  address text,
  maps_query text,
  walk_minutes integer check (walk_minutes is null or walk_minutes >= 0),
  fee text,
  capacity text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.taxis (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  area text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Parkplätze
insert into public.parking_spots (name, audience, address, maps_query, walk_minutes, fee, capacity, notes, sort_order) values
('Parkplatz Weyerbucht', 'Alle Gäste', 'Weyerbucht 1, 5163 Mattsee', 'Parkplatz Weyerbucht, Weyerbucht 1, 5163 Mattsee', 3,
 '1,40 € pro Stunde, 15.04.–15.10. täglich 9–19 Uhr, nachts frei. Parkschein sichtbar hinter die Scheibe legen.',
 'Mittelgroß; Zahl der Plätze nicht veröffentlicht',
 'Der nächste Parkplatz zum Schloss, neben dem Bajuwarengehöft. Der kleine obere Teil beim Friedhof ist nur 30 Minuten frei. Wird an einem Samstag im Sommer schnell voll. Quelle: Marktgemeinde Mattsee.', 10),
('Parkplatz Strandbad', 'Alle Gäste', 'Strandbadstraße, 5163 Mattsee', 'Parkplatz Strandbad, Strandbadstraße, 5163 Mattsee', 8,
 '1 € pro Stunde, Tageskarte 6 €, 15.04.–15.10. täglich 9–19 Uhr. Quelle: Marktgemeinde Mattsee.',
 'Mehrere Reihen direkt vor dem Strandbad; Zahl der Plätze nicht veröffentlicht',
 'Gehweg über die Seepromenade zum Schloss. Günstiger als Weyerbucht, Tageskarte lohnt sich für den ganzen Tag.', 20),
('Parkplatz Nord', 'Alle Gäste', 'Überfuhr 1–2, 5163 Mattsee', 'Parkplatz Nord, Überfuhr, 5163 Mattsee', 15,
 'Kostenlos',
 'Großer Seeparkplatz an der Umfahrung Salzburg–Braunau; Zahl der Plätze nicht veröffentlicht',
 'Ausweichplatz für alle, die zu Fuß gehen mögen oder wenn die Plätze im Ort voll sind. Fußweg am See entlang (Zeit geschätzt, bitte in der Karte prüfen). Quelle: Marktgemeinde Mattsee.', 30),
('Parkplatz Fischinger Straße', 'Alle Gäste', 'Fischinger Straße 2, 5163 Mattsee', 'Parkplatz Fischinger Straße 2, 5163 Mattsee', 8,
 'Kostenlos',
 'Kleiner bis mittlerer Platz nahe der Einsatzzentrale; Zahl der Plätze nicht veröffentlicht',
 'Kostenloser Parkplatz am Ortsrand mit kurzem Fußweg zum Zentrum (Zeit geschätzt). Quelle: Marktgemeinde Mattsee.', 40),
('Zufahrt für Gehbehinderte, Brautpaar und Anlieferung', 'Gehbehinderte, Dienstleister', 'Schloßberg 1, 5163 Mattsee', 'Schloss Mattsee, Schloßberg 1, 5163 Mattsee', 0,
 'Nach Absprache',
 'Wenige Plätze, nur mit Freigabe',
 'Das Schloss liegt in einer verkehrsbeschränkten Zone, eine direkte Zufahrt ist nicht möglich. Wer schlecht zu Fuß ist, meldet sich bei uns und wir klären die Zufahrt mit dem Schloss. Dienstleister fahren nach Absprache mit dem Schloss an.', 50),
('Parken bei der Unterkunft', 'Übernachtungsgäste', null, null, null,
 'Meist kostenlos',
 'Die meisten Unterkünfte haben eigene Parkplätze',
 'Wer in Mattsee übernachtet, lässt das Auto am besten bei der Unterkunft stehen und geht zu Fuß oder nimmt das Taxi. Parkmöglichkeit bitte bei der Buchung bestätigen lassen.', 60);

-- Taxi
insert into public.taxis (name, phone, area, notes, sort_order) values
('Taxi Friedrich Heigerer', '+43 6217 5204', 'Mattsee, Münsterholzstraße 9', 'Taxi vor Ort. Am Hochzeitstag bitte rechtzeitig vorbestellen. Nummer aus Telefonverzeichnis (Cylex, susi.at).', 10),
('Taxi Peter Funk', '+43 6217 7931', 'Mattsee, Stockwiese 3', 'Taxi vor Ort. Nummer aus Telefonverzeichnis (Cylex).', 20),
('Taxi- und Transferservice Ingrid Zellner', '+43 676 6217170', 'Mattsee, Anzing 6', 'Taxi und Transfer vor Ort. Nummer aus Telefonverzeichnis.', 30),
('Taxi und Mietwagen Nazeer', '+43 660 83 84 856', 'Seekirchen, fährt auch nach Mattsee, Obertrum, Seeham, Straßwalchen', 'Zweite Nummer +43 660 83 84 855. Quelle: Stadtgemeinde Seekirchen.', 40);

-- Unterkünfte: Hotels nach Preisgruppe und Camper
insert into public.accommodations (name, type, tier, address, distance, price_per_night, price_to, phone, maps_query, notes, sort_order) values
('Gästehaus am See', 'Pension', 'Günstig', 'Seewinkl 11, 5163 Mattsee', '7 Gehminuten zum Ortszentrum', 38, null, '+43 6217 5125',
 'Gästehaus am See, Seewinkl 11, 5163 Mattsee',
 'Eigenangabe: Doppelzimmer mit Frühstück ab 38 € (vermutlich pro Person). Privater Badestrand, großer Parkplatz. Am besten per WhatsApp unter 0660 8190554 anfragen.', 10),
('Seepension Feichtner', 'Pension', 'Günstig', 'Fisching 5, 5163 Mattsee', 'ruhig am See, ca. 10 Minuten zu Fuß', 26, null, null,
 'Seepension Feichtner, Fisching 5, 5163 Mattsee',
 'Einfach, 17 Zimmer. Eigenangabe: Einzelzimmer ab 26 €. Preis vor Buchung bestätigen lassen.', 20),
('Haus Schmid Mattsee', 'Pension', 'Günstig', 'Köstendorfer Landesstraße 2, 5163 Mattsee', 'zentral', 90, null, null,
 'Haus Schmid Mattsee, Köstendorfer Landesstraße 2, 5163 Mattsee',
 'Ab etwa 90–93 € pro Nacht für das Zimmer laut Vergleichsportalen (Stand 03/2026). Kostenlose Parkplätze, WLAN.', 30),
('Gasthof zur Post', 'Pension', 'Günstig', 'Seekirchen am Wallersee', 'ca. 11 km, 12 Minuten mit dem Auto', 31, null, null,
 'Gasthof zur Post, Seekirchen am Wallersee',
 'Günstigste Variante außerhalb von Mattsee, ab ca. 31 € laut Vergleichsportal. Mit Auto oder Taxi (ca. 30–40 €). Frühstücksbuffet, Parkplatz.', 40),
('Gästehaus & Vinothek Strasser', 'Pension', 'Komfort', '3 Wolf-Dietrich-Weg, 5163 Mattsee', '5 Gehminuten zum Stift', 124, null, null,
 'Gästehaus & Vinothek Strasser, Wolf-Dietrich-Weg 3, 5163 Mattsee',
 'Fünf Zimmer in zentraler Lage, Garten, Terrasse, kostenloser Parkplatz. Ab ca. 124 € pro Zimmer und Nacht, je nach Saison.', 50),
('Wastlbauer', 'Pension', 'Komfort', '5163 Mattsee', 'Mattsee', 125, null, null,
 'Wastlbauer, 5163 Mattsee',
 'Gut bewertet (8,7 von 10 bei 134 Bewertungen auf Booking.com). Preis ab ca. 125 € pro Nacht für zwei Personen, schwankt stark.', 60),
('Seeside Hotel Seewirt Mattsee', 'Hotel', 'Komfort', 'Seestraße 4, 5163 Mattsee', 'direkt am See, 10 Meter zum Ortszentrum', null, null, '+43 6217 5271',
 'Seewirt Mattsee, Seestraße 4, 5163 Mattsee',
 '4 Sterne, direkt am See, Hallenbad. Nur für Erwachsene ab 16 Jahren (nicht mit Kindern buchbar). Preis nicht ermittelt, bitte beim Hotel anfragen; Zimmer im Hochsommer sind schnell weg.', 70),
('Romantik Hotel Schloss Mondsee', 'Hotel', 'Komfort', 'Schlosshof 1a, 5310 Mondsee', 'ca. 20 Minuten mit dem Auto', 225, 255, '+43 6232 5001',
 'Romantik Hotel Schloss Mondsee, Schlosshof 1a, 5310 Mondsee',
 'Obere Preisgruppe: Doppelzimmer ab ca. 225 €, Suiten ab ca. 255 € mit Frühstück (Richtwert). Gehobene Alternative zu Mattsee, mit Auto oder Taxi.', 80),
('Strandcamping Oitner', 'Camping', 'Camper', 'Seestraße 18, 5162 Obertrum am See', 'ca. 3,6 km, 6 Minuten mit dem Auto', 26, 30, null,
 'Strandcamping Oitner, Seestraße 18, 5162 Obertrum am See',
 'Camper und Wohnwagen, ca. 60 Plätze mit Strom, Saison etwa Mai bis September. Preis früher ca. 22–25,50 € pro Nacht für zwei Personen plus Ortstaxe, heute vermutlich höher. Platz früh reservieren.', 90),
('Parkplatz Jocham am Mattsee (Stein)', 'Camping', 'Camper', 'Stein, 5163 Palting', 'ca. 4 km', 0, null, null,
 'Parkplatz Jocham am Mattsee, 5163 Palting',
 'Einfacher Stellplatz ohne Service, laut Camperportal kostenlos für höchstens 24 Stunden. Keine Strom- und Wasserversorgung. Nur als Notlösung.', 100);

-- Aufgaben mit Verantwortlichen
insert into public.tasks (title, phase, assignee, priority, responsible, notes) values
('Dekoration planen und besorgen', '3 – 6 bis 9 Monate vorher', 'Andere', 'Mittel', null, 'Wer übernimmt die Dekoration? Namen eintragen.'),
('Aufbau und Abbau der Deko am Hochzeitstag', '6 – Letzte Woche', 'Andere', 'Mittel', null, 'Wer ist vor Ort, wer baut ab?'),
('Einweisung der Gäste und Parkplatzeinweiser festlegen', '6 – Letzte Woche', 'Andere', 'Mittel', null, 'Wer weist Gäste am Parkplatz und beim Schloss ein?'),
('Taxi-Vorbestellung für den Hochzeitsabend', '5 – 1 bis 3 Monate vorher', 'Andere', 'Mittel', null, 'Nummern stehen auf der Anfahrt-Seite. Mehrere Betriebe vorab anfragen.'),
('Camper-Stellplätze abstimmen', '5 – 1 bis 3 Monate vorher', 'Beide', 'Niedrig', null, 'Wer kommt mit dem Camper, Platz bei Strandcamping Oitner reservieren.');
