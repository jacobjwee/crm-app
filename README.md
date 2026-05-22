# CRM App

A lightweight CRM prototype built with React + Node/Express + SQLite.

## Features

- **Dashboard** — at-a-glance stats (total contacts, active contacts, notes) and recent activity feed
- **Contacts** — add, edit, delete, and search contacts (name, email, phone, company, status)
- **Notes** — log activity notes per contact with timestamps

## Tech Stack

| Layer    | Technology               |
|----------|--------------------------|
| Frontend | React 18, React Router 6, Vite |
| Backend  | Node.js, Express 4       |
| Database | SQLite (via better-sqlite3) |

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node)

## Getting Started

```bash
# 1. Install dependencies for both frontend and backend
bash setup.sh

# 2. Start the backend (Terminal 1)
cd backend && npm run dev

# 3. Start the frontend (Terminal 2)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
crm-app/
├── backend/
│   ├── server.js          # Express app entry point
│   ├── db.js              # SQLite connection + schema setup
│   └── routes/
│       ├── contacts.js    # CRUD /api/contacts
│       ├── notes.js       # CRUD /api/notes
│       └── dashboard.js   # GET /api/dashboard
└── frontend/
    ├── index.html
    └── src/
        ├── App.jsx
        ├── api.js          # Fetch wrapper for all API calls
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── Contacts.jsx
        │   └── ContactDetail.jsx
        └── components/
            ├── Navbar.jsx
            └── Modal.jsx
```

## API Endpoints

| Method | Path                        | Description           |
|--------|-----------------------------|-----------------------|
| GET    | /api/dashboard              | Summary stats         |
| GET    | /api/contacts               | List contacts         |
| POST   | /api/contacts               | Create contact        |
| GET    | /api/contacts/:id           | Get one contact       |
| PUT    | /api/contacts/:id           | Update contact        |
| DELETE | /api/contacts/:id           | Delete contact        |
| GET    | /api/notes/contact/:id      | Notes for a contact   |
| POST   | /api/notes                  | Create note           |
| DELETE | /api/notes/:id              | Delete note           |
