export default function Modal({ title, onClose, children }) {
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
