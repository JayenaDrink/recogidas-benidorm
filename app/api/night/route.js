import { PARENTS, db, isAuthed, json, validNight } from "@/lib/server";

// POST { date, off: true|false, by }
export async function POST(req) {
  if (!(await isAuthed())) return json({ error: "auth" }, 401);
  const { date, off, by } = await req.json().catch(() => ({}));
  if (!validNight(date)) return json({ error: "Fecha no válida." }, 400);
  const marked_by = PARENTS.includes(by) ? by : null;
  const q = off
    ? db().from("nights").upsert({ date, off: true, marked_by }, { onConflict: "date" })
    : db().from("nights").delete().eq("date", date);
  const { error } = await q;
  if (error) return json({ error: "No se pudo guardar." }, 500);
  return json({ ok: true });
}
