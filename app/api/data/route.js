import { db, isAuthed, json } from "@/lib/server";

export const dynamic = "force-dynamic";

// Everything from 4 weeks ago onward: enough for the calendar and the "Tierra last week" check.
export async function GET() {
  if (!(await isAuthed())) return json({ error: "auth" }, 401);
  const from = new Date(Date.now() - 35 * 864e5).toISOString().slice(0, 10);
  const [s, n] = await Promise.all([
    db().from("signups").select("date,parent,cars,created_at").gte("date", from),
    db().from("nights").select("date,off").gte("date", from),
  ]);
  if (s.error || n.error) return json({ error: "No se pudo leer el calendario." }, 500);
  return json({ signups: s.data, nights: n.data });
}
