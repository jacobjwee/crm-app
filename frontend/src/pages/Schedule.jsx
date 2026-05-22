import { useState, useEffect, useRef } from 'react';
import { fetchContacts, fetchAppointments, createAppointment, updateAppointment, deleteAppointment, sendSchedule } from '../api';
import { toast } from '../lib/toast';
import { Avatar, PlusIcon, ChevronLeftIcon, ChevronRightIcon, CalendarIcon, SendIcon } from '../components/Icons';

const T = {
  bg: '#F6F5F1', surface: '#FFFFFF', surfaceAlt: '#FAF9F5',
  border: '#E7E4DC', borderStrong: '#D9D5CB',
  text: '#0F1419', textDim: '#5C6470', textFaint: '#94A0AE',
  accent: '#2E8C82', accentSoft: '#E5F1EF',
  success: '#3E8C5A', warn: '#B6792B', danger: '#C3463A',
  mono: "'Geist Mono', ui-monospace, monospace",
};

const HOUR_START = 8;
const HOUR_END   = 18;
const SLOT_H     = 56;
const TOTAL_H    = (HOUR_END - HOUR_START) * 2 * SLOT_H;
const SLOTS      = Array.from({ length: (HOUR_END - HOUR_START) * 2 }, (_, i) => {
  const mins = HOUR_START * 60 + i * 30;
  return { h: Math.floor(mins / 60), m: mins % 60, mins };
});
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_META = {
  scheduled:  { color: T.accent,    bg: T.accentSoft, label: 'Scheduled' },
  completed:  { color: T.success,   bg: '#E6F2EA',    label: 'Completed' },
  cancelled:  { color: T.danger,    bg: '#FBE8E5',    label: 'Cancelled' },
  'no-show':  { color: T.textFaint, bg: '#F0EEE7',    label: 'No-show' },
  arrived:    { color: T.accent,    bg: T.accentSoft, label: 'Arrived' },
  'in-room':  { color: T.success,   bg: '#E6F2EA',    label: 'In room' },
  reschedule: { color: T.warn,      bg: '#FEF3E6',    label: 'Reschedule' },
  confirmed:  { color: T.textDim,   bg: '#F0EEE7',    label: 'Confirmed' },
};

