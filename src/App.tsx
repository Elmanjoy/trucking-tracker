import { useState } from "react";

/* ─── Persistence ──────────────────────────────────────── */
function loadData(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function saveData(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

const DEFAULTS = {
  truckRental: 1000, checkPack: 25, logbook: 30,
  parking: 350, occIns: 160, ifta: 75,
  inspection: 200, dispatch: 22, amort: 0.16,
};

const fmtMoney = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (n) => "$" + fmtMoney(Math.abs(n));
const moneySign = (n) => (n >= 0 ? "+$" : "-$") + fmtMoney(Math.abs(n));

const TRIP_NUMS = Array.from({ length: 100 }, (_, i) => `Trip ${i + 1}`);

function emptyTrip() { return { loads: [], fuels: [], mileage: [] }; }
function loadTrips() { return loadData("tripProfiles", {}); }
function saveTrips(t) { saveData("tripProfiles", t); }

/* ─── Icons ────────────────────────────────────────────── */
const Ic = {
  calc: (s = 22) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="3"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="12" x2="9" y2="12"/><line x1="12" y1="12" x2="12" y2="12"/><line x1="15" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="9" y2="16"/><line x1="12" y1="16" x2="12" y2="16"/><line x1="15" y1="16" x2="15" y2="16"/></svg>,
  box: (s = 22) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/></svg>,
  fuel: (s = 22) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="9" height="18" rx="2"/><line x1="4" y1="9" x2="13" y2="9"/><path d="M13 8h3a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-2.5-2.5"/></svg>,
  road: (s = 22) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3 5 21"/><path d="M16 3l3 18"/><line x1="12" y1="4" x2="12" y2="6"/><line x1="12" y1="11" x2="12" y2="13"/><line x1="12" y1="18" x2="12" y2="20"/></svg>,
  truck: (s = 22) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a1 1 0 0 1 1-1h9v10H3z"/><path d="M13 9h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/><path d="M3 16h2M9 16h6"/></svg>,
  gear: (s = 20) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  plus: (s = 20) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  bell: (s = 20) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>,
  chevDown: (s = 16) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>,
  chevRight: (s = 16) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>,
  pin: (s = 16) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="2.6"/></svg>,
  trash: (s = 16) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></svg>,
  check: (s = 14) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  back: (s = 20) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>,
};

/* ─── Design-system primitives ─────────────────────────── */
function Card({ children, style = {}, pad = true, accent = false, onClick }: any) {
  return (
    <div onClick={onClick} style={{
      background: accent ? "var(--accent)" : "var(--surface)",
      border: accent ? "none" : "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: pad ? "var(--pad)" : 0,
      boxShadow: accent
        ? "0 10px 26px -12px rgba(244,112,35,0.55)"
        : "0 1px 0 rgba(255,255,255,0.02) inset",
      ...style,
    }}>{children}</div>
  );
}

function Label({ children, color = "var(--text-faint)", style = {} }: any) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase" as const, color, ...style }}>
      {children}
    </div>
  );
}

function Pill({ children, tone = "neutral", style = {} }: any) {
  const tones: any = {
    accent: { bg: "var(--accent-soft)", fg: "var(--accent)" },
    green:  { bg: "var(--green-soft)", fg: "var(--green)" },
    red:    { bg: "var(--red-soft)", fg: "var(--red)" },
    neutral:{ bg: "rgba(255,255,255,0.07)", fg: "var(--text-dim)" },
    onAccent:{ bg: "rgba(255,255,255,0.22)", fg: "#fff" },
    blue:   { bg: "rgba(90,169,240,0.13)", fg: "var(--blue)" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: t.bg, color: t.fg,
      fontSize: 12, fontWeight: 700, letterSpacing: 0.2,
      padding: "5px 11px", borderRadius: 999, lineHeight: 1, whiteSpace: "nowrap" as const,
      ...style,
    }}>{children}</span>
  );
}

