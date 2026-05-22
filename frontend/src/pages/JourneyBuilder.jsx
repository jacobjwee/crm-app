import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fetchJourney, createJourney, updateJourney } from '../api';
import { toast } from '../lib/toast';

// ─── Step metadata ─────────────────────────────────────────────────────────
const STEP_TYPES = {
  wait:          { label: 'Wait',          icon: '⏱', color: '#f7971e', bg: '#fff8ee' },
  send_email:    { label: 'Send Email',     icon: '✉',  color: '#2980b9', bg: '#eaf2fd' },
  send_sms:      { label: 'Send SMS',       icon: '💬', color: '#27ae60', bg: '#eafaf1' },
  update_status: { label: 'Update Status', icon: '🏷',  color: '#8e44ad', bg: '#f5eafb' },
};

const TRIGGER_OPTIONS = [
  { value: 'contact_created',        label: 'Contact is created' },
  { value: 'status_changed:active',  label: 'Status → Active' },
  { value: 'status_changed:lead',    label: 'Status → Lead' },
  { value: 'status_changed:inactive',label: 'Status → Inactive' },
];

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function uid() { return `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// ─── Step editors ──────────────────────────────────────────────────────────
function WaitEditor({ config, onChange }) {
  return (
    <div className="step-fields">
      <span style={{ fontSize: 14, color: '#7f8c9a' }}>Wait for</span>
      <input
        type="number" min={1} value={config.duration ?? 1}
        onChange={e => onChange({ ...config, duration: parseInt(e.target.value) || 1 })}
        className="step-inline-input" style={{ width: 60 }}
      />
      <select value={config.unit ?? 'days'} onChange={e => onChange({ ...config, unit: e.target.value })} className="step-inline-select">
        <option value="minutes">minutes</option>
        <option value="hours">hours</option>
        <option value="days">days</option>
      </select>
    </div>
  );
}

function SendEmailEditor({ config, onChange }) {
  return (
    <div className="step-fields" style={{ flexDirection: 'column', gap: 8 }}>
      <input
        value={config.subject ?? ''} placeholder="Subject line…"
        onChange={e => onChange({ ...config, subject: e.target.value })}
        className="step-text-input"
      />
      <textarea
        value={config.body ?? ''} placeholder="Email body…"
        onChange={e => onChange({ ...config, body: e.target.value })}
        className="step-textarea"
        rows={3}
      />
    </div>
  );
}

function SendSmsEditor({ config, onChange }) {
  return (
    <div className="step-fields" style={{ flexDirection: 'column', gap: 4 }}>
      <textarea
        value={config.body ?? ''} placeholder="SMS message…"
        onChange={e => onChange({ ...config, body: e.target.value })}
        className="step-textarea"
        rows={2}
        maxLength={1600}
      />
      {(config.body?.length ?? 0) > 0 && (
        <div style={{ fontSize: 12, color: '#95a5b3' }}>{config.body.length} / 160</div>
      )}
    </div>
  );
}

function UpdateStatusEditor({ config, onChange }) {
  return (
    <div className="step-fields">
      <span style={{ fontSize: 14, color: '#7f8c9a' }}>Set status to</span>
      <select value={config.status ?? 'active'} onChange={e => onChange({ ...config, status: e.target.value })} className="step-inline-select">
        <option value="active">Active</option>
        <option value="lead">Lead</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  );
}

// ─── Sortable step card ─────────────────────────────────────────────────────
function SortableStep({ step, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const meta = STEP_TYPES[step.type];
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function updateConfig(newConfig) {
    onUpdate({ ...step, config: newConfig });
  }

  return (
    <div ref={setNodeRef} style={style} className="journey-step-row">
      <div className="drag-handle" {...attributes} {...listeners} title="Drag to reorder">⣿</div>
      <div className="journey-step-card" style={{ borderLeft: `4px solid ${meta.color}`, background: meta.bg }}>
        <div className="step-card-header">
          <span className="step-badge" style={{ background: meta.color }}>
            {meta.icon} {meta.label}
          </span>
          <button className="step-delete-btn" onClick={onDelete} title="Remove step">×</button>
        </div>
        {step.type === 'wait'          && <WaitEditor          config={step.config || {}} onChange={updateConfig} />}
        {step.type === 'send_email'    && <SendEmailEditor     config={step.config || {}} onChange={updateConfig} />}
        {step.type === 'send_sms'      && <SendSmsEditor       config={step.config || {}} onChange={updateConfig} />}
        {step.type === 'update_status' && <UpdateStatusEditor  config={step.config || {}} onChange={updateConfig} />}
      </div>
    </div>
  );
}

// ─── Add step popover ───────────────────────────────────────────────────────
function AddStepButton({ onAdd }) {
  const [open, setOpen] = useState(false);
  function pick(type) {
    onAdd(type);
    setOpen(false);
  }
  return (
    <div className="add-step-wrapper">
      <div className="journey-connector" />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <button className="add-step-btn" onClick={() => setOpen(o => !o)}>+ Add Step</button>
        {open && (
          <div className="step-picker">
            {Object.entries(STEP_TYPES).map(([type, meta]) => (
              <button key={type} className="step-picker-item" onClick={() => pick(type)}>
                <span style={{ fontSize: 18 }}>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="journey-connector" />
    </div>
  );
}

// ─── Trigger block ──────────────────────────────────────────────────────────
function TriggerBlock({ config, onChange }) {
  const events = config.events || [];

  function addTrigger(val) {
    if (!events.includes(val)) onChange({ ...config, events: [...events, val] });
  }
  function removeTrigger(val) {
    onChange({ ...config, events: events.filter(e => e !== val) });
  }

  const unused = TRIGGER_OPTIONS.filter(o => !events.includes(o.value));

  return (
    <div className="journey-step-card trigger-card">
      <div className="step-card-header">
        <span className="step-badge" style={{ background: '#6c5ce7' }}>⚡ Enrollment Triggers</span>
      </div>
      <div className="trigger-chips">
        {events.length === 0 && (
          <span style={{ fontSize: 13, color: '#b0bec5' }}>No triggers yet — add one below</span>
        )}
        {events.map(ev => {
          const opt = TRIGGER_OPTIONS.find(o => o.value === ev);
          return (
            <div key={ev} className="trigger-chip">
              {opt?.label ?? ev}
              <button onClick={() => removeTrigger(ev)}>×</button>
            </div>
          );
        })}
      </div>
      {unused.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <select
            className="step-inline-select"
            value=""
            onChange={e => { if (e.target.value) addTrigger(e.target.value); }}
          >
            <option value="">+ Add trigger…</option>
            {unused.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}
      <div className="trigger-audience" style={{ marginTop: 12 }}>
        <span style={{ fontSize: 13, color: '#7f8c9a' }}>Audience:</span>
        <select
          className="step-inline-select"
          value={config.audience_filter || 'all'}
          onChange={e => onChange({ ...config, audience_filter: e.target.value })}
        >
          <option value="all">All contacts</option>
          <option value="active">Active only</option>
          <option value="lead">Leads only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </div>
    </div>
  );
}

// ─── Main builder ───────────────────────────────────────────────────────────
export default function JourneyBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [name, setName] = useState('Untitled Journey');
  const [status, setStatus] = useState('draft');
  const [steps, setSteps] = useState([
    { id: uid(), type: 'trigger', config: { events: [], audience_filter: 'all' } },
  ]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!isNew) {
      fetchJourney(id)
        .then(j => {
          setName(j.name);
          setStatus(j.status);
          const loaded = j.steps?.length ? j.steps : [
            { id: uid(), type: 'trigger', config: { events: [], audience_filter: 'all' } },
          ];
          if (!loaded.find(s => s.type === 'trigger')) {
            loaded.unshift({ id: uid(), type: 'trigger', config: { events: [], audience_filter: 'all' } });
          }
          setSteps(loaded);
        })
        .catch(() => toast.error('Failed to load journey'))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const triggerStep = steps.find(s => s.type === 'trigger');
  const actionSteps = steps.filter(s => s.type !== 'trigger');
  const actionIds = actionSteps.map(s => s.id);

  function updateTrigger(newConfig) {
    setSteps(prev => prev.map(s => s.type === 'trigger' ? { ...s, config: newConfig } : s));
  }

  function addStep(type) {
    const newStep = { id: uid(), type, config: {} };
    setSteps(prev => [...prev, newStep]);
  }

  function insertStep(afterId, type) {
    const newStep = { id: uid(), type, config: {} };
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === afterId);
      const next = [...prev];
      next.splice(idx + 1, 0, newStep);
      return next;
    });
  }

  function updateStep(id, updated) {
    setSteps(prev => prev.map(s => s.id === id ? updated : s));
  }

  function deleteStep(id) {
    setSteps(prev => prev.filter(s => s.id !== id));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSteps(prev => {
      const oldIdx = prev.findIndex(s => s.id === active.id);
      const newIdx = prev.findIndex(s => s.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  }

  async function save() {
    setSaving(true);
    try {
      const payload = { name, steps, status };
      if (isNew) {
        const j = await createJourney(payload);
        toast.success('Journey created');
        navigate(`/campaigns/${j.id}/edit`, { replace: true });
      } else {
        await updateJourney(id, payload);
        toast.success('Journey saved');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">Loading journey…</div>;

  return (
    <div className="journey-builder">
      {/* Header */}
      <div className="builder-header">
        <Link to="/campaigns" className="back-link" style={{ marginBottom: 0 }}>← Campaigns</Link>
        <input
          className="journey-name-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Journey name…"
        />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            className="step-inline-select"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Journey'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="builder-canvas">
        {/* Trigger block */}
        <TriggerBlock
          config={triggerStep?.config || { events: [], audience_filter: 'all' }}
          onChange={updateTrigger}
        />

        {/* Action steps */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={actionIds} strategy={verticalListSortingStrategy}>
            {actionSteps.map((step, i) => (
              <div key={step.id}>
                <AddStepButton onAdd={type => insertStep(i === 0 ? triggerStep.id : actionSteps[i - 1].id, type)} />
                <SortableStep
                  step={step}
                  onUpdate={updated => updateStep(step.id, updated)}
                  onDelete={() => deleteStep(step.id)}
                />
              </div>
            ))}
          </SortableContext>
        </DndContext>

        {/* Trailing add button */}
        <AddStepButton onAdd={addStep} />

        {actionSteps.length === 0 && (
          <div style={{ textAlign: 'center', color: '#b0bec5', fontSize: 13, marginTop: -8, marginBottom: 8 }}>
            Click "+ Add Step" to build your journey
          </div>
        )}
      </div>
    </div>
  );
}
