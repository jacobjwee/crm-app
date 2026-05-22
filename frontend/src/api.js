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
export const fetchMessages = (contactId) => request(`/messages/contact/${contactId}`);
export const fetchInboxThreads = () => request('/messages/threads');
export const syncInboxMessages = () => request('/messages/sync', { method: 'POST' });
export const fetchCampaigns = () => request('/campaigns');
export const fetchCampaign = (id) => request(`/campaigns/${id}`);
export const createCampaign = (data) => request('/campaigns', { method: 'POST', body: data });
export const updateCampaign = (id, data) => request(`/campaigns/${id}`, { method: 'PUT', body: data });
export const deleteCampaign = (id) => request(`/campaigns/${id}`, { method: 'DELETE' });
export const runCampaign = (id) => request(`/campaigns/${id}/run`, { method: 'POST' });
export const fetchJourneys = () => request('/journeys');
export const fetchJourney = (id) => request(`/journeys/${id}`);
export const createJourney = (data) => request('/journeys', { method: 'POST', body: data });
export const updateJourney = (id, data) => request(`/journeys/${id}`, { method: 'PUT', body: data });
export const deleteJourney = (id) => request(`/journeys/${id}`, { method: 'DELETE' });
export const runJourney = (id) => request(`/journeys/${id}/run`, { method: 'POST' });
export const sendMessage = (contact_id, channel, body, subject = '') =>
  request('/messages/send', { method: 'POST', body: { contact_id, channel, body, subject } });

export const fetchAppointments = (start, end) =>
  request(`/appointments?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
export const createAppointment = (data) => request('/appointments', { method: 'POST', body: data });
export const updateAppointment = (id, data) => request(`/appointments/${id}`, { method: 'PUT', body: data });
export const deleteAppointment = (id) => request(`/appointments/${id}`, { method: 'DELETE' });
export const sendSchedule = (data) => request('/appointments/send', { method: 'POST', body: data });
export const sendBookingLink = (contact_id, channel) =>
  request('/booking/send', { method: 'POST', body: { contact_id, channel } });
