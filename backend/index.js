const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const dotenv    = require('dotenv');

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.url}`
  );
  if (req.method !== 'GET') console.log('  Body:', req.body);
  next();
});

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    // Force drop unique indexes to ensure 'sparse' takes effect if schema was modified later
    try {
      const User = require('./models/User');
      await User.collection.dropIndex('phone_1');
      console.log('Refreshed phone index');
    } catch (e) {}
    try {
      const User = require('./models/User');
      await User.collection.dropIndex('email_1');
      console.log('Refreshed email index');
    } catch (e) {}
  })
  .catch(err => console.error('❌ MongoDB error:', err.message));

// Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/circle',   require('./routes/circle'));
app.use('/api/journey',  require('./routes/journey'));
app.use('/api/routes',   require('./routes/route_routes'));
app.use('/api/sos',      require('./routes/sos'));
app.use('/api/places',   require('./routes/places')); // ← NEW: India-focused search
app.use('/api/services', require('./routes/services'));
app.use('/api/alerts',   require('./routes/alerts'));
app.use('/api/overpass', require('./routes/overpass'));

app.get('/', (req, res) => res.send('SafePulse API v2 running'));

// Bind to 0.0.0.0 so physical devices on the LAN can connect
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ SafePulse API listening on 0.0.0.0:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Kill the other process first:`);
    console.error(`   Windows: netstat -ano | findstr :${PORT}  then  taskkill /PID <pid> /F`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
