-- Favorit: 14.08.2027 (Samstag). Datum auf der Gästeseite vorbelegen, falls noch leer.
update public.date_options set status = 'Favorit',
  notes = coalesce(notes || E'\n', '') || 'Favorit von Sarah und Bene (22.11.2026). Danach Mariä Himmelfahrt (Sonntag 15.08.) als Zusatz für spätere Hochzeitstage.'
  where option_date = date '2027-08-14' and status <> 'Favorit';
update public.site_settings set value = '2027-08-14' where key = 'wedding_date' and coalesce(value, '') = '';
