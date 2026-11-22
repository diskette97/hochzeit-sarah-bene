// Zentrale Beschreibung aller bearbeitbaren Tabellen (Server und Client nutzen dieselbe Quelle).

export type FieldType = "text" | "textarea" | "number" | "money" | "url" | "date" | "time" | "select" | "bool";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  /** In der Listenansicht anzeigen */
  list?: boolean;
  /** Leere Eingabe wird zu 0 statt NULL */
  zero?: boolean;
  /** Wird in der Fußzeile aufsummiert */
  sum?: boolean;
  placeholder?: string;
  integer?: boolean;
  min?: number;
  max?: number;
};

export type TableConfig = {
  table: string;
  title: string;
  singular: string;
  fields: Field[];
  orderBy: string;
  ascending?: boolean;
  /** Gruppierung in der Listenansicht */
  groupBy?: string;
  emptyText: string;
};

export const BUDGET_CATEGORIES = [
  "Location & Miete",
  "Catering & Getränke",
  "Hochzeitstorte & Süßes",
  "Fotograf & Video",
  "Musik & Unterhaltung",
  "Trauung",
  "Outfit Braut",
  "Outfit Bräutigam",
  "Ringe",
  "Styling",
  "Blumen & Deko",
  "Papeterie",
  "Transport",
  "Unterkunft",
  "Flitterwochen",
  "Gastgeschenke",
  "Sonstiges & Puffer",
];

export const VENDOR_CATEGORIES = [
  "Location",
  "Catering",
  "Fotograf",
  "Videograf",
  "DJ / Band",
  "Trauredner / Kirche",
  "Floristik & Deko",
  "Torte & Konditorei",
  "Friseur & Make-up",
  "Brautmode",
  "Herrenmode",
  "Juwelier / Ringe",
  "Transport",
  "Papeterie / Druck",
  "Unterkunft",
  "Sonstiges",
];

export const TASK_PHASES = [
  "1 – 12+ Monate vorher",
  "2 – 9 bis 12 Monate vorher",
  "3 – 6 bis 9 Monate vorher",
  "4 – 3 bis 6 Monate vorher",
  "5 – 1 bis 3 Monate vorher",
  "6 – Letzte Woche",
  "7 – Nach der Hochzeit",
];

