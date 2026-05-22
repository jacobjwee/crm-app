const listeners = new Set();
let toasts = [];
let nextId = 1;

function emit() {
  listeners.forEach(fn => fn([...toasts]));
}

export const toast = {
  success(message) { add('success', message); },
  error(message)   { add('error',   message); },
  dismiss(id) {
    toasts = toasts.filter(t => t.id !== id);
    emit();
  },
  _subscribe(fn) {
    listeners.add(fn);
    fn([...toasts]);
    return () => listeners.delete(fn);
  },
};

function add(type, message) {
  const id = nextId++;
  toasts = [...toasts, { id, type, message }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    emit();
  }, 3800);
}
