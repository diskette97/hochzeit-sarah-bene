// Legt (oder aktualisiert) einen freigeschalteten Admin an – der einzige Weg zu einem Admin-Konto.
// Aufruf: node --env-file-if-exists=.env.local scripts/create-admin.mjs <email> "<Name>"
// Das Passwort wird abgefragt (nicht als Argument, damit es nicht im Shell-Verlauf landet).
// Für Automatisierung: Umgebungsvariable ADMIN_PASSWORD.
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { createInterface } from "node:readline";
import pg from "pg";

const [email, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(" ").trim();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2) {
  console.error('Aufruf: create-admin.mjs <email> "<Name>"');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL fehlt.");
  process.exit(1);
}

async function askPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl._writeToOutput = (s) => { if (s.includes("Passwort")) rl.output.write(s); };
  const pw = await new Promise((res) => rl.question("Passwort (mind. 8 Zeichen): ", res));
  rl.close();
  console.log();
  return pw;
}

const password = await askPassword();
if (password.length < 8 || password.length > 200) {
  console.error("Das Passwort muss 8 bis 200 Zeichen haben.");
  process.exit(1);
}
const salt = randomBytes(16);
const key = await promisify(scrypt)(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const hash = `scrypt$16384$${salt.toString("base64")}$${key.toString("base64")}`;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const r = await client.query(
    `insert into users (email, full_name, password_hash, role, status) values ($1, $2, $3, 'admin', 'approved')
     on conflict ((lower(email))) do update set password_hash = excluded.password_hash, role = 'admin', status = 'approved', full_name = excluded.full_name
     returning id`,
    [email.normalize("NFC").trim().toLowerCase(), name, hash], // gleiche Schreibweise wie normalizeEmail() in lib/password.ts
  );
  await client.query("delete from sessions where user_id = $1", [r.rows[0].id]);
  console.log(`Admin ${email} ist angelegt/aktualisiert.`);
} finally {
  await client.end();
}