export const TABLES = {
  budget: {
    table: "budget_items",
    title: "Budget",
    singular: "Posten",
    orderBy: "category",
    groupBy: "category",
    emptyText: "Noch keine Posten. Mit „Neu“ starten.",
    fields: [
      { key: "title", label: "Posten", type: "text", required: true, list: true },
      { key: "category", label: "Kategorie", type: "select", options: BUDGET_CATEGORIES, required: true },
      { key: "vendor", label: "Anbieter", type: "text", list: true },
      { key: "planned", label: "Geplant (€)", type: "money", zero: true, list: true, sum: true },
      { key: "actual", label: "Tatsächlich / Angebot (€)", type: "money", list: true, sum: true },
      { key: "paid", label: "Bereits bezahlt (€)", type: "money", zero: true, list: true, sum: true },
      { key: "status", label: "Status", type: "select", options: ["Idee", "Angebot", "Gebucht", "Angezahlt", "Bezahlt"], required: true, list: true },
      { key: "due_date", label: "Fällig am", type: "date" },
      { key: "url", label: "Link", type: "url", list: true },
      { key: "notes", label: "Notizen", type: "textarea" },
    ],
  },
  tasks: {
    table: "tasks",
    title: "Aufgaben",
    singular: "Aufgabe",
    orderBy: "phase",
    groupBy: "phase",
    emptyText: "Noch keine Aufgaben.",
    fields: [
      { key: "done", label: "Erledigt", type: "bool", list: true },
      { key: "title", label: "Aufgabe", type: "text", required: true, list: true },
      { key: "phase", label: "Phase", type: "select", options: TASK_PHASES, required: true },
      { key: "due_date", label: "Fällig am", type: "date", list: true },
      { key: "assignee", label: "Zuständig", type: "select", options: ["Beide", "Sarah", "Bene", "Trauzeugen", "Andere"], required: true, list: true },
      { key: "priority", label: "Priorität", type: "select", options: ["Hoch", "Mittel", "Niedrig"], required: true, list: true },
      { key: "url", label: "Link", type: "url", list: true },
      { key: "notes", label: "Notizen", type: "textarea" },
    ],
  },
  vendors: {
    table: "vendors",
    title: "Dienstleister & Angebote",
    singular: "Dienstleister",
    orderBy: "category",
    groupBy: "category",
    emptyText: "Noch keine Dienstleister gemerkt.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, list: true },
      { key: "category", label: "Kategorie", type: "select", options: VENDOR_CATEGORIES, required: true },
      { key: "status", label: "Status", type: "select", options: ["Idee", "Angefragt", "Angebot erhalten", "Termin / Besichtigung", "Gebucht", "Abgelehnt"], required: true, list: true },
      { key: "price", label: "Preis / Angebot (€)", type: "money", list: true, sum: true },
      { key: "url", label: "Webseite / Link", type: "url", list: true },
      { key: "contact", label: "Ansprechpartner", type: "text" },
      { key: "phone", label: "Telefon", type: "text" },
      { key: "email", label: "E-Mail", type: "text" },
      { key: "rating", label: "Bewertung", type: "select", options: ["", "★", "★★", "★★★", "★★★★", "★★★★★"], list: true },
      { key: "notes", label: "Notizen", type: "textarea" },
    ],
  },
  guests: {
    table: "guests",
    title: "Gästeliste",
    singular: "Gast",
    orderBy: "name",
    groupBy: "group_name",
    emptyText: "Noch keine Gäste eingetragen.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, list: true },
      { key: "side", label: "Seite", type: "select", options: ["Beide", "Sarah", "Bene"], required: true, list: true },
      { key: "group_name", label: "Gruppe (z. B. Familie, Freunde)", type: "text", list: true },
      { key: "priority", label: "Kategorie", type: "select", options: ["A – gesetzt", "B – gerne", "C – vielleicht"], required: true, list: true },
      { key: "invited", label: "Eingeladen", type: "bool", list: true },
      { key: "rsvp", label: "Rückmeldung", type: "select", options: ["offen", "Zusage", "Absage"], required: true, list: true },
      { key: "persons", label: "Personen (inkl. Begleitung)", type: "number", integer: true, min: 0, max: 10, zero: true, list: true, sum: true },
      { key: "diet", label: "Ernährung / Allergien", type: "text" },
      { key: "table_no", label: "Tisch", type: "text" },
      { key: "phone", label: "Telefon", type: "text", list: true },
      { key: "email", label: "E-Mail", type: "text" },
      { key: "address", label: "Adresse (für Einladung)", type: "textarea" },
      { key: "notes", label: "Notizen", type: "textarea" },
    ],
  },
  dateOptions: {
    table: "date_options",
    title: "Terminoptionen",
    singular: "Termin",
    orderBy: "option_date",
    emptyText: "Noch keine Termine eingetragen.",
    fields: [
      { key: "option_date", label: "Datum", type: "date", required: true, list: true },
      { key: "status", label: "Status", type: "select", options: ["Möglich", "Angebot offen", "Reserviert", "Gebucht", "Verworfen"], required: true, list: true },
      { key: "offer_until", label: "Option / Angebot gültig bis", type: "date" },
      { key: "score_weather", label: "Note Wetter (0–10)", type: "number", max: 10, list: true },
      { key: "score_venue", label: "Note Schloss/Ablauf (0–10)", type: "number", max: 10, list: true },
      { key: "score_guests", label: "Note Gäste (0–10)", type: "number", max: 10, list: true },
      { key: "price", label: "Angebotspreis (€)", type: "money" },
      { key: "notes", label: "Notizen", type: "textarea", list: true },
    ],
  },
  ideas: {
    table: "ideas",
    title: "Ideen & Merkliste",
    singular: "Idee",
    orderBy: "category",
    groupBy: "category",
    emptyText: "Noch keine Ideen gesammelt.",
    fields: [
      { key: "title", label: "Idee", type: "text", required: true, list: true },
      { key: "category", label: "Kategorie", type: "select", options: ["Deko", "Outfit", "Location", "Programm", "Musik", "Essen & Trinken", "Flitterwochen", "Geschenke", "Sonstiges"], required: true },
      { key: "status", label: "Status", type: "select", options: ["Idee", "Favorit", "Entschieden", "Verworfen"], required: true, list: true },
      { key: "price", label: "Preis (€)", type: "money", list: true, sum: true },
      { key: "url", label: "Link", type: "url", list: true },
      { key: "notes", label: "Notizen", type: "textarea" },
    ],
  },
  schedule: {
    table: "schedule_items",
    title: "Ablauf des Tages",
    singular: "Programmpunkt",
    orderBy: "time",
    emptyText: "Noch kein Ablauf eingetragen.",
    fields: [
      { key: "time", label: "Uhrzeit", type: "time", list: true },
      { key: "title", label: "Programmpunkt", type: "text", required: true, list: true },
      { key: "location", label: "Ort", type: "text", list: true },
      { key: "description", label: "Beschreibung", type: "textarea", list: true },
    ],
  },
  accommodations: {
    table: "accommodations",
    title: "Unterkünfte",
    singular: "Unterkunft",
    orderBy: "name",
    emptyText: "Noch keine Unterkünfte eingetragen.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, list: true },
      { key: "type", label: "Art", type: "select", options: ["Hotel", "Pension", "Ferienwohnung", "Camping", "Sonstiges"], required: true, list: true },
      { key: "address", label: "Adresse", type: "text", list: true },
      { key: "distance", label: "Entfernung zur Location", type: "text", list: true },
      { key: "price_per_night", label: "Preis pro Nacht (€)", type: "money", list: true },
      { key: "booking_code", label: "Buchungsstichwort / Rabattcode", type: "text", list: true },
      { key: "url", label: "Buchungslink", type: "url", list: true },
      { key: "notes", label: "Hinweise", type: "textarea" },
    ],
  },
  faq: {
    table: "faq",
    title: "FAQ für Gäste",
    singular: "Frage",
    orderBy: "sort_order",
    emptyText: "Noch keine Fragen.",
    fields: [
      { key: "question", label: "Frage", type: "text", required: true, list: true },
      { key: "answer", label: "Antwort", type: "textarea", list: true },
      { key: "sort_order", label: "Reihenfolge", type: "number", integer: true, min: 0, max: 9999, zero: true },
    ],
  },
  gifts: {
    table: "gifts",
    title: "Wunschliste",
    singular: "Wunsch",
    orderBy: "created_at",
    emptyText: "Noch keine Wünsche eingetragen.",
    fields: [
      { key: "title", label: "Wunsch", type: "text", required: true, list: true },
      { key: "description", label: "Beschreibung", type: "textarea", list: true },
      { key: "price", label: "Preis (€)", type: "money", list: true, sum: true },
      { key: "url", label: "Link", type: "url", list: true },
    ],
  },
} satisfies Record<string, TableConfig>;

