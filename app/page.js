import { isAuthed } from "@/lib/server";
import Calendar from "./Calendar";
import Login from "./Login";

export const dynamic = "force-dynamic";

export default async function Page() {
  const authed = await isAuthed();
  return (
    <main className="wrap">
      <header>
        <h1>Recogidas Benidorm</h1>
        <p className="sub">Lunes y martes por la noche. Cada uno se apunta a las noches que va.</p>
      </header>
      {authed ? <Calendar /> : <Login />}
    </main>
  );
}
