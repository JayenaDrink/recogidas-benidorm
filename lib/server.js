import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const PARENTS = ["miguel", "tierra", "jaime", "nick"];
export const COOKIE = "rb_auth";

let client;
export function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

function token(code) {
  return createHash("sha256").update("recogidas-benidorm:" + code).digest("hex");
}

export function codeMatches(code) {
  const expected = process.env.GROUP_CODE || "";
  if (!expected || typeof code !== "string") return false;
  const a = Buffer.from(token(code.trim()));
  const b = Buffer.from(token(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authToken() {
  return token(process.env.GROUP_CODE || "");
}

export async function isAuthed() {
  if (!process.env.GROUP_CODE) return false;
  const jar = await cookies();
  return jar.get(COOKIE)?.value === authToken();
}

// "YYYY-MM-DD" that falls on a Monday or Tuesday.
export function validNight(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date + "T12:00:00Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) return false;
  const dow = d.getUTCDay();
  return dow === 1 || dow === 2;
}

export function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