export type TableKey = keyof typeof TABLES;

/** Einstellungen der Gästeseite (Tabelle site_settings) */
export type SettingField = { key: string; label: string; type: "text" | "textarea" | "date" | "time" | "url"; group: string; hint?: string };

export const SETTING_FIELDS: SettingField[] = [
  { key: "bride_name", label: "Name 1", type: "text", group: "Das Paar" },
  { key: "groom_name", label: "Name 2", type: "text", group: "Das Paar" },
  { key: "welcome_text", label: "Willkommenstext", type: "textarea", group: "Das Paar" },
  { key: "wedding_date", label: "Hochzeitsdatum", type: "date", group: "Termin & Ort" },
  { key: "wedding_time", label: "Beginn (Uhrzeit)", type: "time", group: "Termin & Ort" },
  { key: "venue_name", label: "Name der Location", type: "text", group: "Termin & Ort" },
  { key: "venue_address", label: "Adresse der Location", type: "text", group: "Termin & Ort" },
  { key: "venue_url", label: "Webseite der Location", type: "url", group: "Termin & Ort" },
  { key: "map_url", label: "Link zur Karte (Google Maps o. ä.)", type: "url", group: "Termin & Ort" },
  { key: "arrival_info", label: "Anreise (Auto, Bahn, Shuttle)", type: "textarea", group: "Anfahrt" },
  { key: "parking_info", label: "Parken", type: "textarea", group: "Anfahrt" },
  { key: "dresscode", label: "Dresscode", type: "textarea", group: "Infos für Gäste" },
  { key: "kids_info", label: "Kinder", type: "textarea", group: "Infos für Gäste" },
  { key: "rsvp_deadline", label: "Rückmeldung bis", type: "date", group: "Infos für Gäste" },
  { key: "gifts_text", label: "Text zu Geschenken", type: "textarea", group: "Infos für Gäste" },
  { key: "photos_url", label: "Link zum Foto-Album", type: "url", group: "Infos für Gäste" },
  { key: "contact_name", label: "Ansprechperson", type: "text", group: "Kontakt" },
  { key: "contact_phone", label: "Telefon", type: "text", group: "Kontakt" },
  { key: "contact_email", label: "E-Mail", type: "text", group: "Kontakt" },
];

export const SETTING_KEYS = SETTING_FIELDS.map((f) => f.key);
export const PLAN_SETTING_KEYS = ["budget_total"] as const;
export const ROLES = ["admin", "planer", "gast"] as const;
export const STATUSES = ["pending", "approved", "rejected"] as const;