function Field({ label, unit, unitTone = "accent", value, onChange, placeholder, type = "text", style = {} }: any) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ minWidth: 0, ...style }}>
      {label && <Label style={{ marginBottom: 8 }}>{label}</Label>}
      <div style={{
        display: "flex", alignItems: "stretch",
        background: "var(--surface-2)",
        border: `1.5px solid ${focus ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "var(--radius-sm)", overflow: "hidden",
        transition: "border-color .15s",
      }}>
        {unit && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            minWidth: 42, padding: "0 10px", flexShrink: 0,
            borderRight: "1px solid var(--border)",
            color: unitTone === "accent" ? "var(--accent)" : "var(--text-dim)",
            fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 12,
            background: "rgba(0,0,0,0.18)",
          }}>{unit}</div>
        )}
        <input
          value={value}
          onChange={e => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1, width: "100%", minWidth: 0, border: "none", background: "transparent",
            color: "var(--text)", fontSize: 15, fontWeight: 500,
            padding: "14px 12px", outline: "none", fontFamily: "var(--font)",
          }}
        />
      </div>
    </div>
  );
}

function PrimaryBtn({ children, onClick, icon, style = {}, disabled = false }: any) {
  const [press, setPress] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)} onMouseLeave={() => setPress(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
        width: "100%", border: "none", cursor: disabled ? "default" : "pointer",
        background: press ? "var(--accent-press)" : "var(--accent)",
        color: "#fff", fontWeight: 800, fontSize: 15, letterSpacing: 0.3,
        padding: "16px", borderRadius: "var(--radius-sm)",
        boxShadow: "0 8px 20px -8px rgba(244,112,35,0.6)",
        transform: press ? "scale(0.985)" : "none", transition: "transform .1s, background .1s",
        opacity: disabled ? 0.45 : 1, fontFamily: "var(--font)",
        ...style,
      }}>{icon}{children}</button>
  );
}

function GhostBtn({ children, onClick, style = {} }: any) {
  return (
    <button onClick={onClick} style={{
      border: "1px solid var(--border-strong)", cursor: "pointer",
      background: "transparent", color: "var(--text-dim)",
      fontWeight: 700, fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" as const,
      padding: "0 18px", borderRadius: "var(--radius-sm)", fontFamily: "var(--font)",
      ...style,
    }}>{children}</button>
  );
}

function IconBtn({ children, onClick, size = 42, style = {} }: any) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: 999, border: "1px solid var(--border)", cursor: "pointer",
      background: "var(--surface-2)", color: "var(--text)", ...style,
    }}>{children}</button>
  );
}

function StatCard({ label, value, tone = "text", accentBorder = false }: any) {
  const colors: any = { text: "var(--text)", green: "var(--green)", red: "var(--red)", blue: "var(--blue)", accent: "var(--accent)" };
  return (
    <div style={{
      background: "var(--surface)", borderRadius: "var(--radius-sm)",
      border: accentBorder ? "1.5px solid var(--accent)" : "1px solid var(--border)",
      padding: "15px 16px", flex: 1, minWidth: 0,
    }}>
      <Label style={{ marginBottom: 8 }}>{label}</Label>
      <div style={{ fontSize: 22, fontWeight: 800, color: colors[tone] || colors.text, letterSpacing: -0.5 }}>{value}</div>
    </div>
  );
}

function Empty({ children }: any) {
  return (
    <Card style={{ borderStyle: "dashed", borderColor: "var(--border-strong)", textAlign: "center", padding: "30px 18px" }}>
      <div style={{ color: "var(--text-faint)", fontSize: 14, fontWeight: 500 }}>{children}</div>
    </Card>
  );
}

function TopBar({ title, subtitle, right, onBack }: any) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {onBack && (
          <IconBtn onClick={onBack} size={38} style={{ flexShrink: 0 }}>{Ic.back(18)}</IconBtn>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: -0.6, color: "var(--text)", lineHeight: 1.1 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 5, fontWeight: 500 }}>{subtitle}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

function TripSelectorDropdown({ value, onChange }: any) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, position: "relative", zIndex: 30 }}>
      <Label color="var(--accent)" style={{ flexShrink: 0 }}>Trip #</Label>
      <div style={{ flex: 1, position: "relative" }}>
        <button onClick={() => setOpen(o => !o)} style={{
          width: "100%", cursor: "pointer", textAlign: "left" as const,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--surface-2)",
          border: `1.5px solid ${open ? "var(--accent)" : "var(--border)"}`,
          color: "var(--text)", fontWeight: 700, fontSize: 15,
          padding: "12px 14px", borderRadius: "var(--radius-sm)",
          transition: "border-color .15s", fontFamily: "var(--font)",
        }}>
          <span>{value}</span>
          <span style={{ color: "var(--accent)", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", display: "flex" }}>{Ic.chevDown(18)}</span>
        </button>
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
              background: "var(--surface)", border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-sm)", maxHeight: 260, overflowY: "auto" as const,
              boxShadow: "0 22px 50px -16px rgba(0,0,0,0.8)", padding: 6,
              scrollbarWidth: "none" as const,
            }}>
              {TRIP_NUMS.map(t => {
                const on = t === value;
                return (
                  <button key={t} onClick={() => { onChange(t); setOpen(false); }} style={{
                    width: "100%", cursor: "pointer", textAlign: "left" as const, border: "none",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: on ? "var(--accent-soft)" : "transparent",
                    color: on ? "var(--accent)" : "var(--text)",
                    fontWeight: on ? 800 : 600, fontSize: 14.5,
                    padding: "11px 12px", borderRadius: 10, fontFamily: "var(--font)",
                  }}>
                    <span>{t}</span>
                    {on && <span style={{ display: "flex" }}>{Ic.check(14)}</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BottomNav({ tab, setTab }: any) {
  const tabs = [
    { key: "calc",    label: "Calc",    icon: Ic.calc },
    { key: "loads",   label: "Loads",   icon: Ic.box },
    { key: "fuel",    label: "Fuel",    icon: Ic.fuel },
    { key: "mileage", label: "Mileage", icon: Ic.road },
    { key: "trips",   label: "Trips",   icon: Ic.truck },
  ];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 14px 22px", zIndex: 40, pointerEvents: "none" }}>
      <div style={{
        pointerEvents: "auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(28,29,33,0.88)",
        backdropFilter: "blur(22px) saturate(160%)",
        border: "1px solid var(--border-strong)",
        borderRadius: 26, padding: "8px 10px",
        boxShadow: "0 18px 40px -16px rgba(0,0,0,0.7)",
      }}>
        {tabs.map(({ key, label, icon }) => {
          const on = key === tab;
          return (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, cursor: "pointer", border: "none", background: "transparent",
              display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4,
              padding: "8px 2px 6px",
            }}>
              <div style={{
                color: on ? "#fff" : "var(--text-faint)",
                background: on ? "var(--accent)" : "transparent",
                width: 40, height: 32, borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: on ? "0 6px 14px -6px rgba(244,112,35,0.8)" : "none",
                transition: "all .18s",
              }}>{icon(20)}</div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.2, color: on ? "var(--text)" : "var(--text-faint)" }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Calculator ───────────────────────────────────────── */
function Calculator() {
  const [cfg, setCfg] = useState(() => loadData("truckerCosts", DEFAULTS));
  const [screen, setScreen] = useState(() => localStorage.getItem("truckerCosts") ? "calc" : "setup");
  const [miles, setMiles] = useState("");
  const [gross, setGross] = useState("");
  const [fuel, setFuel] = useState("");
  const [result, setResult] = useState<any>(null);
  const [setupVals, setSetupVals] = useState({ ...DEFAULTS });
  const [cfgVals, setCfgVals] = useState({ ...DEFAULTS });

  function setupSave() {
    const newCfg: any = Object.fromEntries(Object.keys(DEFAULTS).map(k => [k, parseFloat(setupVals[k]) || DEFAULTS[k]]));
    setCfg(newCfg); saveData("truckerCosts", newCfg); setScreen("calc");
  }
  function saveSettings() {
    const newCfg: any = Object.fromEntries(Object.keys(DEFAULTS).map(k => [k, parseFloat(cfgVals[k]) || cfg[k]]));
    setCfg(newCfg); saveData("truckerCosts", newCfg); setScreen("calc");
  }

  function calculate() {
    const mi = parseFloat(miles), gr = parseFloat(gross), fu = parseFloat(fuel);
    if (isNaN(mi) || isNaN(gr) || isNaN(fu)) return;
    const dispatchFee = gr * (cfg.dispatch / 100);
    const amortCost = mi * cfg.amort;
    const fixedTotal = cfg.truckRental + cfg.checkPack + cfg.logbook + cfg.parking / 4.33 + cfg.occIns / 4.33 + cfg.ifta / 13 + cfg.inspection / 8.67;
    const totalCosts = fixedTotal + dispatchFee + amortCost + fu;
    const net = gr - totalCosts;
    const dpm = mi > 0 ? net / mi : 0;
    const fuelPct = gr > 0 ? (fu / gr) * 100 : 0;
    setResult({ net, dpm, gross: gr, fuel: fu, miles: mi, totalCosts, fuelPct,
      lines: [
        { label: "Weekly Fixed Costs", amt: fixedTotal },
        { label: `Dispatch & Ins. (${cfg.dispatch}%)`, amt: dispatchFee },
        { label: `Amortization ($${cfg.amort}/mi)`, amt: amortCost },
        { label: "Fuel", amt: fu },
      ]
    });
  }

  const cfgFields = [
    { group: "Weekly Costs" },
    { key: "truckRental", label: "Truck Rental", prefix: "$" },
    { key: "checkPack", label: "TripPak", prefix: "$" },
    { key: "logbook", label: "Logbook Fee", prefix: "$" },
    { group: "Monthly Costs" },
    { key: "parking", label: "Truck Parking", prefix: "$" },
    { key: "occIns", label: "Occupational Insurance", prefix: "$" },
    { group: "Quarterly" },
    { key: "ifta", label: "IFTA Tax", prefix: "$" },
    { group: "Bi-Monthly" },
    { key: "inspection", label: "Inspection Fee", prefix: "$" },
    { group: "Rates" },
    { key: "dispatch", label: "Dispatch & Insurance", prefix: "%" },
    { key: "amort", label: "Amortization (per mile)", prefix: "$" },
  ];

  function renderFields(vals, setVals) {
    return cfgFields.map((f: any, i) =>
      f.group ? <Label key={i} color="var(--accent)" style={{ marginTop: 16, marginBottom: 8 }}>{f.group}</Label> : (
        <Field key={f.key} label={f.label} unit={f.prefix} value={vals[f.key]}
          onChange={(v) => setVals((prev: any) => ({ ...prev, [f.key]: v }))}
          placeholder={String(DEFAULTS[f.key])} type="number" />
      )
    );
  }

  if (screen === "setup") return (
    <div>
      <TopBar title="First Time Setup" subtitle="Enter your fixed cost rates" />
      <Card><div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{renderFields(setupVals, setSetupVals)}</div></Card>
      <div style={{ marginTop: 14 }}><PrimaryBtn onClick={setupSave}>SAVE & START →</PrimaryBtn></div>
    </div>
  );

  if (screen === "settings") return (
    <div>
      <TopBar title="Settings" subtitle="Update your fixed costs" onBack={() => setScreen("calc")} />
      <Card><div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{renderFields(cfgVals, setCfgVals)}</div></Card>
      <div style={{ marginTop: 14 }}><PrimaryBtn onClick={saveSettings}>SAVE CHANGES</PrimaryBtn></div>
    </div>
  );

  return (
    <div>
      <TopBar
        title="Weekly Profit"
        subtitle="Quick calculator — not saved to trips"
        right={<IconBtn onClick={() => { setCfgVals({ ...cfg }); setScreen("settings"); }}>{Ic.gear(19)}</IconBtn>}
      />
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Miles Driven" unit="MI" unitTone="dim" type="number" value={miles} onChange={setMiles} placeholder="e.g. 2,500" />
          <Field label="Gross Earnings" unit="$" type="number" value={gross} onChange={setGross} placeholder="e.g. 4,200" />
          <Field label="Fuel Spent (total)" unit="$" type="number" value={fuel} onChange={setFuel} placeholder="e.g. 800" />
          <div style={{ display: "flex", gap: 10 }}>
            <PrimaryBtn onClick={calculate} icon={Ic.calc(18)}>CALCULATE</PrimaryBtn>
            {result && <GhostBtn onClick={() => { setResult(null); setMiles(""); setGross(""); setFuel(""); }} style={{ height: "auto" }}>Reset</GhostBtn>}
          </div>
        </div>
      </Card>

      {result && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <Card accent>
            <Label color="rgba(255,255,255,0.7)">Net Profit</Label>
            <div style={{ fontSize: 38, fontWeight: 800, color: "#fff", letterSpacing: -1, marginTop: 4 }}>
              {money(result.net)}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <Pill tone="onAccent">{moneySign(result.dpm)}/mi</Pill>
              <Pill tone="onAccent">Fuel {result.fuelPct.toFixed(0)}% of gross</Pill>
            </div>
          </Card>
          <div style={{ display: "flex", gap: 12 }}>
            <StatCard label="Gross" value={money(result.gross)} tone="green" />
            <StatCard label="Fuel" value={money(result.fuel)} tone="red" />
          </div>
          <Card>
            <Label style={{ marginBottom: 12 }}>Cost Breakdown</Label>
            <div style={{ borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border)" }}>
              {result.lines.map((ln, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "13px 14px", background: i % 2 ? "transparent" : "rgba(255,255,255,0.018)",
                  borderTop: i ? "1px solid var(--border)" : "none",
                }}>
                  <span style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 500 }}>{ln.label}</span>
                  <span style={{ fontSize: 14, color: "var(--red)", fontWeight: 700 }}>-{money(ln.amt)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ─── Load Tracker ─────────────────────────────────────── */
function LoadTracker({ activeTrip, setActiveTrip, trips, setTrips }: any) {
  const trip = trips[activeTrip] || emptyTrip();
  const loads = trip.loads || [];
  const [fromCity, setFromCity] = useState("");
  const [fromState, setFromState] = useState("");
  const [toCity, setToCity] = useState("");
  const [toState, setToState] = useState("");
  const [pay, setPay] = useState("");

  function update(newLoads) {
    const updated = { ...trips, [activeTrip]: { ...trip, loads: newLoads } };
    setTrips(updated); saveTrips(updated);
  }
  function submit() {
    if (!fromCity && !toCity) return;
    update([{ id: Date.now(), from: `${fromCity || "—"}, ${fromState || "—"}`, to: `${toCity || "—"}, ${toState || "—"}`, pay: parseFloat(pay) || 0, date: new Date().toLocaleDateString() }, ...loads]);
    setFromCity(""); setFromState(""); setToCity(""); setToState(""); setPay("");
  }

  return (
    <div>
      <TopBar title="Loads" subtitle="Log paying freight per trip" />
      <TripSelectorDropdown value={activeTrip} onChange={setActiveTrip} />
      <Card>
        <Label color="var(--accent)" style={{ marginBottom: 12 }}>Pickup</Label>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <Field style={{ flex: 1 }} label="From" unit={Ic.pin(15)} value={fromCity} onChange={setFromCity} placeholder="Chicago" />
          <Field style={{ width: 96 }} label="State" value={fromState} onChange={setFromState} placeholder="IL" />
        </div>
        <Label color="var(--accent)" style={{ margin: "18px 0 12px" }}>Drop</Label>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <Field style={{ flex: 1 }} label="To" unit={Ic.pin(15)} value={toCity} onChange={setToCity} placeholder="Atlanta" />
          <Field style={{ width: 96 }} label="State" value={toState} onChange={setState => setToState(setState)} placeholder="GA" />
        </div>
        <div style={{ marginTop: 18 }}>
          <Field label="Load Pay" unit="$" type="number" value={pay} onChange={setPay} placeholder="0.00" />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <PrimaryBtn icon={Ic.plus(18)} onClick={submit}>ADD LOAD</PrimaryBtn>
          <GhostBtn onClick={() => { setFromCity(""); setFromState(""); setToCity(""); setToState(""); setPay(""); }} style={{ height: "auto" }}>Reset</GhostBtn>
        </div>
      </Card>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {loads.length === 0 && <Empty>No loads for {activeTrip} yet.</Empty>}
        {loads.map((l: any) => (
          <Card key={l.id} pad={false} style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: "var(--text)", flexWrap: "wrap" as const }}>
                  <span>{l.from}</span>
                  <span style={{ color: "var(--accent)", display: "flex" }}>{Ic.chevRight(14)}</span>
                  <span>{l.to}</span>
                </div>
                {l.date && <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>{l.date}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <Pill tone="green">{money(l.pay)}</Pill>
                <button onClick={() => update(loads.filter((x: any) => x.id !== l.id))} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", padding: 4 }}>{Ic.trash(16)}</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Fuel Tracker ─────────────────────────────────────── */
function FuelTracker({ activeTrip, setActiveTrip, trips, setTrips }: any) {
  const trip = trips[activeTrip] || emptyTrip();
  const fuels = trip.fuels || [];
  const [city, setCity] = useState("");
  const [st, setSt] = useState("");
  const [odo, setOdo] = useState("");
  const [ppg, setPpg] = useState("");
  const [gal, setGal] = useState("");
  const [defGal, setDefGal] = useState("");
  const [defTotal, setDefTotal] = useState("");

  const fuelTotal = (parseFloat(ppg) || 0) * (parseFloat(gal) || 0);

  function update(newFuels) {
    const updated = { ...trips, [activeTrip]: { ...trip, fuels: newFuels } };
    setTrips(updated); saveTrips(updated);
  }
  function submit() {
    if (!city && !gal) return;
    update([{ id: Date.now(), city: `${city || "—"}, ${st || "—"}`, gal: parseFloat(gal) || 0, totalSpent: fuelTotal, defTotal: parseFloat(defTotal) || 0, defGallons: parseFloat(defGal) || 0, pricePerGal: parseFloat(ppg) || 0, odometer: odo, date: new Date().toLocaleDateString() }, ...fuels]);
    setCity(""); setSt(""); setOdo(""); setPpg(""); setGal(""); setDefGal(""); setDefTotal("");
  }

  return (
    <div>
      <TopBar title="Fuel" subtitle="Track diesel & DEF per stop" />
      <TripSelectorDropdown value={activeTrip} onChange={setActiveTrip} />
      <Card>
        <Label color="var(--accent)" style={{ marginBottom: 12 }}>Fuel Stop</Label>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <Field style={{ flex: 1 }} label="City" unit={Ic.fuel(15)} value={city} onChange={setCity} placeholder="Dallas" />
          <Field style={{ width: 96 }} label="State" value={st} onChange={setSt} placeholder="TX" />
        </div>
        <div style={{ marginTop: 16 }}>
          <Field label="Odometer Reading" unit="MI" unitTone="dim" type="number" value={odo} onChange={setOdo} placeholder="e.g. 125,400" />
        </div>
        <Label color="var(--accent)" style={{ margin: "18px 0 12px" }}>Diesel</Label>
        <div style={{ display: "flex", gap: 10 }}>
          <Field style={{ flex: 1 }} label="Price / Gallon" unit="$" type="number" value={ppg} onChange={setPpg} placeholder="3.89" />
          <Field style={{ flex: 1 }} label="Gallons" unit="GAL" unitTone="dim" type="number" value={gal} onChange={setGal} placeholder="0.0" />
        </div>
        <div style={{ marginTop: 16 }}>
          <Label style={{ marginBottom: 8 }}>Fuel Total</Label>
          <div style={{ background: "var(--surface-3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontWeight: 700, fontSize: 13 }}>$</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{fuelTotal.toFixed(2)}</span>
          </div>
        </div>
        <Label color="var(--accent)" style={{ margin: "18px 0 12px" }}>DEF</Label>
        <div style={{ display: "flex", gap: 10 }}>
          <Field style={{ flex: 1 }} label="DEF Gallons" unit="GAL" unitTone="dim" type="number" value={defGal} onChange={setDefGal} placeholder="0.0" />
          <Field style={{ flex: 1 }} label="DEF Total" unit="$" type="number" value={defTotal} onChange={setDefTotal} placeholder="0.00" />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <PrimaryBtn icon={Ic.plus(18)} onClick={submit}>ADD FUEL STOP</PrimaryBtn>
          <GhostBtn onClick={() => { setCity(""); setSt(""); setOdo(""); setPpg(""); setGal(""); setDefGal(""); setDefTotal(""); }} style={{ height: "auto" }}>Reset</GhostBtn>
        </div>
      </Card>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {fuels.length === 0 && <Empty>No fuel stops for {activeTrip} yet.</Empty>}
        {fuels.map((f: any) => (
          <Card key={f.id} pad={false} style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Ic.fuel(19)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{f.city}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{f.gal.toFixed(1)} gal{f.odometer ? ` · ${parseFloat(f.odometer).toLocaleString()} mi` : ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <Pill tone="red">-{money(f.totalSpent + (f.defTotal || 0))}</Pill>
                <button onClick={() => update(fuels.filter((x: any) => x.id !== f.id))} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", padding: 4 }}>{Ic.trash(16)}</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Mileage ──────────────────────────────────────────── */
function Mileage({ activeTrip, setActiveTrip, trips, setTrips }: any) {
  const trip = trips[activeTrip] || emptyTrip();
  const entries = trip.mileage || [];
  const [week, setWeek] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  function update(newEntries) {
    const updated = { ...trips, [activeTrip]: { ...trip, mileage: newEntries } };
    setTrips(updated); saveTrips(updated);
  }
  function submit() {
    const s = parseFloat(start) || 0, e = parseFloat(end) || 0;
    if (!week && !start && !end) return;
    update([{ id: Date.now(), week: week || "Untitled week", miles: Math.max(0, e - s), start: s, end: e, date: new Date().toLocaleDateString() }, ...entries]);
    setWeek(""); setStart(""); setEnd("");
  }

  return (
    <div>
      <TopBar title="Mileage" subtitle="Weekly odometer logging" />
      <TripSelectorDropdown value={activeTrip} onChange={setActiveTrip} />
      <Card>
        <Label color="var(--accent)" style={{ marginBottom: 14 }}>Weekly Mileage — {activeTrip}</Label>
        <Field label="Week Label" unit="WK" unitTone="dim" value={week} onChange={setWeek} placeholder="e.g. May Wk 1" />
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <Field style={{ flex: 1 }} label="Start Odometer" unit="MI" unitTone="dim" type="number" value={start} onChange={setStart} placeholder="124,500" />
          <Field style={{ flex: 1 }} label="End Odometer" unit="MI" unitTone="dim" type="number" value={end} onChange={setEnd} placeholder="127,000" />
        </div>
        <div style={{ marginTop: 18 }}>
          <PrimaryBtn icon={Ic.plus(18)} onClick={submit}>ADD TO {activeTrip.toUpperCase()}</PrimaryBtn>
        </div>
      </Card>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {entries.length === 0 && <Empty>No mileage logged for {activeTrip} yet.</Empty>}
        {entries.map((e: any) => (
          <Card key={e.id} pad={false} style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(90,169,240,0.13)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Ic.road(19)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{e.week}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{e.start.toLocaleString()} → {e.end.toLocaleString()}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <Pill tone="blue">{e.miles.toLocaleString()} mi</Pill>
                <button onClick={() => update(entries.filter((x: any) => x.id !== e.id))} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", padding: 4 }}>{Ic.trash(16)}</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Trips ────────────────────────────────────────────── */
function calcTrip(t: any) {
  const cfg = loadData("truckerCosts", DEFAULTS);
  const gross = (t.loads || []).reduce((s, l) => s + (l.pay || 0), 0);
  const fuelCost = (t.fuels || []).reduce((s, f) => s + (f.totalSpent || 0) + (f.defTotal || 0), 0);
  const miles = (t.mileage || []).reduce((s, e) => s + (e.miles || 0), 0);
  if (gross === 0 && miles === 0) return null;
  const dispatchFee = gross * (cfg.dispatch / 100);
  const amortCost = miles * cfg.amort;
  const weeklyFixed = cfg.truckRental + cfg.checkPack + cfg.logbook + cfg.parking / 4.33 + cfg.occIns / 4.33 + cfg.ifta / 13 + cfg.inspection / 8.67;
  const totalCosts = weeklyFixed + dispatchFee + amortCost + fuelCost;
  const net = gross - totalCosts;
  return { gross, fuelCost, miles, dispatchFee, amortCost, weeklyFixed, totalCosts, net, dpm: miles > 0 ? net / miles : 0 };
}

function TripCard({ tripKey, t, onDelete }: any) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const auto = calcTrip(t);
  const loadTotal = (t.loads || []).reduce((s, l) => s + (l.pay || 0), 0);
  const fuelTotal = (t.fuels || []).reduce((s, f) => s + (f.totalSpent || 0) + (f.defTotal || 0), 0);
  const tripMiles = (t.mileage || []).reduce((s, e) => s + (e.miles || 0), 0);

  return (
    <Card pad={false} style={{ overflow: "hidden" }}>
      <div style={{ padding: "16px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <button onClick={() => setChecked(c => !c)} style={{
              width: 24, height: 24, borderRadius: 8, cursor: "pointer",
              border: `1.5px solid ${checked ? "var(--accent)" : "var(--border-strong)"}`,
              background: checked ? "var(--accent)" : "transparent", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{checked && Ic.check(14)}</button>
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--accent)", letterSpacing: 0.3 }}>{tripKey}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {checked && <button onClick={onDelete} style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", background: "var(--red-soft)", border: "none", cursor: "pointer", padding: "5px 10px", borderRadius: 8 }}>DELETE</button>}
            <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", padding: 4 }}>{Ic.chevDown(20)}</button>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, marginTop: 13 }}>
          {t.loads?.length > 0 && <Pill tone="green">{Ic.box(13)}<span>{t.loads.length} loads · {money(loadTotal)}</span></Pill>}
          {t.fuels?.length > 0 && <Pill tone="red">{Ic.fuel(13)}<span>{t.fuels.length} stops · -{money(fuelTotal)}</span></Pill>}
          {tripMiles > 0 && <Pill tone="blue"><span>{tripMiles.toLocaleString()} mi</span></Pill>}
        </div>
      </div>

      {open && auto && (
        <div style={{ padding: "4px 16px 16px" }}>
          <div style={{ height: 1, background: "var(--border)", margin: "0 0 14px" }} />
          <Label color="var(--accent)" style={{ marginBottom: 12 }}>Auto-calculated profit summary</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Gross Revenue", value: money(auto.gross), tone: "green" },
              { label: "Total Costs", value: money(auto.totalCosts), tone: "red" },
              { label: "Net Profit", value: money(auto.net), tone: auto.net >= 0 ? "green" : "red" },
              { label: "Net $ / Mile", value: moneySign(auto.dpm), tone: auto.dpm >= 0 ? "green" : "red" },
            ].map(({ label, value, tone }) => (
              <div key={label} style={{ background: "var(--surface-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: "13px 14px" }}>
                <Label style={{ marginBottom: 7, fontSize: 10 }}>{label}</Label>
                <div style={{ fontSize: 20, fontWeight: 800, color: tone === "green" ? "var(--green)" : "var(--red)", letterSpacing: -0.4 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border)" }}>
            {[
              { label: "Weekly Fixed Costs", amt: auto.weeklyFixed },
              { label: "Dispatch & Insurance", amt: auto.dispatchFee },
              { label: `Amortization (${tripMiles.toLocaleString()} mi)`, amt: auto.amortCost },
              { label: "Fuel", amt: auto.fuelCost },
            ].map((ln, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 14px", borderTop: i ? "1px solid var(--border)" : "none", background: i % 2 ? "transparent" : "rgba(255,255,255,0.018)" }}>
                <span style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 500 }}>{ln.label}</span>
                <span style={{ fontSize: 14, color: "var(--red)", fontWeight: 700 }}>-{money(ln.amt)}</span>
              </div>
            ))}
          </div>
          {/* Load detail */}
          {t.loads?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                <Label color="var(--accent)">Loads ({t.loads.length})</Label>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--green)" }}>{money(loadTotal)}</span>
              </div>
              {t.loads.map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 2px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600, color: "var(--text)", minWidth: 0 }}>
                    <span style={{ color: "var(--accent)", flexShrink: 0 }}>{Ic.pin(14)}</span>
                    <span>{l.from}</span>
                    <span style={{ color: "var(--text-faint)", flexShrink: 0 }}>{Ic.chevRight(13)}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{l.to}</span>
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--green)", flexShrink: 0, marginLeft: 8 }}>{money(l.pay)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {open && !auto && (
        <div style={{ padding: "4px 16px 16px" }}>
          <div style={{ height: 1, background: "var(--border)", margin: "0 0 14px" }} />
          <div style={{ color: "var(--text-faint)", fontSize: 14 }}>Add loads or mileage to see profit calculations.</div>
        </div>
      )}
    </Card>
  );
}

function Trips({ trips, setTrips }: any) {
  const activeTripKeys = TRIP_NUMS.filter(n => {
    const t = trips[n];
    return t && ((t.loads?.length > 0) || (t.fuels?.length > 0) || (t.mileage?.length > 0));
  });

  const allCalcs = activeTripKeys.map(n => calcTrip(trips[n])).filter(Boolean) as any[];
  const totalGross = allCalcs.reduce((s, c) => s + c.gross, 0);
  const totalNet   = allCalcs.reduce((s, c) => s + c.net, 0);
  const totalFuel  = allCalcs.reduce((s, c) => s + c.fuelCost, 0);
  const totalMiles = allCalcs.reduce((s, c) => s + c.miles, 0);

  function deleteTrip(key) {
    const updated = { ...trips };
    delete updated[key];
    setTrips(updated); saveTrips(updated);
  }

  return (
    <div>
      <TopBar title="Trips" subtitle={`${activeTripKeys.length} trips on record`} />
      {activeTripKeys.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <StatCard label="Total Gross" value={money(totalGross)} tone="green" />
            <StatCard label="Total Fuel" value={money(totalFuel)} tone="red" />
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <StatCard label="Total Miles" value={totalMiles.toLocaleString()} tone="blue" />
            <StatCard label="Net Earned" value={money(totalNet)} tone={totalNet >= 0 ? "green" : "red"} accentBorder />
          </div>
        </>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {activeTripKeys.length === 0 && <Empty>No trips yet. Add loads, fuel, or mileage first.</Empty>}
        {activeTripKeys.map(key => (
          <TripCard key={key} tripKey={key} t={trips[key]} onDelete={() => deleteTrip(key)} />
        ))}
      </div>
    </div>
  );
}

/* ─── Root ─────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState("calc");
  const [activeTrip, setActiveTrip] = useState("Trip 1");
  const [trips, setTrips] = useState(() => loadTrips());

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        :root {
          --bg: #111114;
          --surface: #1b1c20;
          --surface-2: #232428;
          --surface-3: #2c2d33;
          --border: rgba(255,255,255,0.06);
          --border-strong: rgba(255,255,255,0.11);
          --text: #f5f3ef;
          --text-dim: #9d9b96;
          --text-faint: #6c6a66;
          --accent: #f47023;
          --accent-press: #d85f17;
          --accent-soft: rgba(244,112,35,0.14);
          --green: #4ecb8a;
          --green-soft: rgba(78,203,138,0.13);
          --red: #f06b6b;
          --red-soft: rgba(240,107,107,0.12);
          --blue: #5aa9f0;
          --radius: 22px;
          --radius-sm: 14px;
          --pad: 18px;
          --font: 'Plus Jakarta Sans', system-ui, sans-serif;
          --font-mono: 'Space Mono', ui-monospace, monospace;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body { background: var(--bg); color: var(--text); font-family: var(--font); -webkit-font-smoothing: antialiased; }
        button { font-family: var(--font); }
        input::placeholder { color: var(--text-faint); opacity: 1; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        ::-webkit-scrollbar { width: 0; height: 0; }
        * { scrollbar-width: none; }
      `}</style>

      <div style={{ maxWidth: 500, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", background: "var(--bg)" }}>
        {/* Screen content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 130px" }}>
          {tab === "calc"    && <Calculator />}
          {tab === "loads"   && <LoadTracker activeTrip={activeTrip} setActiveTrip={setActiveTrip} trips={trips} setTrips={setTrips} />}
          {tab === "fuel"    && <FuelTracker activeTrip={activeTrip} setActiveTrip={setActiveTrip} trips={trips} setTrips={setTrips} />}
          {tab === "mileage" && <Mileage activeTrip={activeTrip} setActiveTrip={setActiveTrip} trips={trips} setTrips={setTrips} />}
          {tab === "trips"   && <Trips trips={trips} setTrips={setTrips} />}
        </div>

        {/* Bottom nav */}
        <BottomNav tab={tab} setTab={setTab} />
      </div>
    </>
  );
}
