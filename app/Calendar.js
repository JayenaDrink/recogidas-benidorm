"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DOW, MON, NAME, PARENTS, addDays, coverage, fromYmd, indexRows, isoWeek, mondayOf, ymd,
} from "@/lib/calendar";

const REFRESH_MS = 20000;

export default function Calendar() {
  const [me, setMe] = useState(null);
  const [data, setData] = useState(null); // {signups, nights}
  const [weeks, setWeeks] = useState(12);
  const [busy, setBusy] = useState(() => new Set());
  const [error, setError] = useState("");

  const today = useMemo(() => new Date(), []);
  const todayKey = ymd(today);
  const startMon = useMemo(() => mondayOf(today), [today]);

  useEffect(() => {
    try { setMe(localStorage.getItem("rb_me")); } catch {}
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/data", { cache: "no-store" });
      if (r.status === 401) return window.location.reload();
      if (!r.ok) throw new Error();
      setData(indexRows(await r.json()));
    } catch {
      setError("No se pudo cargar el calendario. Revisa la conexión.");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, REFRESH_MS);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [load]);

  function pickMe(id) {
    setMe(id);
    try { localStorage.setItem("rb_me", id); } catch {}
  }

  async function post(url, body, keys) {
    setBusy((b) => new Set([...b, ...keys]));
    setError("");
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.status === 401) return window.location.reload();
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error || "No se pudo guardar el cambio.");
      }
      await load();
    } catch {
      setError("No se pudo guardar el cambio. Revisa la conexión y vuelve a intentarlo.");
    } finally {
      setBusy((b) => { const n = new Set(b); keys.forEach((k) => n.delete(k)); return n; });
    }
  }

  function toggle(date) {
    const mine = !!data.signups[date]?.[me];
    let dates = [date];
    if (me === "tierra") {
      const m = mondayOf(fromYmd(date));
      dates = [ymd(m), ymd(addDays(m, 1))].filter((k) => k >= todayKey && !data.nights[k]);
    }
    post("/api/signup", { parent: me, dates, going: !mine }, dates);
  }

  function switchCars(date) {
    const mine = data.signups[date]?.[me];
    if (!mine) return;
    post("/api/signup", { parent: me, dates: [date], going: true, cars: mine.cars > 1 ? 1 : 2 }, [date]);
  }

  function toggleOff(date) {
    post("/api/night", { date, off: !data.nights[date], by: me }, [date]);
  }

  const meInfo = PARENTS.find((p) => p.id === me);

  // Summary: next 4 weeks
  let uncovered = 0, next = null;
  if (data) {
    for (let w = 0; w < 4; w++) {
      const m = addDays(startMon, 7 * w);
      for (const d of [m, addDays(m, 1)]) {
        const k = ymd(d);
        if (k < todayKey) continue;
        const c = coverage(k, data.signups, data.nights).k;
        if (c === "partial" || c === "empty") { uncovered++; next ||= d; }
      }
    }
  }

  return (
    <>
      <div className="me">
        <span className="label">¿Quién eres?</span>
        <div className="chips">
          {PARENTS.map((p) => (
            <button key={p.id} className="chip" type="button" aria-pressed={me === p.id} onClick={() => pickMe(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
        <p className="hint">{meInfo ? meInfo.hint : "Elige tu nombre para apuntarte."}</p>
      </div>

      {error && <div className="banner err">{error}</div>}

      <div className="summary">
        <div className="stat"><b>{data ? uncovered : "–"}</b><span>noches sin cubrir en las próximas 4 semanas</span></div>
        <div className="stat">
          <b>{!data ? "–" : next ? `${DOW[next.getDay()]} ${next.getDate()} ${MON[next.getMonth()]}` : "Todo cubierto"}</b>
          <span>{!data || next ? "próxima noche pendiente" : "en las próximas 4 semanas"}</span>
        </div>
      </div>

      <div className="weeks">
        {!data ? (
          <div className="empty-state">Cargando el calendario…</div>
        ) : (
          Array.from({ length: weeks }, (_, w) => {
            const m = addDays(startMon, 7 * w), t = addDays(m, 1);
            return (
              <Week key={ymd(m)} m={m} t={t} isNow={w === 0} {...{ data, me, todayKey, busy, toggle, switchCars, toggleOff }} />
            );
          })
        )}
      </div>
      {data && (
        <button className="btn ghost more" type="button" onClick={() => setWeeks((n) => n + 8)}>
          Ver 8 semanas más
        </button>
      )}

      <details className="rules">
        <summary>Cómo se cuenta una noche cubierta</summary>
        <ul>
          <li>Tierra lleva coche grande: si va él, la noche está cubierta. Suele ir lunes y martes de la misma semana, una semana sí y otra no.</li>
          <li>Si no va Tierra hacen falta dos coches: Miguel con su esposa (2 coches) o dos padres con un coche cada uno.</li>
          <li>"Sin recogida" marca una noche sin traslado (festivo, sin clase…).</li>
        </ul>
      </details>
    </>
  );
}

function Week({ m, t, isNow, data, me, todayKey, ...rest }) {
  const km = ymd(m), kt = ymd(t);
  const { signups, nights } = data;
  const tm = !!signups[km]?.tierra, tt = !!signups[kt]?.tierra;
  const tPrev = !!(signups[ymd(addDays(m, -7))]?.tierra || signups[ymd(addDays(m, -6))]?.tierra);
  const warns = [];
  if (tm !== tt && !nights[km] && !nights[kt]) warns.push("Tierra solo está apuntado un día de esta semana.");
  if ((tm || tt) && tPrev) warns.push("Tierra también va la semana anterior (normalmente va una sí y otra no).");
  const past = kt < todayKey;
  return (
    <section className={`week${past ? " past" : ""}${isNow ? " now" : ""}`}>
      <div className="whead">
        <h2>{isNow ? "Esta semana" : `Semana ${isoWeek(m)}`}</h2>
        <span className={`wtag${tm || tt ? " tierra" : ""}`}>
          {tm || tt ? "Semana de Tierra" : `${m.getDate()}–${t.getDate()} ${MON[t.getMonth()]}`}
        </span>
      </div>
      {warns.length > 0 && <div className="warns">{warns.map((x) => <p key={x}>{x}</p>)}</div>}
      <Night d={m} {...{ data, me, todayKey, ...rest }} />
      <Night d={t} {...{ data, me, todayKey, ...rest }} />
    </section>
  );
}

function Night({ d, data, me, todayKey, busy, toggle, switchCars, toggleOff }) {
  const k = ymd(d);
  const past = k < todayKey;
  const cov = coverage(k, data.signups, data.nights);
  const g = data.signups[k] || {};
  const mine = me && g[me];
  const can = !!me && !past;
  const isBusy = busy.has(k);
  const who = Object.keys(g).sort((a, b) => g[a].at - g[b].at);
  return (
    <div className="night">
      <div className="day">{DOW[d.getDay()]}<small>{d.getDate()} {MON[d.getMonth()]}</small></div>
      <div className="mid">
        <span className={`pill ${cov.k}`}>{cov.t}</span>
        {who.length > 0 && (
          <div className="who">
            {who.map((id) => (
              <span key={id} className={id === me ? "mine" : ""}>
                {NAME[id] || id}
                <em>{id === "tierra" ? " · coche grande" : g[id].cars > 1 ? ` · ${g[id].cars} coches` : ""}</em>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="acts">
        {can && cov.k !== "off" && (
          <button className={`btn${mine ? " ghost" : ""}`} type="button" disabled={isBusy} onClick={() => toggle(k)}>
            {mine ? "Ya no voy" : me === "tierra" ? "Voy esta semana" : "Voy yo"}
          </button>
        )}
        {can && mine && me === "miguel" && (
          <button className="link" type="button" disabled={isBusy} onClick={() => switchCars(k)}>
            {mine.cars > 1 ? "Ir con 1 coche" : "Ir con 2 coches"}
          </button>
        )}
        {can && (
          <button className="link" type="button" disabled={isBusy} onClick={() => toggleOff(k)}>
            {cov.k === "off" ? "Sí hay recogida" : "Sin recogida"}
          </button>
        )}
      </div>
    </div>
  );
}
