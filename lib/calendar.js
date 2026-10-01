// Calendar maths shared by the page (and later by notifications).
export const PARENTS = [
  { id: "miguel", name: "Miguel", hint: "Por defecto vas con 2 coches (con tu esposa). En cada noche puedes cambiarlo a 1." },
  { id: "tierra", name: "Tierra", hint: "Llevas coche grande: si vas tú, esa noche queda cubierta." },
  { id: "jaime", name: "Jaime", hint: "Cuentas como 1 coche." },
  { id: "nick", name: "Nick", hint: "Cuentas como 1 coche." },
];
export const NAME = Object.fromEntries(PARENTS.map((p) => [p.id, p.name]));
export const DOW = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
export const MON = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const pad = (n) => String(n).padStart(2, "0");
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const fromYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return addDays(x, -((x.getDay() + 6) % 7));
}
export function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y) / 864e5 + 1) / 7);
}

// signups: { [date]: { [parent]: {cars, at} } }, nights: { [date]: true }
export function coverage(date, signups, nights) {
  if (nights[date]) return { k: "off", t: "Sin recogida" };
  const g = signups[date] || {};
  if (g.tierra) return { k: "ok", t: "Cubierta" };
  const cars = Object.values(g).reduce((s, v) => s + (v.cars || 1), 0);
  if (cars >= 2) return { k: "ok", t: "Cubierta" };
  if (cars === 1) return { k: "partial", t: "Falta 1 coche" };
  return { k: "empty", t: "Faltan 2 coches" };
}

export function indexRows(rows) {
  const signups = {};
  for (const r of rows.signups || []) {
    (signups[r.date] ||= {})[r.parent] = { cars: r.cars || 1, at: Date.parse(r.created_at) || 0 };
  }
  const nights = {};
  for (const r of rows.nights || []) if (r.off) nights[r.date] = true;
  return { signups, nights };
}
