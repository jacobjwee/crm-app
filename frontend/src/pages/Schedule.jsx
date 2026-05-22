import { useState, useEffect, useRef } from 'react';
import { fetchContacts, fetchAppointments, createAppointment, updateAppointment, deleteAppointment, sendSchedule } from '../api';
import { toast } from '../lib/toast';

// ── Calendar config ───────────────────────────────────────────────────────────
const HOUR_START  = 8;
const HOUR_END    = 18;
const SLOT_H      = 52;   // px per 30-min slot
const TOTAL_H     = (HOUR_END - HOUR_START) * 2 * SLOT_H;
const SLOTS       = Array.from({ length: (HOUR_END - HOUR_START) * 2 }, (_, i) => {
  const mins = HOUR_START * 60 + i * 30;
  return { h: Math.floor(mins / 60), m: mins % 60, mins };
});

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STATUS_COLORS = {
  scheduled: '#4facfe',
  completed: '#27ae60',
  cancelled: '#e74c3c',
  'no-show':  '#95a5a6',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function weekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function parseHM(dtStr) {
  const s = dtStr.replace(' ', 'T');
  const [h, m] = s.slice(11, 16).split(':').map(Number);
  return { h, m };
}

function fmtTime(dtStr) {
  const { h, m } = parseHM(dtStr);
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function fmtHour(h) {
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh} ${h >= 12 ? 'PM' : 'AM'}`;
}

function apptsByDay(appts, day) {
  const ds = localDateStr(day);
  return appts.filter(a => a.start_time.slice(0, 10) === ds);
}

function apptStyle(appt) {
  const { h: sh, m: sm } = parseHM(appt.start_time);
  const { h: eh, m: em } = parseHM(appt.end_time);
  const startRel = sh * 60 + sm - HOUR_START * 60;
  const endRel   = eh * 60 + em - HOUR_START * 60;
  return {
    top:    Math.max(0, (startRel / 30) * SLOT_H),
    height: Math.max(((endRel - startRel) / 30) * SLOT_H, SLOT_H * 0.6),
  };
}

function getMonthGrid(year, month) {
  const monday = getMonday(new Date(year, month, 1));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ── Now line ──────────────────────────────────────────────────────────────────

function NowLine({ now }) {
  const h = now.getHours();
  const m = now.getMinutes();
  if (h < HOUR_START || h >= HOUR_END) return null;
  const top = ((h * 60 + m - HOUR_START * 60) / 30) * SLOT_H;
  return (
    <div className="now-line" style={{ top }}>
      <div className="now-dot" />
    </div>
  );
}

// ── Appointment modal ─────────────────────────────────────────────────────────

function ApptModal({ appt, contacts, defaultDate, defaultTime, onSave, onDelete, onClose }) {
  const isEdit = !!appt?.id;
  const [form, setForm] = useState(() => {
    const date     = appt ? appt.start_time.slice(0, 10) : (defaultDate || localDateStr(new Date()));
    const startT   = appt ? appt.start_time.slice(11, 16) : (defaultTime || '09:00');
    const [sh, sm] = startT.split(':').map(Number);
    const endMin   = sh * 60 + sm + 30;
    const defaultEnd = `${String(Math.floor(endMin / 60)).padStart(2,'0')}:${String(endMin % 60).padStart(2,'0')}`;
    return {
      title:      appt?.title     || '',
      contact_id: appt?.contact_id != null ? String(appt.contact_id) : '',
      date,
      startTime:  startT,
      endTime:    appt ? appt.end_time.slice(11, 16) : defaultEnd,
      notes:      appt?.notes     || '',
      status:     appt?.status    || 'scheduled',
    };
  });
  const [saving, setSaving] = useState(false);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      await onSave({
        title:      form.title.trim(),
        contact_id: form.contact_id || null,
        start_time: `${form.date}T${form.startTime}:00`,
        end_time:   `${form.date}T${form.endTime}:00`,
        notes:      form.notes || null,
        status:     form.status,
      });
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Appointment' : 'New Appointment'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Appointment Type / Title *</label>
            <input
              className="form-input" autoFocus
              value={form.title} placeholder="e.g. Annual Physical, Follow-up…"
              onChange={e => set('title', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Patient</label>
            <select className="form-input" value={form.contact_id} onChange={e => set('contact_id', e.target.value)}>
              <option value="">— No patient linked —</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No Show</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start *</label>
              <input type="time" className="form-input" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
            </div>
            <div className="form-group">
              <label>End *</label>
              <input type="time" className="form-input" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea className="form-input" rows={3} value={form.notes} placeholder="Any notes…" onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="modal-actions">
            {isEdit && (
              <button type="button" className="btn btn-danger" onClick={() => onDelete(appt.id)}>Delete</button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Send schedule modal ───────────────────────────────────────────────────────

function SendModal({ contacts, weekStart, onClose }) {
  const [rangeType, setRangeType] = useState('week');
  const [customStart, setCustomStart] = useState(localDateStr(weekStart));
  const [customEnd,   setCustomEnd]   = useState(localDateStr(new Date(weekStart.getTime() + 6 * 86400000)));
  const [channel, setChannel]         = useState('email');
  const [recipType, setRecipType]     = useState('custom');
  const [contactId, setContactId]     = useState('');
  const [customTo, setCustomTo]       = useState('');
  const [preview, setPreview]         = useState([]);
  const [sending, setSending]         = useState(false);

  const nextMonday = new Date(weekStart.getTime() + 7 * 86400000);

  const rangeStart = rangeType === 'week'     ? localDateStr(weekStart)
    : rangeType === 'nextweek' ? localDateStr(nextMonday)
    : customStart;
  const rangeEnd   = rangeType === 'week'     ? localDateStr(new Date(weekStart.getTime() + 6 * 86400000))
    : rangeType === 'nextweek' ? localDateStr(new Date(nextMonday.getTime() + 6 * 86400000))
    : customEnd;

  useEffect(() => {
    fetchAppointments(`${rangeStart}T00:00:00`, `${rangeEnd}T23:59:59`)
      .then(setPreview)
      .catch(() => setPreview([]));
  }, [rangeStart, rangeEnd]);

  async function handleSend() {
    const to = recipType === 'custom' ? customTo.trim() : null;
    const cid = recipType === 'contact' ? contactId : null;
    if (!to && !cid) return toast.error('Choose a recipient');
    setSending(true);
    try {
      const r = await sendSchedule({
        start:      `${rangeStart}T00:00:00`,
        end:        `${rangeEnd}T23:59:59`,
        channel,
        to:         to || undefined,
        contact_id: cid || undefined,
      });
      toast.success(`Schedule sent — ${r.sent} appointment${r.sent !== 1 ? 's' : ''}`);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  const fmtRangeLabel = () => {
    const s = new Date(`${rangeStart}T12:00:00`);
    const e = new Date(`${rangeEnd}T12:00:00`);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3>Send Schedule</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Date range */}
          <div className="form-group">
            <label>Date Range</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {[{ v: 'week', l: 'This Week' }, { v: 'nextweek', l: 'Next Week' }, { v: 'custom', l: 'Custom' }].map(o => (
                <button
                  key={o.v}
                  className={`btn btn-sm ${rangeType === o.v ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setRangeType(o.v)}
                >{o.l}</button>
              ))}
            </div>
            {rangeType === 'custom' && (
              <div className="form-row">
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>From</label>
                  <input type="date" className="form-input" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>To</label>
                  <input type="date" className="form-input" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                </div>
              </div>
            )}
            <div style={{ fontSize: 12, color: '#7f8c9a', marginTop: 4 }}>
              {fmtRangeLabel()} · <strong>{preview.length}</strong> appointment{preview.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Appointment preview */}
          {preview.length > 0 && (
            <div className="send-preview">
              {preview.slice(0, 7).map(a => (
                <div key={a.id} className="send-preview-row">
                  <span className="send-preview-dot" style={{ background: STATUS_COLORS[a.status] || '#ccc' }} />
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <strong>{a.title}</strong>
                    {a.contact_name && <span style={{ color: '#7f8c9a' }}> — {a.contact_name}</span>}
                  </div>
                  <span style={{ fontSize: 12, color: '#7f8c9a', whiteSpace: 'nowrap' }}>
                    {new Date(`${a.start_time.slice(0,10)}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} {fmtTime(a.start_time)}
                  </span>
                </div>
              ))}
              {preview.length > 7 && (
                <div style={{ fontSize: 12, color: '#7f8c9a', textAlign: 'center', padding: '4px 0' }}>
                  +{preview.length - 7} more
                </div>
              )}
            </div>
          )}

          {/* Channel */}
          <div className="form-group">
            <label>Send via</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`btn btn-sm ${channel === 'email' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setChannel('email')}>✉ Email</button>
              <button className={`btn btn-sm ${channel === 'sms'   ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setChannel('sms')}>💬 SMS</button>
            </div>
          </div>

          {/* Recipient */}
          <div className="form-group">
            <label>Recipient</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button className={`btn btn-sm ${recipType === 'custom'  ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRecipType('custom')}>Enter manually</button>
              <button className={`btn btn-sm ${recipType === 'contact' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRecipType('contact')}>From contacts</button>
            </div>
            {recipType === 'custom'
              ? <input
                  className="form-input"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  placeholder={channel === 'sms' ? '+1 555 000 0000' : 'email@example.com'}
                />
              : <select className="form-input" value={contactId} onChange={e => setContactId(e.target.value)}>
                  <option value="">— Select a contact —</option>
                  {contacts.filter(c => channel === 'sms' ? c.phone : c.email).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({channel === 'sms' ? c.phone : c.email})
                    </option>
                  ))}
                </select>
            }
          </div>
        </div>

        <div className="modal-actions" style={{ padding: '0 24px 24px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
            {sending ? 'Sending…' : 'Send Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Week view ─────────────────────────────────────────────────────────────────

function WeekView({ days, appointments, onSlotClick, onApptClick }) {
  const gridRef = useRef(null);
  const today   = localDateStr(new Date());
  const now     = useNow();

  useEffect(() => {
    if (!gridRef.current) return;
    const nowH = new Date().getHours();
    const scrollTarget = Math.max(0, ((nowH * 60 - HOUR_START * 60 - 60) / 30) * SLOT_H);
    gridRef.current.scrollTop = scrollTarget;
  }, []);

  function handleColClick(e, day) {
    if (e.target !== e.currentTarget && !e.target.classList.contains('slot-line')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y    = e.clientY - rect.top + e.currentTarget.parentElement.scrollTop;
    const slot = Math.floor(y / SLOT_H);
    const totalMins = HOUR_START * 60 + slot * 30;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    onSlotClick(localDateStr(day), `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  }

  return (
    <div className="cal-card">
      {/* Day headers */}
      <div className="week-header">
        <div className="time-gutter-head" />
        {days.map((day, i) => {
          const ds = localDateStr(day);
          const isToday = ds === today;
          return (
            <div key={ds} className={`week-day-head${isToday ? ' today-head' : ''}`}>
              <span className="week-dow">{DAY_NAMES[i]}</span>
              <span className={`week-date-num${isToday ? ' today-circle' : ''}`}>{day.getDate()}</span>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div className="week-scroll" ref={gridRef}>
        <div className="week-grid" style={{ height: TOTAL_H }}>
          {/* Time labels */}
          <div className="time-gutter">
            {SLOTS.map(({ h, m, mins }) => (
              <div key={mins} className="time-label" style={{ height: SLOT_H }}>
                {m === 0 && <span>{fmtHour(h)}</span>}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, i) => {
            const ds = localDateStr(day);
            const isToday = ds === today;
            const dayAppts = apptsByDay(appointments, day);
            return (
              <div key={ds} className={`day-col${isToday ? ' today-col' : ''}`} onClick={e => handleColClick(e, day)}>
                {/* Slot lines */}
                {SLOTS.map(({ m, mins }) => (
                  <div key={mins} className={`slot-line${m === 0 ? ' hour-line' : ''}`} style={{ height: SLOT_H }} />
                ))}

                {/* Now line */}
                {isToday && <NowLine now={now} />}

                {/* Appointment blocks */}
                {dayAppts.map(appt => {
                  const { top, height } = apptStyle(appt);
                  const color = STATUS_COLORS[appt.status] || '#4facfe';
                  return (
                    <div
                      key={appt.id}
                      className="appt-block"
                      style={{ top, height, borderLeft: `3px solid ${color}`, background: `${color}18` }}
                      onClick={e => { e.stopPropagation(); onApptClick(appt); }}
                      title={`${appt.title}${appt.contact_name ? ` — ${appt.contact_name}` : ''}`}
                    >
                      <div className="appt-time">{fmtTime(appt.start_time)} – {fmtTime(appt.end_time)}</div>
                      <div className="appt-title">{appt.title}</div>
                      {appt.contact_name && height > SLOT_H && (
                        <div className="appt-patient">{appt.contact_name}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Month view ────────────────────────────────────────────────────────────────

function MonthView({ year, month, appointments, onDayClick }) {
  const grid  = getMonthGrid(year, month);
  const today = localDateStr(new Date());
  return (
    <div className="cal-card month-view">
      <div className="month-dow-row">
        {DAY_NAMES.map(d => <div key={d} className="month-dow">{d}</div>)}
      </div>
      <div className="month-grid">
        {grid.map(day => {
          const ds         = localDateStr(day);
          const inMonth    = day.getMonth() === month;
          const isToday    = ds === today;
          const dayAppts   = apptsByDay(appointments, day);
          return (
            <div
              key={ds}
              className={`month-cell${inMonth ? '' : ' other-month'}${isToday ? ' today-cell' : ''}`}
              onClick={() => onDayClick(day)}
            >
              <span className={`month-cell-num${isToday ? ' today-circle' : ''}`}>{day.getDate()}</span>
              {dayAppts.slice(0, 3).map(a => (
                <div
                  key={a.id}
                  className="month-appt-pill"
                  style={{ background: `${STATUS_COLORS[a.status] || '#4facfe'}22`, borderLeft: `3px solid ${STATUS_COLORS[a.status] || '#4facfe'}` }}
                >
                  {fmtTime(a.start_time)} {a.title}
                </div>
              ))}
              {dayAppts.length > 3 && (
                <div className="month-more">+{dayAppts.length - 3} more</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Schedule() {
  const [view, setView]           = useState('week');
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [monthState, setMonthState] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [appointments, setAppointments] = useState([]);
  const [contacts, setContacts]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState(null);  // null | {type:'create',date?,time?} | {type:'edit',appt}
  const [showSend, setShowSend]         = useState(false);

  const days = weekDays(weekStart);

  useEffect(() => { fetchContacts().then(setContacts).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    let start, end;
    if (view === 'week') {
      start = `${localDateStr(days[0])}T00:00:00`;
      end   = `${localDateStr(days[6])}T23:59:59`;
    } else {
      const first = new Date(monthState.year, monthState.month, 1);
      const last  = new Date(monthState.year, monthState.month + 1, 0);
      start = `${localDateStr(first)}T00:00:00`;
      end   = `${localDateStr(last)}T23:59:59`;
    }
    fetchAppointments(start, end)
      .then(setAppointments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [weekStart, view, monthState]);

  function prevPeriod() {
    if (view === 'week') {
      setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
    } else {
      setMonthState(({ year, month }) =>
        month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
    }
  }

  function nextPeriod() {
    if (view === 'week') {
      setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
    } else {
      setMonthState(({ year, month }) =>
        month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
    }
  }

  function goToday() {
    const now = new Date();
    setWeekStart(getMonday(now));
    setMonthState({ year: now.getFullYear(), month: now.getMonth() });
  }

  async function handleSave(data) {
    try {
      if (modal?.type === 'edit') {
        const updated = await updateAppointment(modal.appt.id, data);
        setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
        toast.success('Appointment updated');
      } else {
        const created = await createAppointment(data);
        setAppointments(prev => [...prev, created]);
        toast.success('Appointment created');
      }
      setModal(null);
    } catch (err) { toast.error(err.message); }
  }

  async function handleDelete(id) {
    try {
      await deleteAppointment(id);
      setAppointments(prev => prev.filter(a => a.id !== id));
      toast.success('Appointment deleted');
      setModal(null);
    } catch (err) { toast.error(err.message); }
  }

  const periodLabel = view === 'week'
    ? (() => {
        const s = days[0], e = days[6];
        const opts = { month: 'short', day: 'numeric' };
        if (s.getMonth() === e.getMonth()) {
          return `${s.toLocaleDateString('en-US', opts)} – ${e.getDate()}, ${e.getFullYear()}`;
        }
        return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
      })()
    : new Date(monthState.year, monthState.month, 1)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="page-header">
        <h1>Schedule</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => setShowSend(true)}>✉ Send Schedule</button>
          <button className="btn btn-primary"   onClick={() => setModal({ type: 'create' })}>+ New Appointment</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="sched-toolbar">
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={prevPeriod}>‹</button>
          <span className="cal-period">{periodLabel}</span>
          <button className="cal-nav-btn" onClick={nextPeriod}>›</button>
          <button className="btn btn-secondary btn-sm" onClick={goToday}>Today</button>
        </div>
        <div className="view-toggle">
          <button className={`vt-btn${view === 'week'  ? ' active' : ''}`} onClick={() => setView('week')}>Week</button>
          <button className={`vt-btn${view === 'month' ? ' active' : ''}`} onClick={() => setView('month')}>Month</button>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#b0bec5' }}>Loading…</div>}

      {!loading && view === 'week' && (
        <WeekView
          days={days}
          appointments={appointments}
          onSlotClick={(date, time) => setModal({ type: 'create', date, time })}
          onApptClick={appt => setModal({ type: 'edit', appt })}
        />
      )}

      {!loading && view === 'month' && (
        <MonthView
          year={monthState.year}
          month={monthState.month}
          appointments={appointments}
          onDayClick={day => { setWeekStart(getMonday(day)); setView('week'); }}
        />
      )}

      {/* Status legend */}
      {!loading && (
        <div className="status-legend">
          {Object.entries(STATUS_COLORS).map(([s, c]) => (
            <span key={s} className="legend-item">
              <span className="legend-dot" style={{ background: c }} />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          ))}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: '#b0bec5' }}>Click any empty slot to create an appointment</span>
        </div>
      )}

      {modal && (
        <ApptModal
          appt={modal.type === 'edit' ? modal.appt : null}
          contacts={contacts}
          defaultDate={modal.date}
          defaultTime={modal.time}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}

      {showSend && (
        <SendModal
          contacts={contacts}
          weekStart={weekStart}
          onClose={() => setShowSend(false)}
        />
      )}
    </div>
  );
}
