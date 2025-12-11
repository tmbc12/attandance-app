const mongoose = require('mongoose');


const taskSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  // title: {
  //   type: String,
  //   required: true,
  //   trim: true
  // },
  // description: {
  //   type: String,
  //   trim: true
  // },
  history: [
    {
      title: { type: String, required: true },
      description: { type: String, required: false, default: "" },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'paused', 'completed', 'cancelled'],
    default: 'pending'
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  timeTracking: {
    totalSeconds: {
      type: Number,
      default: 0
    },
    sessions: [{
      startTime: Date,
      endTime: Date,
      duration: Number, // seconds
      type: {
        type: String,
        enum: ['work', 'pause']
      }
    }],
    currentSessionStart: Date,
    lastPauseTime: Date
  },
  isCarriedForward: {
    type: Boolean,
    default: false
  },
  carriedFromDate: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true
  }],
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  startTime: Date,
  stopTime: Date,
  pauseTime: Date,
  playTime: Date,
  isPaused: {
    type: Boolean,
    default: true,
  },
  pausedAt: {
    type: Date,
    default: new Date(),
  },
  pausedForInSeconds: {
    type: Number,
    default: 0
  },
  totalPausedTime: {
    type: Number, // Store total paused time in milliseconds
    default: 0,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
});

// Pre-save middleware to update timestamp
taskSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Method to format time duration
taskSchema.methods.getFormattedDuration = function () {
  const hours = Math.floor(this.timeTracking.totalSeconds / 3600);
  const minutes = Math.floor((this.timeTracking.totalSeconds % 3600) / 60);
  const seconds = this.timeTracking.totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

// Indexes for performance
taskSchema.index({ employee: 1, date: -1, status: 1 });
taskSchema.index({ organization: 1, date: -1 });
taskSchema.index({ status: 1, priority: 1 });
taskSchema.index({ employee: 1, status: 1, date: -1 });


// Middleware to calculate total paused time and update isPaused flag
taskSchema.pre('save', function (next) {
  if (this.isModified('pauseTime') && this.pauseTime) {
    // If there's a pauseTime, set isPaused to true
    this.isPaused = true;
  }

  if (this.isModified('playTime') && this.playTime && this.pauseTime) {
    // Calculate the paused duration since the last pause
    const pausedDuration = this.playTime - this.pauseTime;
    // Add it to the total paused time
    this.totalPausedTime += pausedDuration;
    // Reset pauseTime and playTime for future calculations
    this.pauseTime = null;
    this.playTime = null;
    // Set isPaused to false since we're playing again
    this.isPaused = false;
  }

  next();
});

// Method to get total paused time in HH:MM format
taskSchema.methods.getFormattedPausedTime = function () {
  const totalMinutes = Math.floor(this.totalPausedTime / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

module.exports = mongoose.model('Task', taskSchema);
