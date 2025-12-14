const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initScheduler } = require('./utils/scheduler.js');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: [process.env.ADMIN_URL || 'http://192.168.31.75:3000', process.env.USER_URL || 'http://192.168.31.75:8081'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


// Rate limiting for general API routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.'
});

// More lenient rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.'
});

// Invite rate limiting (5 invites per hour per admin)
const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  message: 'Maximum 5 invites per hour allowed'
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://192.168.31.75:27017/tmbc-attendance')
.then(() => {
  console.log('MongoDB connected');

  // Start attendance jobs (auto-complete checkouts, reminders)
  const { startAttendanceJobs } = require('./utils/attendanceJobs');
  startAttendanceJobs();
})
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth')); // Auth routes with lenient rate limit
app.use('/api/employees', limiter, require('./routes/employees'));
app.use('/api/departments', limiter, require('./routes/departments'));
app.use('/api/organization', limiter, require('./routes/organization'));
app.use('/api/attendance', limiter, require('./routes/attendance'));
app.use('/api/invites', inviteLimiter, require('./routes/invites'));
app.use('/api/reports', limiter, require('./routes/reports'));
app.use('/api/corrections', limiter, require('./routes/corrections'));
app.use('/api/notifications', limiter, require('./routes/notifications'));
app.use('/api/admin/monitoring', limiter, require('./routes/admin/monitoring'));
app.use('/api/tasks', limiter, require('./routes/tasks'));
app.use('/api/holidays', limiter, require('./routes/holidays'));

// Expo Token Route
app.use("/api/expo-token",require("./routes/token.js"));

// Notification Send Route (for sending push notifications)
app.use("/api/notification/send", limiter, require("./routes/notification.js"));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initScheduler();
});

module.exports = app;



