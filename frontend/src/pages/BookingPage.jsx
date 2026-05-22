import { useState, useEffect } from 'react';

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function fmtDateLong(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtDateShort(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Next 14 days, skip today before 5pm
function getAvailableDates() {
  const dates = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + (i === 0 ? 1 : i)); // start tomorrow
    dates.push(d);
  }
  return dates;
}

export default function BookingPage() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const availableDates = getAvailableDates();

  async function selectDate(day) {
    setSelectedDate(day);
    setSelectedTime(null);
    setSlots([]);
    setLoadingSlots(true);
    try {
      const r = await fetch(`/api/booking/slots?date=${localDateStr(day)}`);
      const data = await r.json();
      setSlots(data);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Please enter your name.');
    if (!selectedDate || !selectedTime) return setError('Please select a date and time.');
    setSubmitting(true);
    try {
      const r = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          reason: form.reason,
          date: localDateStr(selectedDate),
          time: selectedTime,
        }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error || 'Booking failed');
      }
      setConfirmed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <div className="booking-page">
        <div className="booking-card booking-confirmed">
          <div className="booking-confirmed-icon">✓</div>
          <h2>Appointment Confirmed!</h2>
          <p>
            <strong>{fmtDateLong(selectedDate)}</strong> at <strong>{fmtTime(selectedTime)}</strong>
          </p>
          <p className="booking-confirmed-sub">
            {form.email ? `A confirmation will be sent to ${form.email}.` : 'See you then!'}
          </p>
          <p className="booking-confirmed-sub">You can close this window.</p>
        </div>
      </div>
    );
  }

  const showTimeSlots = selectedDate && !loadingSlots;
  const showForm = selectedDate && selectedTime;

  return (
    <div className="booking-page">
      <div className="booking-header">
        <div className="booking-logo">📅</div>
        <h1>Book an Appointment</h1>
        <p>Select a date and time that works for you.</p>
      </div>

      <div className="booking-card">
        {/* Step 1: Date */}
        <div className="booking-section">
          <h3 className="booking-section-title">
            <span className="booking-step-num">1</span>
            Select a Date
          </h3>
          <div className="booking-date-strip">
            {availableDates.map(day => {
              const isSelected = selectedDate && localDateStr(day) === localDateStr(selectedDate);
              return (
                <button
                  key={localDateStr(day)}
                  className={`booking-date-btn${isSelected ? ' active' : ''}`}
                  onClick={() => selectDate(day)}
                >
                  <span className="booking-date-dow">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="booking-date-num">{day.getDate()}</span>
                  <span className="booking-date-mon">
                    {day.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Time slots */}
        {selectedDate && (
          <div className="booking-section">
            <h3 className="booking-section-title">
              <span className="booking-step-num">2</span>
              Select a Time
              <span style={{ fontSize: 13, fontWeight: 400, color: '#7f8c9a', marginLeft: 8 }}>
                {fmtDateShort(selectedDate)}
              </span>
            </h3>
            {loadingSlots ? (
              <div style={{ color: '#b0bec5', fontSize: 14, padding: '8px 0' }}>Loading times…</div>
            ) : (
              <div className="booking-slots">
                {slots.map(slot => (
                  <button
                    key={slot.time}
                    className={`booking-slot-btn${!slot.available ? ' taken' : ''}${selectedTime === slot.time ? ' active' : ''}`}
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                  >
                    {fmtTime(slot.time)}
                    {!slot.available && <span className="booking-slot-taken">Booked</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Info form */}
        {showForm && (
          <div className="booking-section">
            <h3 className="booking-section-title">
              <span className="booking-step-num">3</span>
              Your Information
            </h3>
            <form onSubmit={handleSubmit} className="booking-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="Jane Smith"
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email" className="form-input"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="jane@example.com"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    className="form-input"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="+1 555 000 0000"
                  />
                </div>
                <div className="form-group">
                  <label>Reason for Visit</label>
                  <input
                    className="form-input"
                    value={form.reason}
                    onChange={e => set('reason', e.target.value)}
                    placeholder="Annual physical, follow-up…"
                  />
                </div>
              </div>

              {error && (
                <div style={{ color: '#e74c3c', fontSize: 13, marginBottom: 8 }}>{error}</div>
              )}

              <div className="booking-summary">
                <strong>📅 {fmtDateLong(selectedDate)}</strong> at <strong>{fmtTime(selectedTime)}</strong>
              </div>

              <button type="submit" className="booking-submit-btn" disabled={submitting}>
                {submitting ? 'Confirming…' : 'Confirm Appointment →'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
