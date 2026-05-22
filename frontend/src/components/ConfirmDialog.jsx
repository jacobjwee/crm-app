export default function ConfirmDialog({ message, onConfirm, onCancel, danger = true }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ width: 380 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>{danger ? '⚠️' : '❓'}</div>
        <h2 style={{ fontSize: 17, marginBottom: 10 }}>Are you sure?</h2>
        <p style={{ fontSize: 14, color: '#7f8c9a', marginBottom: 28, lineHeight: 1.5 }}>{message}</p>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {danger ? 'Delete' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
