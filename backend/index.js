require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initializeDatabase } = require('./database/schema');

const app = express();
const PORT = process.env.PORT || 5000;

// middleware setup
app.use(cors({
  origin: "https://military-asset-management-frontend-39ke.onrender.com",
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// all routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/dashboard', require('./routes/dashboard'));

// health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// catch unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Something went wrong' });
});

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log('\nDefault logins:');
      console.log('  admin / admin123');
      console.log('  commander_alpha / commander123');
      console.log('  commander_bravo / commander123');
      console.log('  logistics_officer / logistics123');
    });
  } catch (err) {
    console.error('Failed to start:', err.message);
    process.exit(1);
  }
}

startServer();