const FROM_MESSAGING = [
  { name: 'Marcus Reid', type: 'Reschedule', note: 'Thursday appt conflict', time: '2h ago' },
  { name: 'Aisha Patel', type: 'Reschedule', note: 'Family emergency', time: '5h ago' },
  { name: 'S. Chen',     type: 'Waitlist',   note: 'Any opening this week', time: 'yesterday' },
];

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}
function weekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(d.getDate() + i); return d; });
}
function parseHM(dtStr) {
  const [h, m] = dtStr.replace(' ', 'T').slice(11, 16).split(':').map(Number);
  return { h, m };
}
function fmtTime(dtStr) {
  const { h, m } = parseHM(dtStr);
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function fmtHour(h) {
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh} ${h >= 12 ? 'pm' : 'am'}`;
}
function apptsByDay(appts, day) {
  return appts.filter(a => a.start_time.slice(0, 10) === localDateStr(day));
}
function apptStyle(appt) {
  const { h: sh, m: sm } = parseHM(appt.start_time);
  const { h: eh, m: em } = parseHM(appt.end_time);
  const startRel = sh * 60 + sm - HOUR_START * 60;
  const endRel   = eh * 60 + em - HOUR_START * 60;
  return {
    top:    Math.max(0, (startRel / 30) * SLOT_H),
    height: Math.max(((endRel - startRel) / 30) * SLOT_H, SLOT_H * 0.65),
  };
}
function getMonthGrid(year, month) {
  const monday = getMonday(new Date(year, month, 1));
  return Array.from({ length: 42 }, (_, i) => { const d = new Date(monday); d.setDate(d.getDate() + i); return d; });
}
function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(id); }, []);
  return now;
}

function NowLine({ now }) {
  const h = now.getHours(), m = now.getMinutes();
  if (h < HOUR_START || h >= HOUR_END) return null;
  const top = ((h * 60 + m - HOUR_START * 60) / 30) * SLOT_H;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, zIndex: 10, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.danger, flexShrink: 0, marginLeft: -3.5 }}/>
      <div style={{ flex: 1, height: 1, background: T.danger, opacity: 0.7 }}/>
    </div>
  );
}

function ApptModal({ appt, contacts, defaultDate, defaultTime, onSave, onDelete, onClose }) {
  const isEdit = !!appt?.id;
  const [form, setForm] = useState(() => {
    const date = appt ? appt.start_time.slice(0, 10) : (defaultDate || localDateStr(new Date()));
    const startT = appt ? appt.start_time.slice(11, 16) : (defaultTime || '09:00');
    const [sh, sm] = startT.split(':').map(Number);
    const endMin = sh * 60 + sm + 30;
    return {
      title:      appt?.title || '',
      contact_id: appt?.contact_id != null ? String(appt.contact_id) : '',
      date,
      startTime:  startT,
      endTime:    appt ? appt.end_time.slice(11, 16) : `${String(Math.floor(endMin/60)).padStart(2,'0')}:${String(endMin%60).padStart(2,'0')}`,
      notes:      appt?.notes || '',
      status:     appt?.status || 'scheduled',
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: T.surface, borderRadius: 12, width: 460, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', fontFamily: "'Geist', system-ui, sans-serif" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.text }}>{isEdit ? 'Edit Appointment' : 'New Appointment'}</h3>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: T.textFaint, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Appointment Type / Title *</label>
            <input autoFocus value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Annual Physical, Follow-up…" style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Patient</label>
            <select value={form.contact_id} onChange={e => set('contact_id', e.target.value)} style={inputStyle}>
              <option value="">— No patient linked —</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ''}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="arrived">Arrived</option>
                <option value="in-room">In Room</option>
                <option value="completed">Completed</option>
                <option value="no-show">No Show</option>
                <option value="cancelled">Cancelled</option>
                <option value="reschedule">Reschedule</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Start *</label>
              <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>End *</label>
              <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} style={inputStyle}/>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes…" rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}/>
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            {isEdit && (
              <button type="button" onClick={() => onDelete(appt.id)} style={{ ...btn, background: '#FBE8E5', color: T.danger, border: `1px solid #F4C5BF` }}>Delete</button>
            )}
            <div style={{ flex: 1 }}/>
            <button type="button" onClick={onClose} style={{ ...btn, background: T.surface, color: T.text, border: `1px solid ${T.border}` }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ ...btn, background: T.accent, color: '#fff', border: 'none' }}>
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SendModal({ contacts, weekStart, onClose }) {
  const [rangeType,  setRangeType]  = useState('week');
  const [customStart,setCustomStart]= useState(localDateStr(weekStart));
  const [customEnd,  setCustomEnd]  = useState(localDateStr(new Date(weekStart.getTime() + 6*86400000)));
  const [channel,    setChannel]    = useState('email');
  const [recipType,  setRecipType]  = useState('custom');
  const [contactId,  setContactId]  = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [preview,    setPreview]    = useState([]);
  const [sending,    setSending]    = useState(false);

  const nextMonday = new Date(weekStart.getTime() + 7*86400000);
  const rangeStart = rangeType==='week' ? localDateStr(weekStart) : rangeType==='nextweek' ? localDateStr(nextMonday) : customStart;
  const rangeEnd   = rangeType==='week' ? localDateStr(new Date(weekStart.getTime()+6*86400000)) : rangeType==='nextweek' ? localDateStr(new Date(nextMonday.getTime()+6*86400000)) : customEnd;

  useEffect(() => {
    fetchAppointments(`${rangeStart}T00:00:00`, `${rangeEnd}T23:59:59`).then(setPreview).catch(()=>setPreview([]));
  }, [rangeStart, rangeEnd]);

  async function handleSend() {
    const to  = recipType==='custom' ? customTo.trim() : null;
    const cid = recipType==='contact' ? contactId : null;
    if (!to && !cid) return toast.error('Choose a recipient');
    setSending(true);
    try {
      const r = await sendSchedule({ start:`${rangeStart}T00:00:00`, end:`${rangeEnd}T23:59:59`, channel, to:to||undefined, contact_id:cid||undefined });
      toast.success(`Schedule sent — ${r.sent} appointment${r.sent!==1?'s':''}`);
      onClose();
    } catch(err) { toast.error(err.message); }
    finally { setSending(false); }
  }

  const fmtRange = () => {
    const s = new Date(`${rangeStart}T12:00:00`), e = new Date(`${rangeEnd}T12:00:00`);
    return `${s.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${e.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
  };

  const toggleBtn = (active) => ({ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', border: `1px solid ${active ? T.accent : T.border}`, background: active ? T.accentSoft : T.surface, color: active ? T.accent : T.textDim });

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:T.surface,borderRadius:12,width:520,boxShadow:'0 8px 32px rgba(0,0,0,0.18)',fontFamily:"'Geist',system-ui,sans-serif" }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'18px 22px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center' }}>
          <h3 style={{ margin:0,fontSize:15,fontWeight:600,color:T.text }}>Send Schedule</h3>
          <button onClick={onClose} style={{ marginLeft:'auto',background:'none',border:'none',fontSize:20,color:T.textFaint,cursor:'pointer' }}>×</button>
        </div>
        <div style={{ padding:'18px 22px',display:'flex',flexDirection:'column',gap:16 }}>
          <div>
            <label style={labelStyle}>Date Range</label>
            <div style={{ display:'flex',gap:6,marginBottom:8 }}>
              {[{v:'week',l:'This Week'},{v:'nextweek',l:'Next Week'},{v:'custom',l:'Custom'}].map(o=>(
                <button key={o.v} style={toggleBtn(rangeType===o.v)} onClick={()=>setRangeType(o.v)}>{o.l}</button>
              ))}
            </div>
            {rangeType==='custom' && (
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8 }}>
                <div><label style={{ ...labelStyle,marginBottom:4 }}>From</label><input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} style={inputStyle}/></div>
                <div><label style={{ ...labelStyle,marginBottom:4 }}>To</label><input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} style={inputStyle}/></div>
              </div>
            )}
            <div style={{ fontSize:11.5,color:T.textFaint,fontFamily:T.mono }}>{fmtRange()} · {preview.length} appt{preview.length!==1?'s':''}</div>
          </div>
          {preview.length>0 && (
            <div style={{ background:T.surfaceAlt,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden' }}>
              {preview.slice(0,6).map((a,i)=>{
                const meta = STATUS_META[a.status]||STATUS_META.scheduled;
                return (
                  <div key={a.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderBottom:i<preview.slice(0,6).length-1?`1px solid ${T.border}`:'none' }}>
                    <span style={{ width:3,height:28,borderRadius:2,background:meta.color,flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12.5,fontWeight:500,color:T.text }}>{a.title}</div>
                      {a.contact_name&&<div style={{ fontSize:11,color:T.textFaint }}>{a.contact_name}</div>}
                    </div>
                    <span style={{ fontSize:11,color:T.textFaint,fontFamily:T.mono,whiteSpace:'nowrap' }}>
                      {new Date(`${a.start_time.slice(0,10)}T12:00:00`).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} {fmtTime(a.start_time)}
                    </span>
                  </div>
                );
              })}
              {preview.length>6&&<div style={{ fontSize:11.5,color:T.textFaint,textAlign:'center',padding:'6px 0' }}>+{preview.length-6} more</div>}
            </div>
          )}
          <div>
            <label style={labelStyle}>Send via</label>
            <div style={{ display:'flex',gap:6 }}>
              <button style={toggleBtn(channel==='email')} onClick={()=>setChannel('email')}>Email</button>
              <button style={toggleBtn(channel==='sms')}   onClick={()=>setChannel('sms')}>SMS</button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Recipient</label>
            <div style={{ display:'flex',gap:6,marginBottom:8 }}>
              <button style={toggleBtn(recipType==='custom')}  onClick={()=>setRecipType('custom')}>Enter manually</button>
              <button style={toggleBtn(recipType==='contact')} onClick={()=>setRecipType('contact')}>From patients</button>
            </div>
            {recipType==='custom'
              ? <input value={customTo} onChange={e=>setCustomTo(e.target.value)} placeholder={channel==='sms'?'+1 555 000 0000':'email@example.com'} style={inputStyle}/>
              : <select value={contactId} onChange={e=>setContactId(e.target.value)} style={inputStyle}>
                  <option value="">— Select a patient —</option>
                  {contacts.filter(c=>channel==='sms'?c.phone:c.email).map(c=>(
                    <option key={c.id} value={c.id}>{c.name} ({channel==='sms'?c.phone:c.email})</option>
                  ))}
                </select>
            }
          </div>
        </div>
        <div style={{ padding:'0 22px 20px',display:'flex',gap:8,justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ ...btn,background:T.surface,color:T.text,border:`1px solid ${T.border}` }}>Cancel</button>
          <button onClick={handleSend} disabled={sending} style={{ ...btn,background:T.accent,color:'#fff',border:'none',display:'flex',alignItems:'center',gap:6 }}>
            <SendIcon size={13}/>{sending?'Sending…':'Send Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

function WeekView({ days, appointments, onSlotClick, onApptClick }) {
  const gridRef = useRef(null);
  const today   = localDateStr(new Date());
  const now     = useNow();

  useEffect(() => {
    if (!gridRef.current) return;
    const scrollTarget = Math.max(0, ((new Date().getHours() * 60 - HOUR_START * 60 - 60) / 30) * SLOT_H);
    gridRef.current.scrollTop = scrollTarget;
  }, []);

  function handleColClick(e, day) {
    if (e.target !== e.currentTarget && !e.target.dataset.slot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y    = e.clientY - rect.top + e.currentTarget.parentElement.scrollTop;
    const slot = Math.floor(y / SLOT_H);
    const totalMins = HOUR_START * 60 + slot * 30;
    const h = Math.floor(totalMins / 60), m = totalMins % 60;
    onSlotClick(localDateStr(day), `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden', minHeight: 0 }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt, flexShrink: 0 }}>
        <div style={{ borderRight: `1px solid ${T.border}` }}/>
        {days.map((day, i) => {
          const ds = localDateStr(day);
          const isToday = ds === today;
          return (
            <div key={ds} style={{
              textAlign: 'center', padding: '10px 4px',
              background: isToday ? T.accentSoft : 'transparent',
              borderRight: i < 6 ? `1px solid ${T.border}` : 'none',
            }}>
              <div style={{ fontSize: 10.5, color: isToday ? T.accent : T.textFaint, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>
                {DAY_NAMES[i]}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%', fontSize: 13.5, fontWeight: isToday ? 700 : 400,
                background: isToday ? T.accent : 'transparent',
                color: isToday ? '#fff' : T.text,
              }}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={gridRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', height: TOTAL_H, position: 'relative' }}>
          {/* Time gutter */}
          <div style={{ borderRight: `1px solid ${T.border}` }}>
            {SLOTS.map(({ h, m, mins }) => (
              <div key={mins} style={{ height: SLOT_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 3 }}>
                {m === 0 && <span style={{ fontSize: 10, color: T.textFaint, fontFamily: T.mono }}>{fmtHour(h)}</span>}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, i) => {
            const ds      = localDateStr(day);
            const isToday = ds === today;
            const dayAppts= apptsByDay(appointments, day);
            return (
              <div key={ds} style={{
                position: 'relative',
                background: isToday ? `${T.accentSoft}60` : 'transparent',
                borderRight: i < 6 ? `1px solid ${T.border}` : 'none',
                cursor: 'crosshair',
              }} onClick={e => handleColClick(e, day)}>
                {/* Slot lines */}
                {SLOTS.map(({ m, mins }) => (
                  <div key={mins} data-slot="1" style={{
                    height: SLOT_H, borderBottom: `1px solid ${m === 0 ? T.border : T.border + '80'}`,
                    boxSizing: 'border-box',
                  }}/>
                ))}

                {/* Now line */}
                {isToday && <NowLine now={now}/>}

                {/* Appointment blocks */}
                {dayAppts.map(appt => {
                  const { top, height } = apptStyle(appt);
                  const meta = STATUS_META[appt.status] || STATUS_META.scheduled;
                  return (
                    <div
                      key={appt.id}
                      onClick={e => { e.stopPropagation(); onApptClick(appt); }}
                      title={`${appt.title}${appt.contact_name ? ` — ${appt.contact_name}` : ''}`}
                      style={{
                        position: 'absolute', left: 2, right: 2, top, height,
                        background: meta.bg, borderLeft: `2px solid ${meta.color}`,
                        borderRadius: 5, padding: '3px 6px', overflow: 'hidden',
                        cursor: 'pointer', zIndex: 2,
                      }}
                    >
                      <div style={{ fontSize: 10, color: meta.color, fontFamily: T.mono, fontWeight: 600 }}>{fmtTime(appt.start_time)}</div>
                      <div style={{ fontSize: 11.5, color: T.text, fontWeight: 600, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appt.title}</div>
                      {appt.contact_name && height > SLOT_H * 0.9 && (
                        <div style={{ fontSize: 10.5, color: T.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appt.contact_name}</div>
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

function MonthView({ year, month, appointments, onDayClick }) {
  const grid  = getMonthGrid(year, month);
  const today = localDateStr(new Date());
  return (
    <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ padding: '8px 12px', fontSize: 10.5, fontWeight: 600, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {grid.map(day => {
          const ds = localDateStr(day);
          const inMonth  = day.getMonth() === month;
          const isToday  = ds === today;
          const dayAppts = apptsByDay(appointments, day);
          return (
            <div
              key={ds}
              onClick={() => onDayClick(day)}
              style={{
                minHeight: 80, padding: '6px 8px', cursor: 'pointer',
                borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
                background: isToday ? T.accentSoft : 'transparent',
                opacity: inMonth ? 1 : 0.4,
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', fontSize: 12, fontWeight: isToday ? 700 : 400, background: isToday ? T.accent : 'transparent', color: isToday ? '#fff' : T.text, marginBottom: 4 }}>
                {day.getDate()}
              </div>
              {dayAppts.slice(0, 3).map(a => {
                const meta = STATUS_META[a.status] || STATUS_META.scheduled;
                return (
                  <div key={a.id} style={{ fontSize: 10.5, padding: '1px 5px', borderRadius: 3, marginBottom: 2, background: meta.bg, borderLeft: `2px solid ${meta.color}`, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fmtTime(a.start_time)} {a.title}
                  </div>
                );
              })}
              {dayAppts.length > 3 && <div style={{ fontSize: 10.5, color: T.accent, fontWeight: 600 }}>+{dayAppts.length - 3} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Schedule() {
  const [view, setView]           = useState('week');
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [monthState, setMonthState] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });
  const [appointments, setAppointments] = useState([]);
  const [contacts,     setContacts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(null);
  const [showSend,     setShowSend]     = useState(false);

  const days = weekDays(weekStart);

  useEffect(() => { fetchContacts().then(setContacts).catch(()=>{}); }, []);

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
    fetchAppointments(start, end).then(setAppointments).catch(()=>{}).finally(()=>setLoading(false));
  }, [weekStart, view, monthState]);

  function prevPeriod() {
    if (view === 'week') setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate()-7); return n; });
    else setMonthState(({ year, month }) => month===0 ? {year:year-1,month:11} : {year,month:month-1});
  }
  function nextPeriod() {
    if (view === 'week') setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate()+7); return n; });
    else setMonthState(({ year, month }) => month===11 ? {year:year+1,month:0} : {year,month:month+1});
  }
  function goToday() {
    const n = new Date();
    setWeekStart(getMonday(n));
    setMonthState({ year: n.getFullYear(), month: n.getMonth() });
  }

  async function handleSave(data) {
    try {
      if (modal?.type === 'edit') {
        const updated = await updateAppointment(modal.appt.id, data);
        setAppointments(prev => prev.map(a => a.id===updated.id ? updated : a));
        toast.success('Appointment updated');
      } else {
        const created = await createAppointment(data);
        setAppointments(prev => [...prev, created]);
        toast.success('Appointment created');
      }
      setModal(null);
    } catch(err) { toast.error(err.message); }
  }

  async function handleDelete(id) {
    try {
      await deleteAppointment(id);
      setAppointments(prev => prev.filter(a => a.id!==id));
      toast.success('Appointment deleted');
      setModal(null);
    } catch(err) { toast.error(err.message); }
  }

  const periodLabel = view === 'week'
    ? (() => {
        const s = days[0], e = days[6];
        const opts = { month: 'short', day: 'numeric' };
        return s.getMonth() === e.getMonth()
          ? `${s.toLocaleDateString('en-US', opts)} – ${e.getDate()}, ${e.getFullYear()}`
          : `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
      })()
    : new Date(monthState.year, monthState.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const weekApptCount = view === 'week' ? appointments.length : 0;

  return (
    <div style={{
      display: 'flex', margin: '-28px -32px', height: 'calc(100vh - 56px)',
      fontFamily: "'Geist', system-ui, sans-serif", color: T.text, background: T.bg,
    }}>
      {/* Main calendar area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ padding: '18px 28px 14px', background: T.surface, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>SCHEDULE</div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: T.text }}>{periodLabel}</h1>
              {view === 'week' && (
                <div style={{ fontSize: 12, color: T.textDim, marginTop: 3 }}>
                  {weekApptCount} appointment{weekApptCount !== 1 ? 's' : ''} this week
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <button onClick={() => setShowSend(true)} style={{ ...secondaryBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <SendIcon size={13}/> Send Schedule
              </button>
              <button onClick={() => setModal({ type: 'create' })} style={{ ...primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <PlusIcon size={13} strokeWidth={2.2}/> Book Appointment
              </button>
            </div>
          </div>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={prevPeriod} style={navBtn}>
                <ChevronLeftIcon size={14}/>
              </button>
              <button onClick={nextPeriod} style={navBtn}>
                <ChevronRightIcon size={14}/>
              </button>
              <button onClick={goToday} style={{ ...secondaryBtn, padding: '5px 12px', fontSize: 12 }}>Today</button>
            </div>
            <div style={{ flex: 1 }}/>
            {/* View toggle */}
            <div style={{ display: 'flex', background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 7, padding: 2, gap: 2 }}>
              {['week', 'month'].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: '4px 14px', borderRadius: 5, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
                  background: view === v ? T.surface : 'transparent',
                  color: view === v ? T.text : T.textDim,
                  boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px 20px 16px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: T.textFaint }}>Loading…</div>
          ) : view === 'week' ? (
            <WeekView
              days={days}
              appointments={appointments}
              onSlotClick={(date, time) => setModal({ type: 'create', date, time })}
              onApptClick={appt => setModal({ type: 'edit', appt })}
            />
          ) : (
            <MonthView
              year={monthState.year}
              month={monthState.month}
              appointments={appointments}
              onDayClick={day => { setWeekStart(getMonday(day)); setView('week'); }}
            />
          )}
        </div>

        {/* Status legend */}
        {!loading && (
          <div style={{ padding: '8px 20px 12px', borderTop: `1px solid ${T.border}`, background: T.surface, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {Object.entries(STATUS_META).map(([s, m]) => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.textDim }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: m.color, flexShrink: 0 }}/>
                {m.label}
              </span>
            ))}
            <span style={{ flex: 1 }}/>
            <span style={{ fontSize: 11, color: T.textFaint }}>Click empty slot to book</span>
          </div>
        )}
      </div>

      {/* Right rail */}
      <aside style={{ width: 280, background: T.surface, borderLeft: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
        {/* From messaging */}
        <div style={{ padding: '18px 18px 12px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, flex: 1 }}>From messaging</div>
            <span style={{ fontSize: 10.5, fontFamily: T.mono, color: T.warn, background: '#FEF3E6', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{FROM_MESSAGING.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FROM_MESSAGING.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 10px', borderRadius: 8, background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                <Avatar name={item.name} size={28}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: item.type === 'Reschedule' ? T.warn : T.accent, fontWeight: 500 }}>{item.type}</div>
                  <div style={{ fontSize: 10.5, color: T.textFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.note}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: T.textFaint, fontFamily: T.mono }}>{item.time}</span>
                  <button style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 4, border: `1px solid ${T.border}`, background: T.surface, color: T.text, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Book</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* This week stats */}
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 10 }}>This week</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Booked',    value: appointments.length, color: T.accent },
              { label: 'Completed', value: appointments.filter(a=>a.status==='completed').length, color: T.success },
              { label: 'No-shows',  value: appointments.filter(a=>a.status==='no-show').length, color: T.textFaint },
              { label: 'Open slots',value: Math.max(0, 20 - appointments.length), color: T.warn },
            ].map((s, i) => (
              <div key={i} style={{ padding: '8px 10px', borderRadius: 7, background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: T.mono }}>{s.value}</div>
                <div style={{ fontSize: 10.5, color: T.textDim, marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick book */}
        <div style={{ padding: '14px 18px', flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 10 }}>Quick book</div>
          <button onClick={() => setModal({ type: 'create' })} style={{
            width: '100%', padding: '9px 14px', borderRadius: 7, border: `1px dashed ${T.borderStrong}`,
            background: 'transparent', color: T.textDim, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <CalendarIcon size={13}/> New appointment
          </button>
        </div>
      </aside>

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
        <SendModal contacts={contacts} weekStart={weekStart} onClose={() => setShowSend(false)}/>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 11.5, fontWeight: 600, color: '#5C6470', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #E7E4DC', background: '#FAF9F5', fontFamily: 'inherit', fontSize: 13, color: '#0F1419', boxSizing: 'border-box', outline: 'none' };
const btn = { padding: '8px 16px', borderRadius: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const primaryBtn = { padding: '7px 14px', borderRadius: 7, background: '#2E8C82', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' };
const secondaryBtn = { padding: '7px 14px', borderRadius: 7, background: '#fff', color: '#0F1419', border: '1px solid #E7E4DC', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' };
const navBtn = { width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid #E7E4DC', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#5C6470' };
