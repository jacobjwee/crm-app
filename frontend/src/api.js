const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const fetchDashboard = () => request('/dashboard');
export const fetchContacts = (search = '') =>
  request(`/contacts${search ? `?search=${encodeURIComponent(search)}` : ''}`);
export const fetchContact = (id) => request(`/contacts/${id}`);
export const createContact = (data) => request('/contacts', { method: 'POST', body: data });
export const updateContact = (id, data) => request(`/contacts/${id}`, { method: 'PUT', body: data });
export const deleteContact = (id) => request(`/contacts/${id}`, { method: 'DELETE' });
export const fetchNotes = (contactId) => request(`/notes/contact/${contactId}`);
export const createNote = (contactId, content) =>
  request('/notes', { method: 'POST', body: { contact_id: contactId, content } });
export const deleteNote = (id) => request(`/notes/${id}`, { method: 'DELETE' });
