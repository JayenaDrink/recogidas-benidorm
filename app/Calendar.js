"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DOW, MON, NAME, PARENTS, addDays, coverage, indexRows, isoWeek, mondayOf, ymd,
} from "@/lib/calendar";

const REFRESH_MS = 20000;
// WhatsApp summary button: hidden for now. Set to true to bring it back.
const SHOW_WHATSAPP = false;

export default function Calendar() {
  const [me, setMe] = useState(null);
  const [data, setData] = useState(null); // {signups, nights}
  const [weeks, setWeeks] = useState(12);
  const [busy, setBusy] = useState(() => new Set());
  const [error, setError] = useState("");

  const today = useMemo(() => new Date(), []);
  const todayKey = ymd(today);
  // The list starts at the first week whose Tuesday hasn't passed yet: from Wednesday on, the current week is gone.
  const thisMon = useMemo(() => mondayOf(today), [today]);
  const startMon = useMemo(
    () => (ymd(addDays(thisMon, 1)) < ymd(today) ? addDays(thisMon, 7) : thisMon),
    [thisMon, today]
  );
  const firstLabel = startMon.getTime() === thisMon.getTime() ? "Esta semana" : "Próxima semana";

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
    post("/api/signup", { parent: me, dates: [date], going: !mine }, [date]);
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

  // Summary: the next pickup week (first Mon/Tue pair not yet past), plus the next uncovered night overall.
  let uncovered = 0, next = null, nextWeekLabel = "", waText = "";
  if (data) {
    let w0 = 0;
    while (ymd(addDays(startMon, 7 * w0 + 1)) < todayKey) w0++;
    const nm = addDays(startMon, 7 * w0), nt = addDays(nm, 1);
    nextWeekLabel = nm.getMonth() === nt.getMonth()
      ? `${nm.getDate()}–${nt.getDate()} ${MON[nt.getMonth()]}`
      : `${nm.getDate()} ${MON[nm.getMonth()]} – ${nt.getDate()} ${MON[nt.getMonth()]}`;
    for (let w = w0; w < w0 + weeks; w++) {
      const m = addDays(startMon, 7 * w);
      for (const d of [m, addDays(m, 1)]) {
        const k = ymd(d);
        if (k < todayKey) continue;
        const c = coverage(k, data.signups, data.nights).k;
        if (c === "partial" || c === "empty") {
          if (w === w0) uncovered += c === "partial" ? 1 : 2;
          next ||= d;
        }
      }
    }
    waText = weekMessage(nm, nt, nextWeekLabel, data);
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
        <div className="stat"><b>{data ? uncovered : "–"}</b><span>{`${uncovered === 1 ? "coche falta" : "coches faltan"} la próxima semana${data ? ` (${nextWeekLabel})` : ""}`}</span></div>
        <div className="stat">
          <b>{!data ? "–" : next ? `${DOW[next.getDay()]} ${next.getDate()} ${MON[next.getMonth()]}` : "Todo cubierto"}</b>
          <span>{!data || next ? "próxima noche pendiente" : "en las semanas que se ven"}</span>
        </div>
      </div>
      {SHOW_WHATSAPP && data && (
        <a className="btn wa" href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer">
          Enviar resumen al grupo de WhatsApp
        </a>
      )}

      <div className="weeks">
        {!data ? (
          <div className="empty-state">Cargando el calendario…</div>
        ) : (
          Array.from({ length: weeks }, (_, w) => {
            const m = addDays(startMon, 7 * w), t = addDays(m, 1);
            return (
              <Week key={ymd(m)} m={m} t={t} isNow={w === 0} firstLabel={firstLabel} {...{ data, me, todayKey, busy, toggle, switchCars, toggleOff }} />
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
          <li>Tierra lleva coche grande: si va él, esa noche está cubierta.</li>
          <li>Si no va Tierra hacen falta dos coches: Miguel con su esposa (2 coches) o dos padres con un coche cada uno.</li>
          <li>"Sin recogida" marca una noche sin traslado (festivo, sin clase…).</li>
        </ul>
      </details>
    </>
  );
}

function Week({ m, t, isNow, firstLabel, data, me, todayKey, ...rest }) {
  const kt = ymd(t);
  const past = kt < todayKey;
  const range = m.getMonth() === t.getMonth()
    ? `${m.getDate()}–${t.getDate()} ${MON[t.getMonth()]}`
    : `${m.getDate()} ${MON[m.getMonth()]} – ${t.getDate()} ${MON[t.getMonth()]}`;
  const weekLabel = isNow ? firstLabel : `Semana ${isoWeek(m)}`;
  return (
    <section className={`week${past ? " past" : ""}${isNow ? " now" : ""}`}>
      <div className="whead">
        <h2>{range}</h2>
        <span className="wtag">{weekLabel}</span>
      </div>
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
        {can && cov.k !== "off" && (mine || cov.k !== "ok") && (
          <button className={`btn${mine ? " ghost" : ""}`} type="button" disabled={isBusy} onClick={() => toggle(k)}>
            {mine ? "Ya no voy" : "Voy yo"}
          </button>
        )}
        {can && !mine && cov.k === "ok" && <span className="full">Completa</span>}
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

const APP_URL = "https://recogidas-benidorm.vercel.app";

// Plain-text weekly summary for the WhatsApp group.
function weekMessage(m, t, label, data) {
  const lines = [`🚗 Recogidas Benidorm · ${label}`, ""];
  for (const d of [m, t]) {
    const k = ymd(d);
    const day = `${d.getDay() === 1 ? "Lunes" : "Martes"} ${d.getDate()}`;
    const cov = coverage(k, data.signups, data.nights);
    const g = data.signups[k] || {};
    const who = Object.keys(g)
      .sort((a, b) => g[a].at - g[b].at)
      .map((id) => (id === "miguel" && g[id].cars > 1 ? "Miguel (2 coches)" : NAME[id] || id))
      .join(", ");
    if (cov.k === "off") lines.push(`➖ ${day}: no hay recogida`);
    else if (cov.k === "ok") lines.push(`✅ ${day}: ${who}`);
    else if (cov.k === "partial") lines.push(`⚠️ ${day}: ${who} · falta 1 coche`);
    else lines.push(`❌ ${day}: nadie apuntado · faltan 2 coches`);
  }
  lines.push("", `Apúntate aquí: ${APP_URL}`);
  return lines.join("\n");
}
