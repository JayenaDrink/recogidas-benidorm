import { PARENTS, db, isAuthed, json, validNight } from "@/lib/server";

// POST { parent, dates: ["2026-10-05", ...], going: true|false, cars?: 1|2 }
export async function POST(req) {
  if (!(await isAuthed())) return json({ error: "auth" }, 401);
  const body = await req.json().catch(() => ({}));
  const { parent, dates, going } = body;
  if (!PARENTS.includes(parent)) return json({ error: "Padre desconocido." }, 400);
  if (!Array.isArray(dates) || dates.length < 1 || dates.length > 2 || !dates.every(validNight))
    return json({ error: "Solo se puede apuntar a lunes o martes." }, 400);

  if (going) {
    const cars = parent === "miguel" ? (body.cars === 1 ? 1 : 2) : 1;
    const rows = dates.map((date) => ({ date, parent, cars }));
    const { error } = await db().from("signups").upsert(rows, { onConflict: "date,parent" });
    if (error) return json({ error: "No se pudo guardar." }, 500);
  } else {
    const { error } = await db().from("signups").delete().eq("parent", parent).in("date", dates);
    if (error) return json({ error: "No se pudo guardar." }, 500);
  }
  return json({ ok: true });
}
