const express = require('express');
const cors = require('cors');
const contactsRouter = require('./routes/contacts');
const notesRouter = require('./routes/notes');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/contacts', contactsRouter);
app.use('/api/notes', notesRouter);
app.use('/api/dashboard', dashboardRouter);

app.listen(PORT, () => {
  console.log(`CRM backend running on http://localhost:${PORT}`);
});
