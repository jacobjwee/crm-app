import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import ContactDetail from './pages/ContactDetail';
import Campaigns from './pages/Campaigns';
import JourneyBuilder from './pages/JourneyBuilder';
import Toaster from './components/Toaster';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <Toaster />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/contacts/:id" element={<ContactDetail />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/:id/edit" element={<JourneyBuilder />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
