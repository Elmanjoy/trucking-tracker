import { useState } from "react";

function loadData(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function saveData(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

const DEFAULTS = {
  truckRental: 1000, checkPack: 25, logbook: 30,
  parking: 350, occIns: 160, ifta: 75,
  inspection: 200, dispatch: 22, amort: 0.16,
};

const fmtUSD    = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtAbs    = (n) => '$' + Math.abs(n).toFixed(2);
const fmtSigned = (n) => (n >= 0 ? '+$' : '-$') + Math.abs(n).toFixed(2);

// Trip numbers 1-100
const TRIP_NUMS = Array.from({ length: 100 }, (_, i) => i + 1);

// Helper: get a trip profile (or empty shell)
function emptyTrip(num) {
  return { num, loads: [], fuels: [], calc: null };
}
function loadTrips() {
  return loadData('tripProfiles', {});
}
function saveTrips(trips) {
  saveData('tripProfiles', trips);
}

// ─────────────────────────────────────────────
// TRIP SELECTOR BAR  (shared across tabs)
// ─────────────────────────────────────────────
function TripSelector({ activeTripNum, onChange, trips }) {
  return (
    <div className="trip-selector-bar">
      <span className="trip-selector-label">Trip #</span>
      <div className="trip-select-wrap">
        <select
          className="trip-select"
          value={activeTripNum}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          {TRIP_NUMS.map(n => (
            <option key={n} value={n}>
              Trip {n}{trips[n] && (trips[n].loads.length > 0 || trips[n].fuels.length > 0 || trips[n].calc) ? ' ●' : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CALCULATOR  (standalone — not linked to trips)
// ─────────────────────────────────────────────
function Calculator() {
  const [cfg, setCfg]         = useState(() => loadData('truckerCosts', DEFAULTS));
  const [screen, setScreen]   = useState(() => localStorage.getItem('truckerCosts') ? 'calc' : 'setup');
  const [miles, setMiles]     = useState('');
  const [gross, setGross]     = useState('');
  const [fuel, setFuel]       = useState('');
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(false);
  const [setupVals, setSetupVals] = useState({ ...DEFAULTS });
  const [cfgVals,   setCfgVals]   = useState({ ...DEFAULTS });

  function setupSave() {
    const newCfg = Object.fromEntries(Object.keys(DEFAULTS).map(k => [k, parseFloat(setupVals[k]) || DEFAULTS[k]]));
    setCfg(newCfg); saveData('truckerCosts', newCfg); setScreen('calc');
  }
  function openSettings() { setCfgVals({ ...cfg }); setScreen('settings'); }
  function saveSettings() {
    const newCfg = Object.fromEntries(Object.keys(DEFAULTS).map(k => [k, parseFloat(cfgVals[k]) || cfg[k]]));
    setCfg(newCfg); saveData('truckerCosts', newCfg); setScreen('calc');
  }

  function calculate() {
    const mi = parseFloat(miles), gr = parseFloat(gross), fu = parseFloat(fuel);
    if (isNaN(mi) || isNaN(gr) || isNaN(fu)) { setError(true); setResult(null); return; }
    setError(false);
    const dispatchFee = gr * (cfg.dispatch / 100);
    const amortCost   = mi * cfg.amort;
    const fixedRows = [
      ['Truck Rental',   cfg.truckRental],
      ['TripPak', cfg.checkPack],
      ['Logbook Fee',    cfg.logbook],
      ['Truck Parking',  cfg.parking / 4.33],
      ['Occ. Insurance', cfg.occIns / 4.33],
      ['IFTA Tax',       cfg.ifta / 13],
      ['Inspection Fee', cfg.inspection / 8.67],
    ];
    const fixedTotal = fixedRows.reduce((s, [, v]) => s + v, 0);
    const totalCosts = fixedTotal + dispatchFee + amortCost + fu;
    const net = gr - totalCosts;
    const dpm = mi > 0 ? net / mi : 0;
    setResult({ fixedRows, dispatchFee, amortCost, fuel: fu, totalCosts, net, dpm, gross: gr, miles: mi });
  }

  function resetCalc() {
    setMiles(''); setGross(''); setFuel(''); setResult(null); setError(false);
  }

  const cfgFields = [
    { group: 'Weekly Costs' },
    { key: 'truckRental', label: 'Truck Rental', prefix: '$' },
    { key: 'checkPack',   label: 'TripPak', prefix: '$' },
    { key: 'logbook',     label: 'Logbook Fee', prefix: '$' },
    { group: 'Monthly Costs' },
    { key: 'parking',     label: 'Truck Parking', prefix: '$' },
    { key: 'occIns',      label: 'Occupational Insurance', prefix: '$' },
    { group: 'Quarterly' },
    { key: 'ifta',        label: 'IFTA Tax', prefix: '$' },
    { group: 'Bi-Monthly' },
    { key: 'inspection',  label: 'Inspection Fee', prefix: '$' },
    { group: 'Rates' },
    { key: 'dispatch',    label: 'Dispatch & Insurance', prefix: '%' },
    { key: 'amort',       label: 'Amortization (per mile)', prefix: '$' },
  ];

  function renderFields(vals, setVals) {
    return cfgFields.map((f, i) =>
      f.group ? <div className="c-group-label" key={i}>{f.group}</div> : (
        <div className="c-field" key={f.key}>
          <label>{f.label}</label>
          <div className="c-input-wrap">
            <span className="c-prefix">{f.prefix}</span>
            <input type="number" value={vals[f.key]}
              onChange={(e) => setVals(v => ({ ...v, [f.key]: e.target.value }))}
              placeholder={String(DEFAULTS[f.key])} />
          </div>
        </div>
      )
    );
  }

  if (screen === 'setup') return (
    <div className="c-screen">
      <div className="c-topbar">
        <div><div className="c-topbar-title">First Time Setup</div><div className="c-topbar-sub">Enter your fixed cost rates</div></div>
      </div>
      <div className="c-body">{renderFields(setupVals, setSetupVals)}</div>
      <div className="c-footer"><button className="c-btn-primary" onClick={setupSave}>SAVE & START →</button></div>
    </div>
  );

  if (screen === 'settings') return (
    <div className="c-screen">
      <div className="c-topbar">
        <div><div className="c-topbar-title">Settings</div><div className="c-topbar-sub">Update your fixed costs</div></div>
        <button className="c-icon-btn" onClick={() => setScreen('calc')}>✕</button>
      </div>
      <div className="c-body">{renderFields(cfgVals, setCfgVals)}</div>
      <div className="c-footer"><button className="c-btn-primary" onClick={saveSettings}>SAVE CHANGES</button></div>
    </div>
  );

  return (
    <div className="c-screen">
      <div className="c-topbar">
        <div><div className="c-topbar-title">Weekly Profit</div><div className="c-topbar-sub">Quick calculator — not saved to trips</div></div>
        <button className="c-icon-btn" onClick={openSettings}>⚙</button>
      </div>
      <div className="c-body">
        <div className="c-field">
          <label>Miles Driven</label>
          <div className="c-input-wrap">
            <span className="c-prefix" style={{ fontSize: '0.7rem' }}>MI</span>
            <input type="number" placeholder="e.g. 2500" value={miles} onChange={(e) => setMiles(e.target.value)} />
          </div>
        </div>
        <div className="c-field">
          <label>Gross Earnings</label>
          <div className="c-input-wrap">
            <span className="c-prefix">$</span>
            <input type="number" placeholder="e.g. 4200" value={gross} onChange={(e) => setGross(e.target.value)} />
          </div>
        </div>
        <div className="c-field">
          <label>Fuel Spent (total $)</label>
          <div className="c-input-wrap">
            <span className="c-prefix">$</span>
            <input type="number" placeholder="e.g. 800" value={fuel} onChange={(e) => setFuel(e.target.value)} />
          </div>
        </div>

        {error && <div className="c-error">Please fill in miles, gross, and fuel.</div>}

        <div className="c-actions">
          <button className="c-btn-primary" onClick={calculate}>CALCULATE</button>
          {(result || miles || gross || fuel) && (
            <button className="c-btn-ghost sm" onClick={resetCalc}>RESET</button>
          )}
        </div>

        {result && (
          <div className="c-results">
            <div className="c-results-label">Cost Breakdown</div>
            <div className="c-breakdown">
              {result.fixedRows.map(([name, val]) => (
                <div className="c-cost-row" key={name}>
                  <span>{name}</span><span className="c-cost-val">-{fmtAbs(val)}</span>
                </div>
              ))}
              <div className="c-cost-row">
                <span>Dispatch & Ins. ({cfg.dispatch}%)</span>
                <span className="c-cost-val">-{fmtAbs(result.dispatchFee)}</span>
              </div>
              <div className="c-cost-row">
                <span>Amortization (${cfg.amort}/mi)</span>
                <span className="c-cost-val">-{fmtAbs(result.amortCost)}</span>
              </div>
              <div className="c-cost-row">
                <span>Fuel</span><span className="c-cost-val">-{fmtAbs(result.fuel)}</span>
              </div>
            </div>
            <div className="c-big-stats">
              <div className="c-stat">
                <div className="c-stat-label">Net Profit</div>
                <div className={`c-stat-val ${result.net >= 0 ? 'positive' : 'negative'}`}>{fmtSigned(result.net)}</div>
              </div>
              <div className="c-stat">
                <div className="c-stat-label">Dollar / Mile</div>
                <div className={`c-stat-val ${result.dpm >= 0 ? 'positive' : 'negative'}`}>{fmtSigned(result.dpm)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LOAD TRACKER
// ─────────────────────────────────────────────
function LoadTracker({ activeTripNum, trips, setTrips }) {
  const trip  = trips[activeTripNum] || emptyTrip(activeTripNum);
  const loads = trip.loads;

  const [form, setForm] = useState({ pickupCity: "", pickupState: "", dropCity: "", dropState: "", pay: "" });

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  function updateTrip(newLoads) {
    const updated = { ...trips, [activeTripNum]: { ...trip, loads: newLoads } };
    setTrips(updated); saveTrips(updated);
  }

  function addLoad() {
    if (!form.pickupCity || !form.dropCity || !form.pay) return;
    updateTrip([{ ...form, id: Date.now(), date: new Date().toLocaleDateString() }, ...loads]);
    setForm({ pickupCity: "", pickupState: "", dropCity: "", dropState: "", pay: "" });
  }

  function removeLoad(id) { updateTrip(loads.filter(l => l.id !== id)); }
  function resetForm()    { setForm({ pickupCity: "", pickupState: "", dropCity: "", dropState: "", pay: "" }); }

  const totalPay = loads.reduce((s, l) => s + parseFloat(l.pay || 0), 0);

  return (
    <div className="lt-wrap">
      <div className="lt-form">
        <div className="c-group-label">Pickup</div>
        <div className="lt-row">
          <div className="c-field" style={{ flex: 1 }}>
            <label>City</label>
            <div className="c-input-wrap">
              <span className="c-prefix" style={{ fontSize: '0.65rem' }}>FROM</span>
              <input name="pickupCity" placeholder="Chicago" value={form.pickupCity} onChange={handleChange} />
            </div>
          </div>
          <div className="c-field" style={{ width: 80 }}>
            <label>State</label>
            <div className="c-input-wrap">
              <input name="pickupState" placeholder="IL" value={form.pickupState} onChange={handleChange} maxLength={2} style={{ paddingLeft: 14 }} />
            </div>
          </div>
        </div>
        <div className="c-group-label" style={{ marginTop: 8 }}>Drop</div>
        <div className="lt-row">
          <div className="c-field" style={{ flex: 1 }}>
            <label>City</label>
            <div className="c-input-wrap">
              <span className="c-prefix" style={{ fontSize: '0.65rem' }}>TO</span>
              <input name="dropCity" placeholder="Atlanta" value={form.dropCity} onChange={handleChange} />
            </div>
          </div>
          <div className="c-field" style={{ width: 80 }}>
            <label>State</label>
            <div className="c-input-wrap">
              <input name="dropState" placeholder="GA" value={form.dropState} onChange={handleChange} maxLength={2} style={{ paddingLeft: 14 }} />
            </div>
          </div>
        </div>
        <div className="c-field" style={{ marginTop: 8 }}>
          <label>Load Pay</label>
          <div className="c-input-wrap">
            <span className="c-prefix">$</span>
            <input name="pay" type="number" placeholder="0.00" value={form.pay} onChange={handleChange} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="c-btn-primary" style={{ flex: 1 }} onClick={addLoad}>+ ADD LOAD</button>
          <button className="c-btn-ghost sm" onClick={resetForm}>RESET</button>
        </div>
      </div>

      {loads.length > 0 && (
        <div className="lt-summary">
          <span>Trip {activeTripNum} — {loads.length} load{loads.length !== 1 ? 's' : ''}</span>
          <span className="lt-total">{fmtUSD(totalPay)}</span>
        </div>
      )}

      <div className="lt-list">
        {loads.length === 0 && <div className="c-empty">No loads for Trip {activeTripNum} yet.</div>}
        {loads.map((load, i) => (
          <div className="lt-card" key={load.id}>
            <div className="lt-num">#{loads.length - i}</div>
            <div className="lt-route">
              <span className="lt-city pickup">📍 {load.pickupCity}{load.pickupState ? `, ${load.pickupState.toUpperCase()}` : ''}</span>
              <span className="lt-arrow">→</span>
              <span className="lt-city drop">🏁 {load.dropCity}{load.dropState ? `, ${load.dropState.toUpperCase()}` : ''}</span>
            </div>
            <div className="lt-pay">{fmtUSD(parseFloat(load.pay))}</div>
            <div className="lt-date">{load.date}</div>
            <button className="lt-del" onClick={() => removeLoad(load.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FUEL TRACKER
// ─────────────────────────────────────────────
function FuelTracker({ activeTripNum, trips, setTrips }) {
  const trip  = trips[activeTripNum] || emptyTrip(activeTripNum);
  const fuels = trip.fuels;

  const emptyForm = { city: "", state: "", odometer: "", pricePerGal: "", gallons: "", totalSpent: "", defGallons: "", defTotal: "" };
  const [form, setForm] = useState(emptyForm);

  function handleChange(e) {
    const { name, value } = e.target;
    const updated = { ...form, [name]: value };
    // Auto-calc fuel total
    const ppg = parseFloat(name === 'pricePerGal' ? value : updated.pricePerGal);
    const gal = parseFloat(name === 'gallons'     ? value : updated.gallons);
    if (!isNaN(ppg) && !isNaN(gal) && ppg > 0 && gal > 0) {
      updated.totalSpent = (ppg * gal).toFixed(2);
    }
    setForm(updated);
  }

  function updateTrip(newFuels) {
    const updated = { ...trips, [activeTripNum]: { ...trip, fuels: newFuels } };
    setTrips(updated); saveTrips(updated);
  }

  function addFuel() {
    if (!form.city || !form.totalSpent) return;
    updateTrip([{ ...form, id: Date.now(), date: new Date().toLocaleDateString() }, ...fuels]);
    setForm(emptyForm);
  }

  function removeFuel(id) { updateTrip(fuels.filter(f => f.id !== id)); }
  function resetForm()    { setForm(emptyForm); }

  const totalFuel = fuels.reduce((s, f) => s + parseFloat(f.totalSpent || 0), 0);
  const totalDef  = fuels.reduce((s, f) => s + parseFloat(f.defTotal   || 0), 0);
  const totalSpent = totalFuel + totalDef;

  return (
    <div className="lt-wrap">
      <div className="lt-form">

        {/* Location */}
        <div className="c-group-label">Fuel Stop</div>
        <div className="lt-row">
          <div className="c-field" style={{ flex: 1 }}>
            <label>City</label>
            <div className="c-input-wrap">
              <span className="c-prefix" style={{ fontSize: '0.65rem' }}>⛽</span>
              <input name="city" placeholder="Dallas" value={form.city} onChange={handleChange} />
            </div>
          </div>
          <div className="c-field" style={{ width: 80 }}>
            <label>State</label>
            <div className="c-input-wrap">
              <input name="state" placeholder="TX" value={form.state} onChange={handleChange} maxLength={2} style={{ paddingLeft: 14 }} />
            </div>
          </div>
        </div>

        {/* Odometer */}
        <div className="c-field" style={{ marginTop: 8 }}>
          <label>Odometer Reading</label>
          <div className="c-input-wrap">
            <span className="c-prefix" style={{ fontSize: '0.65rem' }}>MI</span>
            <input name="odometer" type="number" placeholder="e.g. 125400" value={form.odometer} onChange={handleChange} />
          </div>
        </div>

        {/* Fuel */}
        <div className="c-group-label" style={{ marginTop: 10 }}>Diesel</div>
        <div className="lt-row">
          <div className="c-field" style={{ flex: 1 }}>
            <label>Price / Gallon</label>
            <div className="c-input-wrap">
              <span className="c-prefix">$</span>
              <input name="pricePerGal" type="number" placeholder="3.89" step="0.01" value={form.pricePerGal} onChange={handleChange} />
            </div>
          </div>
          <div className="c-field" style={{ flex: 1 }}>
            <label>Gallons</label>
            <div className="c-input-wrap">
              <span className="c-prefix" style={{ fontSize: '0.65rem' }}>GAL</span>
              <input name="gallons" type="number" placeholder="0.0" step="0.1" value={form.gallons} onChange={handleChange} />
            </div>
          </div>
        </div>
        <div className="c-field" style={{ marginTop: 8 }}>
          <label>Fuel Total</label>
          <div className="c-input-wrap">
            <span className="c-prefix">$</span>
            <input name="totalSpent" type="number" placeholder="0.00" value={form.totalSpent} onChange={handleChange} />
          </div>
        </div>

        {/* DEF */}
        <div className="c-group-label" style={{ marginTop: 10 }}>DEF</div>
        <div className="lt-row">
          <div className="c-field" style={{ flex: 1 }}>
            <label>DEF Gallons</label>
            <div className="c-input-wrap">
              <span className="c-prefix" style={{ fontSize: '0.65rem' }}>GAL</span>
              <input name="defGallons" type="number" placeholder="0.0" step="0.1" value={form.defGallons} onChange={handleChange} />
            </div>
          </div>
          <div className="c-field" style={{ flex: 1 }}>
            <label>DEF Total</label>
            <div className="c-input-wrap">
              <span className="c-prefix">$</span>
              <input name="defTotal" type="number" placeholder="0.00" value={form.defTotal} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="c-btn-primary" style={{ flex: 1 }} onClick={addFuel}>+ ADD FUEL STOP</button>
          <button className="c-btn-ghost sm" onClick={resetForm}>RESET</button>
        </div>
      </div>

      {fuels.length > 0 && (
        <div className="lt-summary">
          <span>Trip {activeTripNum} — {fuels.length} stop{fuels.length !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <span className="lt-total" style={{ color: 'var(--red)' }}>-{fmtUSD(totalSpent)}</span>
            {totalDef > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>incl. {fmtUSD(totalDef)} DEF</span>}
          </div>
        </div>
      )}

      <div className="lt-list">
        {fuels.length === 0 && <div className="c-empty">No fuel stops for Trip {activeTripNum} yet.</div>}
        {fuels.map((f, i) => (
          <div className="lt-card" key={f.id} style={{ gridTemplateRows: 'auto auto auto' }}>
            <div className="lt-num">#{fuels.length - i}</div>
            <div className="lt-route">
              <span className="lt-city pickup">⛽ {f.city}{f.state ? `, ${f.state.toUpperCase()}` : ''}</span>
              {f.odometer && <span className="lt-city drop">🛣 {parseFloat(f.odometer).toLocaleString()} mi</span>}
            </div>
            <div className="lt-pay" style={{ color: 'var(--red)' }}>-{fmtUSD(parseFloat(f.totalSpent || 0) + parseFloat(f.defTotal || 0))}</div>
            <div style={{ gridColumn: '2', display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              {f.pricePerGal && (
                <span className="fuel-detail-tag">⛽ ${parseFloat(f.pricePerGal).toFixed(2)}/gal{f.gallons ? ` · ${parseFloat(f.gallons).toFixed(1)} gal` : ''} · {fmtUSD(parseFloat(f.totalSpent || 0))}</span>
              )}
              {f.defGallons && (
                <span className="fuel-detail-tag def-tag">DEF {parseFloat(f.defGallons).toFixed(1)} gal{f.defTotal ? ` · ${fmtUSD(parseFloat(f.defTotal))}` : ''}</span>
              )}
            </div>
            <div className="lt-date" style={{ gridColumn: '2', marginTop: 2 }}>{f.date}</div>
            <button className="lt-del" onClick={() => removeFuel(f.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TRIPS TAB
// ─────────────────────────────────────────────

// Auto-calculate a trip's financials from its stored data + saved cfg rates
function calcTrip(t) {
  const cfg       = loadData('truckerCosts', DEFAULTS);
  const gross     = t.loads.reduce((s, l) => s + parseFloat(l.pay || 0), 0);
  const fuelCost  = t.fuels.reduce((s, f) => s + parseFloat(f.totalSpent || 0) + parseFloat(f.defTotal || 0), 0);
  const miles     = (t.mileage || []).reduce((s, e) => s + e.driven, 0);

  const hasData   = gross > 0 || miles > 0;
  if (!hasData) return null;

  const dispatchFee  = gross * (cfg.dispatch / 100);
  const amortCost    = miles * cfg.amort;
  const weeklyFixed  =
    cfg.truckRental +
    cfg.checkPack   +
    cfg.logbook     +
    cfg.parking    / 4.33 +
    cfg.occIns     / 4.33 +
    cfg.ifta       / 13   +
    cfg.inspection / 8.67;

  const totalCosts = weeklyFixed + dispatchFee + amortCost + fuelCost;
  const net        = gross - totalCosts;
  const dpm        = miles > 0 ? net / miles : 0;

  return { gross, fuelCost, miles, dispatchFee, amortCost, weeklyFixed, totalCosts, net, dpm };
}

function Trips({ trips, setTrips }) {
  const [expanded, setExpanded] = useState(null);
  const [checked,  setChecked]  = useState({});

  const activeTripNums = TRIP_NUMS.filter(n => {
    const t = trips[n];
    return t && (t.loads.length > 0 || t.fuels.length > 0 || (t.mileage && t.mileage.length > 0) || t.calc);
  });

  const allCalcs   = activeTripNums.map(n => calcTrip(trips[n])).filter(Boolean);
  const totalGross = allCalcs.reduce((s, c) => s + c.gross, 0);
  const totalNet   = allCalcs.reduce((s, c) => s + c.net,   0);
  const totalFuel  = allCalcs.reduce((s, c) => s + c.fuelCost, 0);
  const totalMiles = allCalcs.reduce((s, c) => s + c.miles, 0);

  function toggleCheck(num) {
    setChecked(prev => ({ ...prev, [num]: !prev[num] }));
  }

  function deleteTrip(num) {
    const updated = { ...trips };
    delete updated[num];
    setTrips(updated); saveTrips(updated);
    if (expanded === num) setExpanded(null);
    setChecked(prev => { const n = { ...prev }; delete n[num]; return n; });
  }

  return (
    <div className="ih-wrap">
      {activeTripNums.length === 0 ? (
        <div className="c-empty">No trips yet. Add loads, fuel, or mileage to a trip first.</div>
      ) : (
        <>
          {/* ── Overall summary ── */}
          <div className="ih-stats">
            <div className="ih-stat">
              <div className="ih-stat-label">Total Gross</div>
              <div className="ih-stat-val positive">{fmtUSD(totalGross)}</div>
            </div>
            <div className="ih-stat">
              <div className="ih-stat-label">Total Fuel</div>
              <div className="ih-stat-val negative">{fmtUSD(totalFuel)}</div>
            </div>
            <div className="ih-stat">
              <div className="ih-stat-label">Total Miles</div>
              <div className="ih-stat-val" style={{ color: '#6ab0e8' }}>{totalMiles.toLocaleString()}</div>
            </div>
            <div className="ih-stat full highlight">
              <div className="ih-stat-label">Total Net Earned</div>
              <div className={`ih-stat-val ${totalNet >= 0 ? 'positive' : 'negative'}`}>{fmtUSD(totalNet)}</div>
            </div>
          </div>

          <div className="c-group-label" style={{ marginBottom: 8 }}>
            {activeTripNums.length} Trip{activeTripNums.length !== 1 ? 's' : ''} on Record
          </div>

          {activeTripNums.map(num => {
            const t         = trips[num];
            const isOpen    = expanded === num;
            const auto      = calcTrip(t);  // live calc from trip data
            const loadTotal = t.loads.reduce((s, l) => s + parseFloat(l.pay || 0), 0);
            const fuelTotal = t.fuels.reduce((s, f) => s + parseFloat(f.totalSpent || 0) + parseFloat(f.defTotal || 0), 0);
            const tripMiles = (t.mileage || []).reduce((s, e) => s + e.driven, 0);

            return (
              <div className="ih-row" key={num}>

                {/* Header */}
                <div className="ih-row-top">
                  <input
                    type="checkbox"
                    className="trip-checkbox"
                    checked={!!checked[num]}
                    onChange={() => toggleCheck(num)}
                  />
                  <div
                    onClick={() => setExpanded(isOpen ? null : num)}
                    style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <span className="ih-label">Trip {num}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '0.7rem', marginLeft: 'auto' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                  {checked[num] && (
                    <button className="ih-del-btn" onClick={() => deleteTrip(num)}>DELETE</button>
                  )}
                </div>

                {/* Data badges */}
                <div className="trip-badges">
                  {t.loads.length > 0 && (
                    <span className="trip-badge load-badge">📦 {t.loads.length} load{t.loads.length !== 1 ? 's' : ''} · {fmtUSD(loadTotal)}</span>
                  )}
                  {t.fuels.length > 0 && (
                    <span className="trip-badge fuel-badge">⛽ {t.fuels.length} stop{t.fuels.length !== 1 ? 's' : ''} · -{fmtUSD(fuelTotal)}</span>
                  )}
                  {tripMiles > 0 && (
                    <span className="trip-badge mi-badge">🛣 {tripMiles.toLocaleString()} mi</span>
                  )}
                </div>

                {/* ── AUTO-CALCULATED PROFIT SUMMARY ── */}
                {auto ? (
                  <>
                    <div className="trip-calc-header">Auto-Calculated Profit Summary</div>
                    <div className="ih-summary-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div className="ih-mini-stat">
                        <div className="ih-mini-label">Gross Revenue</div>
                        <div className="ih-mini-val positive">{fmtUSD(auto.gross)}</div>
                      </div>
                      <div className="ih-mini-stat">
                        <div className="ih-mini-label">Total Costs</div>
                        <div className="ih-mini-val negative">{fmtUSD(auto.totalCosts)}</div>
                      </div>
                      <div className="ih-mini-stat">
                        <div className="ih-mini-label">Net Profit</div>
                        <div className={`ih-mini-val ${auto.net >= 0 ? 'positive' : 'negative'}`}>{fmtUSD(auto.net)}</div>
                      </div>
                      <div className="ih-mini-stat">
                        <div className="ih-mini-label">Net $ / Mile</div>
                        <div className={`ih-mini-val ${auto.dpm >= 0 ? 'positive' : 'negative'}`}>{fmtSigned(auto.dpm)}</div>
                      </div>
                    </div>

                    {/* Cost breakdown — always visible */}
                    <div className="trip-cost-breakdown">
                      <div className="trip-breakdown-row">
                        <span>Weekly Fixed Costs</span>
                        <span className="negative">-{fmtUSD(auto.weeklyFixed)}</span>
                      </div>
                      <div className="trip-breakdown-row">
                        <span>Dispatch & Insurance</span>
                        <span className="negative">-{fmtUSD(auto.dispatchFee)}</span>
                      </div>
                      <div className="trip-breakdown-row">
                        <span>Amortization ({tripMiles.toLocaleString()} mi)</span>
                        <span className="negative">-{fmtUSD(auto.amortCost)}</span>
                      </div>
                      <div className="trip-breakdown-row">
                        <span>Fuel</span>
                        <span className="negative">-{fmtUSD(auto.fuelCost)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="trip-no-calc">Add loads or mileage to see profit calculations.</div>
                )}

                {/* Expandable detail */}
                {isOpen && (
                  <div className="ih-detail">
                    {t.loads.length > 0 && (
                      <>
                        <div className="ih-detail-label">Loads ({t.loads.length}) — {fmtUSD(loadTotal)}</div>
                        {t.loads.map((l, li) => (
                          <div className="ih-detail-row" key={li}>
                            <span>📍 {l.pickupCity}{l.pickupState ? `, ${l.pickupState.toUpperCase()}` : ''} → 🏁 {l.dropCity}{l.dropState ? `, ${l.dropState.toUpperCase()}` : ''}</span>
                            <span className="positive">{fmtUSD(parseFloat(l.pay))}</span>
                          </div>
                        ))}
                      </>
                    )}
                    {t.fuels.length > 0 && (
                      <>
                        <div className="ih-detail-label" style={{ marginTop: 10 }}>
                          Fuel Stops ({t.fuels.length}) — {fmtUSD(fuelTotal)}
                        </div>
                        {t.fuels.map((f, fi) => (
                          <div className="ih-detail-row" key={fi}>
                            <span>
                              ⛽ {f.city}{f.state ? `, ${f.state.toUpperCase()}` : ''}
                              {f.odometer ? ` · 🛣 ${parseFloat(f.odometer).toLocaleString()} mi` : ''}
                              {f.pricePerGal ? ` · $${parseFloat(f.pricePerGal).toFixed(2)}/gal` : ''}
                              {f.gallons ? ` · ${parseFloat(f.gallons).toFixed(1)} gal` : ''}
                              {f.defGallons ? ` · DEF ${parseFloat(f.defGallons).toFixed(1)} gal` : ''}
                            </span>
                            <span className="negative">-{fmtUSD(parseFloat(f.totalSpent))}</span>
                          </div>
                        ))}
                      </>
                    )}
                    {(t.mileage && t.mileage.length > 0) && (
                      <>
                        <div className="ih-detail-label" style={{ marginTop: 10 }}>
                          Mileage ({t.mileage.length} week{t.mileage.length !== 1 ? 's' : ''}) — {tripMiles.toLocaleString()} mi
                        </div>
                        {t.mileage.map((e, ei) => (
                          <div className="ih-detail-row" key={ei}>
                            <span>🛣 {e.week} · {e.startMiles.toLocaleString()} → {e.endMiles.toLocaleString()}</span>
                            <span style={{ color: '#6ab0e8' }}>{e.driven.toLocaleString()} mi</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MILEAGE
// ─────────────────────────────────────────────
function Mileage({ activeTripNum, trips, setTrips }) {
  const trip    = trips[activeTripNum] || emptyTrip(activeTripNum);
  const entries = trip.mileage || [];

  const [startMiles, setStartMiles] = useState('');
  const [endMiles,   setEndMiles]   = useState('');
  const [weekLabel,  setWeekLabel]  = useState('');
  const [saved,      setSaved]      = useState(false);

  const driven      = (parseFloat(startMiles) >= 0 && parseFloat(endMiles) > 0)
    ? Math.max(0, parseFloat(endMiles) - parseFloat(startMiles))
    : null;

  function addEntry() {
    if (driven === null || !weekLabel) return;
    const entry = {
      id: Date.now(),
      week: weekLabel,
      startMiles: parseFloat(startMiles),
      endMiles: parseFloat(endMiles),
      driven,
      date: new Date().toLocaleDateString(),
    };
    const newEntries = [entry, ...entries];
    const updated = { ...trips, [activeTripNum]: { ...trip, mileage: newEntries } };
    setTrips(updated); saveTrips(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setStartMiles(''); setEndMiles(''); setWeekLabel('');
  }

  function removeEntry(id) {
    const newEntries = entries.filter(e => e.id !== id);
    const updated = { ...trips, [activeTripNum]: { ...trip, mileage: newEntries } };
    setTrips(updated); saveTrips(updated);
  }

  const totalMiles = entries.reduce((s, e) => s + e.driven, 0);

  return (
    <div className="lt-wrap">
      <div className="lt-form">
        <div className="c-group-label">Weekly Mileage — Trip {activeTripNum}</div>

        <div className="c-field">
          <label>Week Label</label>
          <div className="c-input-wrap">
            <span className="c-prefix" style={{ fontSize: '0.65rem' }}>WK</span>
            <input
              type="text"
              placeholder="e.g. May Wk 1"
              value={weekLabel}
              onChange={(e) => setWeekLabel(e.target.value)}
            />
          </div>
        </div>

        <div className="lt-row">
          <div className="c-field" style={{ flex: 1 }}>
            <label>Start Odometer</label>
            <div className="c-input-wrap">
              <span className="c-prefix" style={{ fontSize: '0.65rem' }}>MI</span>
              <input
                type="number"
                placeholder="e.g. 124500"
                value={startMiles}
                onChange={(e) => setStartMiles(e.target.value)}
              />
            </div>
          </div>
          <div className="c-field" style={{ flex: 1 }}>
            <label>End Odometer</label>
            <div className="c-input-wrap">
              <span className="c-prefix" style={{ fontSize: '0.65rem' }}>MI</span>
              <input
                type="number"
                placeholder="e.g. 127000"
                value={endMiles}
                onChange={(e) => setEndMiles(e.target.value)}
              />
            </div>
          </div>
        </div>

        {driven !== null && (
          <div className="mi-preview">
            <span className="mi-preview-label">Miles This Week</span>
            <span className="mi-preview-val">{driven.toLocaleString()} mi</span>
          </div>
        )}

        <button
          className={"c-btn-primary" + (saved ? " mi-saved" : "")}
          onClick={addEntry}
          disabled={driven === null || !weekLabel}
          style={{ marginTop: 4, opacity: (driven === null || !weekLabel) ? 0.45 : 1 }}
        >
          {saved ? '✓ ADDED TO TRIP' : `+ ADD TO TRIP ${activeTripNum}`}
        </button>
      </div>

      {entries.length > 0 && (
        <div className="lt-summary">
          <span>{entries.length} week{entries.length !== 1 ? 's' : ''} logged</span>
          <span className="lt-total" style={{ color: 'var(--text)' }}>{totalMiles.toLocaleString()} mi total</span>
        </div>
      )}

      <div className="lt-list">
        {entries.length === 0 && <div className="c-empty">No mileage logged for Trip {activeTripNum} yet.</div>}
        {entries.map((e, i) => (
          <div className="mi-card" key={e.id}>
            <div className="mi-card-top">
              <span className="mi-week">{e.week}</span>
              <span className="mi-miles">{e.driven.toLocaleString()} mi</span>
              <button className="lt-del" onClick={() => removeEntry(e.id)}>✕</button>
            </div>
            <div className="mi-card-bottom">
              <span>{e.startMiles.toLocaleString()} → {e.endMiles.toLocaleString()}</span>
              <span className="mi-date">{e.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────
const TABS = ["Calculator", "Loads", "Fuel", "Mileage", "Trips"];

export default function App() {
  const [tab,           setTab]           = useState(0);
  const [activeTripNum, setActiveTripNum] = useState(1);
  const [trips,         setTrips]         = useState(() => loadTrips());

  const activeTrip = trips[activeTripNum] || emptyTrip(activeTripNum);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;600&display=swap');
        :root {
          --bg: #0e0e0e; --panel: #1a1a1a; --border: #2a2a2a;
          --orange: #e8541a; --text: #e8e4dc; --muted: #666;
          --green: #4caf72; --red: #e85454;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { background: var(--bg); color: var(--text); font-family: 'IBM Plex Mono', monospace; }

        .app { max-width: 500px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; }

        /* ── Tabs ── */
        .tabs { display: flex; background: var(--panel); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 20; }
        .tab-btn {
          flex: 1; padding: 13px 4px; background: none; border: none; color: var(--muted);
          font-family: 'IBM Plex Mono', monospace; font-size: 0.58rem; font-weight: 600;
          letter-spacing: 1px; text-transform: uppercase; cursor: pointer;
          border-bottom: 2px solid transparent; transition: all 0.2s;
        }
        .tab-btn.active { color: var(--orange); border-bottom-color: var(--orange); }
        .tab-btn:hover:not(.active) { color: var(--text); }
        .tab-content { flex: 1; overflow-y: auto; }

        /* ── Trip selector bar ── */
        .trip-selector-bar {
          display: flex; align-items: center; gap: 12px;
          background: #111; border-bottom: 1px solid var(--border);
          padding: 10px 24px;
        }
        .trip-selector-label {
          font-size: 0.6rem; text-transform: uppercase; letter-spacing: 2px;
          color: var(--orange); white-space: nowrap; flex-shrink: 0;
        }
        .trip-select-wrap { flex: 1; position: relative; }
        .trip-select {
          width: 100%; background: var(--bg); border: 1px solid var(--border);
          color: var(--text); font-family: 'IBM Plex Mono', monospace;
          font-size: 0.88rem; padding: 8px 12px; outline: none;
          appearance: none; cursor: pointer;
        }
        .trip-select:focus { border-color: var(--orange); }

        /* ── Calculator screens ── */
        .c-screen { display: flex; flex-direction: column; }
        .c-topbar { background: var(--panel); border-bottom: 1px solid var(--border); padding: 18px 24px 14px; display: flex; align-items: center; justify-content: space-between; }
        .c-topbar-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; letter-spacing: 2px; line-height: 1; }
        .c-topbar-sub { font-size: 0.6rem; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; margin-top: 3px; }
        .c-icon-btn { background: none; border: 1px solid var(--border); color: var(--muted); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1rem; transition: all 0.2s; flex-shrink: 0; }
        .c-icon-btn:hover { border-color: var(--orange); color: var(--orange); }
        .c-body { flex: 1; padding: 20px 24px; display: flex; flex-direction: column; gap: 12px; }
        .c-group-label { font-size: 0.58rem; text-transform: uppercase; letter-spacing: 2px; color: var(--orange); margin-top: 4px; }
        .c-field { display: flex; flex-direction: column; gap: 5px; }
        .c-field label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); }
        .c-input-wrap { display: flex; align-items: center; background: var(--bg); border: 1px solid var(--border); transition: border-color 0.2s; }
        .c-input-wrap:focus-within { border-color: var(--orange); }
        .c-prefix { padding: 0 12px; color: var(--orange); font-size: 0.85rem; font-weight: 600; border-right: 1px solid var(--border); height: 46px; display: flex; align-items: center; min-width: 46px; justify-content: center; flex-shrink: 0; }
        .c-input-wrap input { background: transparent; border: none; outline: none; color: var(--text); font-family: 'IBM Plex Mono', monospace; font-size: 0.95rem; padding: 0 14px; height: 46px; width: 100%; }
        .c-input-wrap input::placeholder { color: var(--muted); }
        .c-error { color: var(--red); font-size: 0.7rem; }
        .c-actions { display: flex; flex-direction: column; gap: 8px; }
        .c-btn-primary { width: 100%; background: var(--orange); color: #fff; border: none; font-family: 'Bebas Neue', sans-serif; font-size: 1.15rem; letter-spacing: 2px; padding: 15px; cursor: pointer; transition: background 0.2s; }
        .c-btn-primary:hover { background: #c94515; }
        .c-btn-ghost { width: 100%; background: transparent; color: var(--muted); border: 1px solid var(--border); font-family: 'Bebas Neue', sans-serif; font-size: 1.05rem; letter-spacing: 2px; padding: 13px; cursor: pointer; transition: all 0.2s; }
        .c-btn-ghost:hover { border-color: var(--red); color: var(--red); }
        .c-btn-ghost.sm { width: auto; font-size: 0.7rem; padding: 6px 12px; letter-spacing: 1px; }
        .c-btn-save { width: 100%; background: var(--orange); color: #fff; border: none; font-family: 'Bebas Neue', sans-serif; font-size: 1.05rem; letter-spacing: 2px; padding: 14px; cursor: pointer; transition: all 0.2s; margin-top: 4px; }
        .c-btn-save:hover { background: #c94515; }
        .c-btn-save.saved { background: #2a6a3a; }
        .c-footer { padding: 16px 24px 32px; }

        .pending-bar { background: #1a1a0a; border: 1px solid #3a3010; padding: 10px 14px; font-size: 0.68rem; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .pending-note { color: var(--muted); margin-left: auto; }

        /* results */
        .c-results { display: flex; flex-direction: column; gap: 12px; }
        .c-results-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); }
        .c-breakdown { background: var(--panel); border: 1px solid var(--border); }
        .c-cost-row { display: flex; justify-content: space-between; font-size: 0.72rem; padding: 9px 14px; border-bottom: 1px solid var(--border); color: var(--muted); }
        .c-cost-row:last-child { border-bottom: none; }
        .c-cost-val { color: var(--text); }
        .c-big-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .c-stat { background: var(--panel); border: 1px solid var(--border); padding: 16px 14px; }
        .c-stat-label { font-size: 0.58rem; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 6px; }
        .c-stat-val { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; line-height: 1; }

        .positive { color: var(--green); }
        .negative { color: var(--red); }

        /* ── Load / Fuel ── */
        .lt-wrap { padding: 20px 24px; display: flex; flex-direction: column; gap: 12px; }
        .lt-form { display: flex; flex-direction: column; gap: 10px; background: var(--panel); border: 1px solid var(--border); padding: 16px; }
        .lt-row { display: flex; gap: 10px; }
        .lt-summary { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--panel); border: 1px solid var(--border); font-size: 0.75rem; color: var(--muted); }
        .lt-total { font-weight: 600; color: var(--green); font-size: 0.9rem; }
        .lt-list { display: flex; flex-direction: column; gap: 8px; }
        .lt-card { background: var(--panel); border: 1px solid var(--border); padding: 14px; display: grid; grid-template-columns: 28px 1fr auto; grid-template-rows: auto auto; gap: 4px 10px; position: relative; }
        .lt-num { grid-row: 1/3; font-family: 'Bebas Neue', sans-serif; font-size: 1.3rem; color: var(--border); align-self: center; }
        .lt-route { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .lt-city { font-size: 0.78rem; font-weight: 600; padding: 2px 8px; }
        .lt-city.pickup { background: #1a2a1a; color: #7ab87a; }
        .lt-city.drop { background: #2a1a0a; color: var(--orange); }
        .lt-arrow { color: var(--border); }
        .lt-pay { font-size: 0.95rem; font-weight: 600; color: var(--green); grid-column: 3; grid-row: 1; }
        .lt-date { font-size: 0.65rem; color: var(--muted); grid-column: 2; }
        .lt-del { position: absolute; top: 8px; right: 10px; background: none; border: none; color: var(--border); cursor: pointer; font-size: 0.8rem; transition: color 0.2s; }
        .lt-del:hover { color: var(--red); }

        /* ── Trips tab ── */
        .ih-wrap { padding: 20px 24px; display: flex; flex-direction: column; gap: 10px; }
        .trip-calc-header { font-size: 0.56rem; text-transform: uppercase; letter-spacing: 2px; color: var(--orange); padding-bottom: 6px; border-bottom: 1px solid var(--border); }
        .trip-cost-breakdown { background: var(--bg); border: 1px solid var(--border); }
        .trip-breakdown-row { display: flex; justify-content: space-between; font-size: 0.7rem; padding: 7px 12px; border-bottom: 1px solid var(--border); color: var(--muted); }
        .trip-breakdown-row:last-child { border-bottom: none; }
        .trip-no-calc { font-size: 0.7rem; color: var(--muted); padding: 8px 0; }

        .ih-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 4px; }
        .ih-stat { background: var(--panel); border: 1px solid var(--border); padding: 14px; }
        .ih-stat.full { grid-column: 1 / -1; }
        .ih-stat.highlight { border-color: var(--orange); }
        .ih-stat-label { font-size: 0.58rem; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 6px; }
        .ih-stat-val { font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; line-height: 1; }

        .ih-row { background: var(--panel); border: 1px solid var(--border); padding: 14px; display: flex; flex-direction: column; gap: 10px; }
        .ih-row-top { display: flex; align-items: center; gap: 8px; }
        .trip-checkbox { width: 18px; height: 18px; accent-color: var(--red); cursor: pointer; flex-shrink: 0; }
        .ih-del-btn { background: #3a1010; border: 1px solid #5a2020; color: var(--red); height: 28px; padding: 0 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-family: 'Bebas Neue', sans-serif; font-size: 0.75rem; letter-spacing: 1px; flex-shrink: 0; transition: all 0.2s; }
        .ih-del-btn:hover { background: #5a2020; }
        .ih-label { font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 2px; color: var(--orange); }
        .ih-date { font-size: 0.65rem; color: var(--muted); }

        .trip-badges { display: flex; gap: 8px; flex-wrap: wrap; }
        .trip-badge { font-size: 0.68rem; padding: 3px 10px; border-radius: 2px; }
        .load-badge { background: #1a2a1a; color: #7ab87a; }
        .fuel-badge { background: #2a1a0a; color: var(--orange); }
        .mi-badge { background: #0e1a2a; color: #6ab0e8; }

        .ih-summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .ih-mini-stat { background: var(--bg); border: 1px solid var(--border); padding: 10px 12px; }
        .ih-mini-label { font-size: 0.55rem; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 4px; }
        .ih-mini-val { font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; line-height: 1; }

        .ih-detail { border-top: 1px solid var(--border); padding-top: 10px; display: flex; flex-direction: column; gap: 4px; }
        .ih-detail-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 1px; color: var(--orange); margin-bottom: 4px; }
        .ih-detail-row { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--muted); padding: 5px 0; border-bottom: 1px solid var(--border); }
        .ih-detail-row:last-child { border-bottom: none; }

        .fuel-detail-tag { font-size: 0.68rem; padding: 2px 8px; background: #2a1a0a; color: var(--orange); border-radius: 2px; }
        .def-tag { background: #0e1a2a; color: #6ab0e8; }

        .mi-preview { display: flex; justify-content: space-between; align-items: center; background: #0e1a0e; border: 1px solid #2a4a2a; padding: 10px 14px; }
        .mi-preview-label { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); }
        .mi-preview-val { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; color: var(--green); line-height: 1; }
        .c-btn-primary.mi-saved { background: #2a6a3a; }

        .mi-card { background: var(--panel); border: 1px solid var(--border); padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; position: relative; }
        .mi-card-top { display: flex; align-items: center; gap: 10px; }
        .mi-week { font-size: 0.85rem; font-weight: 600; color: var(--text); flex: 1; }
        .mi-miles { font-family: 'Bebas Neue', sans-serif; font-size: 1.3rem; color: var(--green); line-height: 1; }
        .mi-card-bottom { display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--muted); }
        .mi-date { color: var(--muted); }

        .c-empty { text-align: center; color: var(--muted); padding: 40px 20px; font-size: 0.8rem; border: 1px solid var(--border); }
      `}</style>

      <div className="app">
        <div className="tabs">
          {TABS.map((t, i) => (
            <button key={t} className={"tab-btn" + (tab === i ? " active" : "")} onClick={() => setTab(i)}>
              {t}
              {i === 4 && Object.keys(trips).length > 0 && (
                <span style={{ color: 'var(--orange)' }}> {Object.keys(trips).length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Trip selector shown on Loads, Fuel, Mileage tabs only */}
        {tab !== 0 && tab !== 4 && (
          <TripSelector
            activeTripNum={activeTripNum}
            onChange={setActiveTripNum}
            trips={trips}
          />
        )}

        <div className="tab-content">
          {tab === 0 && <Calculator />}
          {tab === 1 && <LoadTracker activeTripNum={activeTripNum} trips={trips} setTrips={setTrips} />}
          {tab === 2 && <FuelTracker activeTripNum={activeTripNum} trips={trips} setTrips={setTrips} />}
          {tab === 3 && <Mileage activeTripNum={activeTripNum} trips={trips} setTrips={setTrips} />}
          {tab === 4 && <Trips trips={trips} setTrips={setTrips} />}
        </div>
      </div>
    </>
  );
}