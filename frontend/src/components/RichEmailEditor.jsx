import { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function uid() { return `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

const BLOCK_META = [
  { type: 'heading',  label: 'Heading',  icon: 'H' },
  { type: 'text',     label: 'Text',     icon: 'T' },
  { type: 'button',   label: 'Button',   icon: '⬜' },
  { type: 'image',    label: 'Image',    icon: '🖼' },
  { type: 'divider',  label: 'Divider',  icon: '—' },
  { type: 'spacer',   label: 'Spacer',   icon: '↕' },
];

const FONT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', label: 'System' },
  { value: '"Arial",sans-serif',      label: 'Arial' },
  { value: '"Helvetica",sans-serif',  label: 'Helvetica' },
  { value: '"Georgia",serif',         label: 'Georgia' },
  { value: '"Times New Roman",serif', label: 'Times New Roman' },
  { value: '"Courier New",monospace', label: 'Courier' },
];

const SIZES = [11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 40];

// ── Shared formatting toolbar ─────────────────────────────────────────────────

function FormatBar({ props, onChange, show = {} }) {
  const p = props;
  const set = (key, val) => onChange({ ...p, [key]: val });
  const toggle = (key, on, off) => set(key, p[key] === on ? off : on);

  return (
    <div className="format-bar">
      {/* Alignment */}
      {show.align && (
        <div className="format-group">
          {['left', 'center', 'right'].map(a => (
            <button
              key={a}
              className={`format-btn${(p.align || 'left') === a ? ' format-btn-active' : ''}`}
              onClick={() => set('align', a)}
              title={`Align ${a}`}
            >
              {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
            </button>
          ))}
        </div>
      )}

      {/* Bold */}
      {show.bold && (
        <button
          className={`format-btn${p.fontWeight === 'bold' ? ' format-btn-active' : ''}`}
          onClick={() => toggle('fontWeight', 'bold', 'normal')}
          style={{ fontWeight: 'bold' }}
          title="Bold"
        >B</button>
      )}

      {/* Italic */}
      {show.italic && (
        <button
          className={`format-btn${p.fontStyle === 'italic' ? ' format-btn-active' : ''}`}
          onClick={() => toggle('fontStyle', 'italic', 'normal')}
          style={{ fontStyle: 'italic' }}
          title="Italic"
        >I</button>
      )}

      {/* Underline */}
      {show.underline && (
        <button
          className={`format-btn${p.textDecoration === 'underline' ? ' format-btn-active' : ''}`}
          onClick={() => toggle('textDecoration', 'underline', 'none')}
          style={{ textDecoration: 'underline' }}
          title="Underline"
        >U</button>
      )}

      {/* Font size */}
      {show.size && (
        <select
          value={p.fontSize ?? ''}
          onChange={e => set('fontSize', e.target.value ? +e.target.value : null)}
          className="format-select"
          title="Font size"
        >
          <option value="">Size</option>
          {SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
      )}

      {/* Font family */}
      {show.font && (
        <select
          value={p.fontFamily ?? ''}
          onChange={e => set('fontFamily', e.target.value || null)}
          className="format-select"
          style={{ maxWidth: 110 }}
          title="Font family"
        >
          {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      )}

      {/* Text color */}
      {show.color && (
        <label className="format-color-btn" title="Text color">
          <input
            type="color"
            value={p.color || '#111111'}
            onChange={e => set('color', e.target.value)}
          />
          <span style={{ borderBottom: `3px solid ${p.color || '#111111'}` }}>A</span>
        </label>
      )}

      {/* Background / highlight color */}
      {show.bg && (
        <label className="format-color-btn" title="Highlight color" style={{ background: p.bg || 'transparent' }}>
          <input
            type="color"
            value={p.bg || '#ffffff'}
            onChange={e => set('bg', e.target.value)}
          />
          <span style={{ fontSize: 11 }}>BG</span>
        </label>
      )}
    </div>
  );
}

// ── HTML generation ───────────────────────────────────────────────────────────

function blocksToHtml(blocks) {
  const rows = blocks.map(b => {
    const p = b.props;
    switch (b.type) {
      case 'heading': {
        const lvl = p.level || 1;
        const sz = p.fontSize ? `${p.fontSize}px` : ['32px', '24px', '20px'][lvl - 1] ?? '24px';
        const styles = [
          `margin:0 0 14px`,
          `font-size:${sz}`,
          `font-weight:700`,
          `color:${p.color || '#111111'}`,
          `text-align:${p.align || 'left'}`,
          p.fontFamily ? `font-family:${p.fontFamily}` : '',
        ].filter(Boolean).join(';');
        return `<h${lvl} style="${styles}">${p.content || ''}</h${lvl}>`;
      }

      case 'text': {
        const styles = [
          `margin:0 0 14px`,
          `font-size:${p.fontSize ? `${p.fontSize}px` : '15px'}`,
          `line-height:1.65`,
          `color:${p.color || '#333333'}`,
          `text-align:${p.align || 'left'}`,
          `font-weight:${p.fontWeight || 'normal'}`,
          `font-style:${p.fontStyle || 'normal'}`,
          p.textDecoration ? `text-decoration:${p.textDecoration}` : '',
          p.fontFamily ? `font-family:${p.fontFamily}` : '',
          p.bg && p.bg !== '#ffffff' ? `background:${p.bg};padding:2px 4px` : '',
        ].filter(Boolean).join(';');
        return `<p style="${styles}">${(p.content || '').replace(/\n/g, '<br>')}</p>`;
      }

      case 'button': {
        const align = p.align || 'center';
        const btnStyles = [
          `display:inline-block`,
          `padding:13px 30px`,
          `background:${p.color || '#4facfe'}`,
          `color:${p.textColor || '#ffffff'}`,
          `text-decoration:none`,
          `border-radius:6px`,
          `font-size:${p.fontSize ? `${p.fontSize}px` : '15px'}`,
          `font-weight:${p.fontWeight || '600'}`,
          p.fontFamily ? `font-family:${p.fontFamily}` : '',
        ].filter(Boolean).join(';');
        return `<div style="text-align:${align};margin:20px 0;"><a href="${p.url || '#'}" style="${btnStyles}">${p.label || 'Click here'}</a></div>`;
      }

      case 'image': {
        if (!p.src) return '';
        const align = p.align || 'center';
        const margin = align === 'left' ? '12px auto 12px 0' : align === 'right' ? '12px 0 12px auto' : '12px auto';
        return `<img src="${p.src}" alt="${p.alt || ''}" style="display:block;max-width:100%;margin:${margin};">`;
      }

      case 'divider': {
        const color = p.color || '#e4e8ed';
        return `<hr style="border:none;border-top:1px solid ${color};margin:20px 0;">`;
      }

      case 'spacer':
        return `<div style="height:${p.height || 24}px;"></div>`;

      default:
        return '';
    }
  }).filter(Boolean);

  const ff = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  return `<div style="max-width:600px;margin:0 auto;font-family:${ff};padding:32px 24px;">\n${rows.join('\n')}\n</div>`;
}

// ── Block editors ─────────────────────────────────────────────────────────────

function HeadingEditor({ props, onChange }) {
  return (
    <div className="block-editor">
      <FormatBar props={props} onChange={onChange} show={{ align: true, size: true, font: true, color: true }} />
      <div className="block-editor-row" style={{ marginTop: 8 }}>
        <select
          value={props.level || 1}
          onChange={e => onChange({ ...props, level: +e.target.value })}
          className="step-inline-select" style={{ width: 70 }}
        >
          <option value={1}>H1</option>
          <option value={2}>H2</option>
          <option value={3}>H3</option>
        </select>
      </div>
      <input
        value={props.content || ''} placeholder="Heading text…"
        onChange={e => onChange({ ...props, content: e.target.value })}
        className="block-content-input"
        style={{
          textAlign: props.align || 'left',
          fontWeight: 700,
          fontSize: props.fontSize ? `${props.fontSize}px` : ['28px', '22px', '18px'][(props.level || 1) - 1],
          color: props.color || '#111111',
          fontFamily: props.fontFamily || 'inherit',
        }}
      />
    </div>
  );
}

function TextBlockEditor({ props, onChange }) {
  return (
    <div className="block-editor">
      <FormatBar props={props} onChange={onChange} show={{ align: true, bold: true, italic: true, underline: true, size: true, font: true, color: true, bg: true }} />
      <textarea
        value={props.content || ''} placeholder="Paragraph text…"
        onChange={e => onChange({ ...props, content: e.target.value })}
        className="block-content-textarea" rows={3}
        style={{
          textAlign: props.align || 'left',
          fontWeight: props.fontWeight || 'normal',
          fontStyle: props.fontStyle || 'normal',
          textDecoration: props.textDecoration || 'none',
          fontSize: props.fontSize ? `${props.fontSize}px` : '15px',
          color: props.color || '#333333',
          fontFamily: props.fontFamily || 'inherit',
          background: props.bg && props.bg !== '#ffffff' ? props.bg : '#fff',
        }}
      />
    </div>
  );
}

function ButtonBlockEditor({ props, onChange }) {
  return (
    <div className="block-editor">
      <FormatBar props={props} onChange={onChange} show={{ align: true, size: true, font: true, bold: true }} />
      <div className="block-editor-row" style={{ marginTop: 8 }}>
        <input
          value={props.label || ''} placeholder="Button label…"
          onChange={e => onChange({ ...props, label: e.target.value })}
          className="block-content-input" style={{ flex: 1 }}
        />
        <label className="format-color-btn" title="Button color">
          <input type="color" value={props.color || '#4facfe'} onChange={e => onChange({ ...props, color: e.target.value })} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>BG</span>
        </label>
        <label className="format-color-btn" title="Text color">
          <input type="color" value={props.textColor || '#ffffff'} onChange={e => onChange({ ...props, textColor: e.target.value })} />
          <span style={{ borderBottom: `3px solid ${props.textColor || '#ffffff'}`, filter: 'invert(0)' }}>A</span>
        </label>
      </div>
      <input
        value={props.url || ''} placeholder="Link URL (https://…)"
        onChange={e => onChange({ ...props, url: e.target.value })}
        className="block-content-input" style={{ marginTop: 6 }}
      />
      {/* Live preview */}
      <div style={{ textAlign: props.align || 'center', marginTop: 10 }}>
        <span style={{
          display: 'inline-block', padding: '10px 24px',
          background: props.color || '#4facfe', color: props.textColor || '#ffffff',
          borderRadius: 6, fontSize: props.fontSize ? `${props.fontSize}px` : '14px',
          fontWeight: props.fontWeight || '600', fontFamily: props.fontFamily || 'inherit',
          cursor: 'default', userSelect: 'none',
        }}>
          {props.label || 'Click here'}
        </span>
      </div>
    </div>
  );
}

function ImageBlockEditor({ props, onChange }) {
  return (
    <div className="block-editor">
      <FormatBar props={props} onChange={onChange} show={{ align: true }} />
      <input
        value={props.src || ''} placeholder="Image URL (https://…)"
        onChange={e => onChange({ ...props, src: e.target.value })}
        className="block-content-input" style={{ marginTop: 8 }}
      />
      <input
        value={props.alt || ''} placeholder="Alt text"
        onChange={e => onChange({ ...props, alt: e.target.value })}
        className="block-content-input" style={{ marginTop: 6 }}
      />
      {props.src && (
        <img
          src={props.src} alt={props.alt || ''}
          style={{
            maxHeight: 80, maxWidth: '100%', marginTop: 8, borderRadius: 4, objectFit: 'cover',
            display: 'block',
            marginLeft: props.align === 'left' ? 0 : props.align === 'right' ? 'auto' : 'auto',
            marginRight: props.align === 'right' ? 0 : 'auto',
          }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}
    </div>
  );
}

function DividerEditor({ props, onChange }) {
  return (
    <div className="block-editor">
      <div className="block-editor-row">
        <span style={{ fontSize: 13, color: '#7f8c9a' }}>Color</span>
        <label className="format-color-btn" title="Divider color">
          <input type="color" value={props.color || '#e4e8ed'} onChange={e => onChange({ ...props, color: e.target.value })} />
          <span style={{ fontSize: 11 }}>━</span>
        </label>
      </div>
      <hr style={{ border: 'none', borderTop: `2px solid ${props.color || '#e4e8ed'}`, margin: '4px 0' }} />
    </div>
  );
}

function SpacerEditor({ props, onChange }) {
  return (
    <div className="block-editor">
      <div className="block-editor-row">
        <span style={{ fontSize: 13, color: '#7f8c9a' }}>Height</span>
        <input
          type="number" min={4} max={120} value={props.height || 24}
          onChange={e => onChange({ ...props, height: +e.target.value })}
          className="step-inline-input" style={{ width: 70 }}
        />
        <span style={{ fontSize: 13, color: '#7f8c9a' }}>px</span>
      </div>
    </div>
  );
}

// ── Sortable block card ───────────────────────────────────────────────────────

function SortableBlock({ block, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const meta = BLOCK_META.find(m => m.type === block.type);

  function updateProps(newProps) { onUpdate({ ...block, props: newProps }); }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }}
      className="email-block-row"
    >
      <div className="drag-handle" {...attributes} {...listeners} title="Drag to reorder">⣿</div>
      <div className="email-block-card">
        <div className="step-card-header">
          <span className="block-type-badge">{meta?.icon} {meta?.label}</span>
          <button className="step-delete-btn" onClick={onDelete}>×</button>
        </div>
        {block.type === 'heading'  && <HeadingEditor      props={block.props} onChange={updateProps} />}
        {block.type === 'text'     && <TextBlockEditor    props={block.props} onChange={updateProps} />}
        {block.type === 'button'   && <ButtonBlockEditor  props={block.props} onChange={updateProps} />}
        {block.type === 'image'    && <ImageBlockEditor   props={block.props} onChange={updateProps} />}
        {block.type === 'divider'  && <DividerEditor      props={block.props} onChange={updateProps} />}
        {block.type === 'spacer'   && <SpacerEditor       props={block.props} onChange={updateProps} />}
      </div>
    </div>
  );
}

// ── Add block button ──────────────────────────────────────────────────────────

function AddBlockButton({ onAdd }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
      <button className="add-step-btn" onClick={() => setOpen(o => !o)}>+ Add Block</button>
      {open && (
        <div className="step-picker" style={{ minWidth: 160 }}>
          {BLOCK_META.map(m => (
            <button key={m.type} className="step-picker-item" onClick={() => { onAdd(m.type); setOpen(false); }}>
              <span style={{ fontSize: 16 }}>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RichEmailEditor({ config, onChange }) {
  const [mode, setMode] = useState(config.emailMode || 'visual');
  const [blocks, setBlocks] = useState(() =>
    config.emailBlocks?.length
      ? config.emailBlocks
      : [
          { id: uid(), type: 'heading', props: { content: '', level: 1 } },
          { id: uid(), type: 'text',    props: { content: '' } },
        ]
  );
  const [html, setHtml] = useState(config.body || '');
  const [showPreview, setShowPreview] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function pushBlocks(newBlocks) {
    setBlocks(newBlocks);
    const generated = blocksToHtml(newBlocks);
    setHtml(generated);
    onChange({ ...config, emailBlocks: newBlocks, emailMode: 'visual', body: generated });
  }

  function addBlock(type) { pushBlocks([...blocks, { id: uid(), type, props: {} }]); }
  function updateBlock(id, updated) { pushBlocks(blocks.map(b => b.id === id ? updated : b)); }
  function deleteBlock(id) { pushBlocks(blocks.filter(b => b.id !== id)); }

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex(b => b.id === active.id);
    const newIdx = blocks.findIndex(b => b.id === over.id);
    pushBlocks(arrayMove(blocks, oldIdx, newIdx));
  }

  function switchToHtml() {
    const generated = blocksToHtml(blocks);
    setHtml(generated);
    setMode('html');
    onChange({ ...config, emailBlocks: blocks, emailMode: 'html', body: generated });
  }

  function switchToVisual() {
    setMode('visual');
    onChange({ ...config, emailBlocks: blocks, emailMode: 'visual', body: blocksToHtml(blocks) });
  }

  function handleHtmlChange(val) {
    setHtml(val);
    onChange({ ...config, emailMode: 'html', body: val });
  }

  const previewHtml = mode === 'visual' ? blocksToHtml(blocks) : html;

  return (
    <div className="rich-email-editor">
      {/* Tab / toolbar row */}
      <div className="editor-tabs">
        <button className={`editor-tab${mode === 'visual' ? ' active' : ''}`} onClick={switchToVisual}>
          Design
        </button>
        <button className={`editor-tab${mode === 'html' ? ' active' : ''}`} onClick={switchToHtml}>
          {'</>'} HTML
        </button>
        <div style={{ flex: 1 }} />
        <button
          className={`editor-tab${showPreview ? ' active' : ''}`}
          onClick={() => setShowPreview(p => !p)}
        >
          {showPreview ? 'Hide Preview' : 'Preview'}
        </button>
      </div>

      {/* Design mode */}
      {mode === 'visual' && (
        <div className="email-blocks">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              {blocks.map(block => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  onUpdate={updated => updateBlock(block.id, updated)}
                  onDelete={() => deleteBlock(block.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
          {blocks.length === 0 && (
            <div style={{ textAlign: 'center', color: '#b0bec5', fontSize: 13, padding: '20px 0' }}>
              Add blocks to build your email
            </div>
          )}
          <AddBlockButton onAdd={addBlock} />
        </div>
      )}

      {/* HTML mode */}
      {mode === 'html' && (
        <textarea
          className="html-editor"
          value={html}
          onChange={e => handleHtmlChange(e.target.value)}
          placeholder="<p>Write your email HTML here…</p>"
          spellCheck={false}
        />
      )}

      {/* Preview */}
      {showPreview && (
        <div className="email-preview-wrap">
          <div style={{ fontSize: 12, color: '#95a5b3', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Email Preview
          </div>
          <iframe
            title="Email Preview"
            srcDoc={`<!DOCTYPE html><html><body style="margin:0;background:#f5f7fa;">${previewHtml}</body></html>`}
            style={{ width: '100%', minHeight: 300, border: 'none', borderRadius: 8, background: '#f5f7fa' }}
            sandbox="allow-same-origin"
          />
        </div>
      )}
    </div>
  );
}
