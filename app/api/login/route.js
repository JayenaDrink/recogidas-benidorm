import { cookies } from "next/headers";
import { COOKIE, authToken, codeMatches, json } from "@/lib/server";

export async function POST(req) {
  const { code } = await req.json().catch(() => ({}));
  if (!process.env.GROUP_CODE) return json({ error: "La app no tiene código de grupo configurado." }, 500);
  if (!codeMatches(code)) return json({ error: "Código incorrecto." }, 401);
  const jar = await cookies();
  jar.set(COOKIE, authToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(COOKIE);
  return json({ ok: true });
}
