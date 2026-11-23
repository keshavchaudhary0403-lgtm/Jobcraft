// Create the first admin user. Reads .env.local.
// Run in a real terminal (macOS Terminal app):  npm run create-admin
// Name/email/phone can also be passed as flags:
//   npm run create-admin -- --name "Keshav" --phone 9876543210 --email you@example.com
// The password is always asked for, hidden, so it never lands in shell history.
import { createClient } from "@supabase/supabase-js";
import readline from "node:readline";

process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Fill NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first");

const flag = (n) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] ?? "" : null;
};
if (!process.stdin.isTTY) {
  console.error("\nThis needs a real terminal to type the password.\nOpen the Terminal app and run:\n\n  cd ~/Desktop/jobcraft && npm run create-admin\n");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));
const askHidden = (q) =>
  new Promise((r) => {
    process.stdout.write(q);
    rl._writeToOutput = () => {};
    rl.question("", (a) => {
      rl._writeToOutput = (s) => process.stdout.write(s);
      process.stdout.write("\n");
      r(a);
    });
  });

const name = (flag("name") ?? (await ask("Full name: "))).trim();
const email = (flag("email") ?? (await ask("Email (optional, Enter to skip): "))).trim().toLowerCase();
let phone = (flag("phone") ?? (await ask("Phone (optional, Enter to skip): "))).replace(/\D/g, "").replace(/^0+/, "");
if (phone.length === 10) phone = `91${phone}`;
const password = await askHidden("Password (min 6 chars, hidden): ");
rl.close();
if (!email && !phone) throw new Error("Need an email or a phone");
if (password.length < 6) throw new Error("Password too short");

const admin = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await admin.auth.admin.createUser({
  email: email || `${phone}@phone.jobcraft.invalid`,
  password,
  email_confirm: true,
  user_metadata: { full_name: name, phone: phone || null },
});
if (error) throw error;
const { error: pErr } = await admin
  .from("profiles")
  .upsert({ id: data.user.id, full_name: name || null, email: email || null, phone: phone || null, is_admin: true });
if (pErr) throw pErr;
console.log(`✓ Admin created. Log in with ${phone ? "+" + phone : email}`);
