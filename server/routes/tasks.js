const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const Employee = require("../models/Employee");
const moment = require("moment-timezone");
const { auth, requirePermission } = require("../middleware/auth");
const { getIO } = require("../socket");

// Employee authentication middleware
const employeeAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    );

    const employee = await Employee.findById(decoded.userId).select(
      "-password"
    );

    if (!employee || employee.status !== "active") {
      return res.status(401).json({ message: "Token is not valid" });
    }

    req.employee = employee;
    next();
  } catch (error) {
    console.error("Employee auth middleware error:", error);
    res.status(401).json({ message: "Token is not valid" });
  }
};

// Create a new task
router.post("/", employeeAuth, async (req, res) => {
  try {
    const { title, description, priority, dueDate, tags } = req.body;
    const employee = req.employee;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: "Task title is required" });
    }

    const task = new Task({
      employee: employee._id,
      organization: employee.organization,
      startTime: new Date().toISOString(),
      pauseTime: new Date().toISOString(),
      // title: title.trim(),
      // description: description?.trim(),
      history: [{ title: title.trim(), description: description?.trim() }],
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      tags: tags || [],
      date: moment().startOf("day").toDate(),
    });

    await task.save();

    res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("Create task error:", error);
    res
      .status(500)
      .json({ message: "Error creating task", error: error.message });
  }
});

router.post(
  "/assign",
  auth,
  requirePermission("assign_tasks"),
  async (req, res) => {
    const { tasks } = req.body;

    try {
      const organizationId = req.user._id;
      const createdTaskIds = [];

      /* ------------------ Create Tasks ------------------ */

      for (const task of tasks) {
        const { employeeId, ...taskData } = task;

        const employee = await Employee.findOne({
          _id: employeeId,
          organization: organizationId,
        });

        if (!employee) {
          return res.status(404).json({
            message: `Employee with ID ${employeeId} not found`,
          });
        }

        const newTask = new Task({
          employee: employee._id,
          organization: organizationId,
          startTime: new Date().toISOString(),
          pauseTime: new Date().toISOString(),
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          history: [
            {
              title: taskData.title.trim(),
              description: taskData.description?.trim(),
            },
          ],
          tags: taskData.tags || [],
          ...taskData,
          date: moment().startOf("day").toDate(),
          assignedBy: req.user._id,
          assignedByModel:
            req.user.role === "super_admin" ? "Organization" : "Employee",
        });

        await newTask.save();

        // Update on realtime
        getIO().to(employeeId.toString()).emit("task:assigned", newTask);
        createdTaskIds.push(newTask._id);
      }

      /* ------------------ Employee-wise Response ------------------ */

      const employeeWiseTasks = await Task.aggregate([
        {
          $match: {
            _id: { $in: createdTaskIds },
            organization: organizationId,
          },
        },

        { $sort: { createdAt: -1 } },

        {
          $group: {
            _id: "$employee",
            tasks: { $push: "$$ROOT" },
            taskCount: { $sum: 1 },
          },
        },

        // Employee lookup
        {
          $lookup: {
            from: "employees",
            localField: "_id",
            foreignField: "_id",
            as: "employee",
          },
        },
        { $unwind: "$employee" },

        // Department lookup
        {
          $lookup: {
            from: "departments",
            localField: "employee.department",
            foreignField: "_id",
            as: "department",
          },
        },
        {
          $unwind: {
            path: "$department",
            preserveNullAndEmptyArrays: true,
          },
        },

        // Final shape
        {
          $project: {
            _id: 0,
            employee: {
              _id: "$employee._id",
              name: "$employee.name",
              email: "$employee.email",
              employeeId: "$employee.employeeId",
              department: {
                _id: "$department._id",
                name: "$department.name",
                colorCode: "$department.colorCode",
              },
            },
            taskCount: 1,
            tasks: 1,
          },
        },
      ]);

      res.status(201).json({
        success: true,
        message: "Tasks assigned successfully",
        employeeWiseTasks,
      });
    } catch (error) {
      console.error("Error assigning tasks:", error);
      res.status(500).json({
        message: "Error assigning tasks",
        error: error.message,
      });
    }
  }
);

// Get all tasks for a specific date (Admin only) - Must be BEFORE employee routes
router.get("/all", auth, async (req, res) => {
  try {
    const { date } = req.query;
    const admin = req.user;

    // Use provided date or today
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get tasks for the date
    const tasks = await Task.find({
      organization: admin._id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .populate("employee", "name email employeeId department")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tasks,
      date: targetDate,
    });
  } catch (error) {
    console.error("Error fetching daily tasks:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get my tasks for today
router.get("/today", employeeAuth, async (req, res) => {
  try {
    const employee = req.employee;
    const today = moment().startOf("day").toDate();
    const endOfDay = moment().endOf("day").toDate();

    const tasks = await Task.find({
      employee: employee._id,
      date: { $gte: today, $lte: endOfDay },
      status: { $ne: "cancelled" },
      isArchived: { $ne: true },
    }).sort({ priority: -1, createdAt: 1 });

    // Calculate statistics
    const stats = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      paused: tasks.filter((t) => t.status === "paused").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      totalTimeSpent: tasks.reduce(
        (sum, t) => sum + (t.timeTracking.totalSeconds || 0),
        0
      ),
    };

    res.json({ tasks, stats });
  } catch (error) {
    console.error("Get today tasks error:", error);
    res
      .status(500)
      .json({ message: "Error fetching tasks", error: error.message });
  }
});

// Get my tasks with filters
router.get("/", employeeAuth, async (req, res) => {
  try {
    const { status, startDate, endDate, limit = 50, skip = 0 } = req.query;
    const employee = req.employee;

    const query = { employee: employee._id };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = moment(startDate).startOf("day").toDate();
      }
      if (endDate) {
        query.date.$lte = moment(endDate).endOf("day").toDate();
      }
    }

    const tasks = await Task.find(query)
      .sort({ date: -1, priority: -1, createdAt: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
      total,
      hasMore: skip + tasks.length < total,
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    res
      .status(500)
      .json({ message: "Error fetching tasks", error: error.message });
  }
});

// Start task
router.post("/:taskId/start", employeeAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const employee = req.employee;

    const task = await Task.findOne({
      _id: taskId,
      employee: employee._id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status === "completed") {
      return res.status(400).json({ message: "Cannot start a completed task" });
    }

    if (task.status === "in_progress") {
      return res.status(400).json({ message: "Task is already in progress" });
    }

    // Stop any other tasks that are in progress
    await Task.updateMany(
      {
        employee: employee._id,
        status: "in_progress",
        _id: { $ne: taskId },
      },
      {
        $set: {
          status: "paused",
          "timeTracking.lastPauseTime": new Date(),

          playTime: new Date(),
          isPaused: false,
        },
      }
    );

    task.status = "in_progress";
    task.timeTracking.currentSessionStart = new Date();

    await task.save();

    res.json({
      message: "Task started",
      task,
    });
  } catch (error) {
    console.error("Start task error:", error);
    res
      .status(500)
      .json({ message: "Error starting task", error: error.message });
  }
});

// Pause task
router.post("/:taskId/pause", employeeAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const employee = req.employee;

    const task = await Task.findOne({
      _id: taskId,
      employee: employee._id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status !== "in_progress") {
      return res.status(400).json({ message: "Task is not in progress" });
    }

    const now = new Date();
    const sessionDuration = Math.floor(
      (now - task.timeTracking.currentSessionStart) / 1000
    );

    // Add session to history
    task.timeTracking.sessions.push({
      startTime: task.timeTracking.currentSessionStart,
      endTime: now,
      duration: sessionDuration,
      type: "work",
    });

    // Update total time
    task.timeTracking.totalSeconds += sessionDuration;
    task.timeTracking.lastPauseTime = now;
    task.timeTracking.pauseTime = now;
    task.timeTracking.currentSessionStart = null;
    task.status = "paused";

    task.pauseTime = new Date();
    task.isPaused = true;

    await task.save();

    res.json({
      message: "Task paused",
      task,
      sessionDuration,
    });
  } catch (error) {
    console.error("Pause task error:", error);
    res
      .status(500)
      .json({ message: "Error pausing task", error: error.message });
  }
});

// Resume task
router.post("/:taskId/resume", employeeAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const employee = req.employee;

    const task = await Task.findOne({
      _id: taskId,
      employee: employee._id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status !== "paused") {
      return res.status(400).json({ message: "Task is not paused" });
    }

    // Stop any other tasks that are in progress
    await Task.updateMany(
      {
        employee: employee._id,
        status: "in_progress",
        _id: { $ne: taskId },
      },
      {
        $set: {
          status: "paused",
          "timeTracking.lastPauseTime": new Date(),
          playTime: new Date(),
          isPaused: false,
        },
      }
    );

    task.status = "in_progress";
    task.timeTracking.currentSessionStart = new Date();

    await task.save();

    res.json({
      message: "Task resumed",
      task,
    });
  } catch (error) {
    console.error("Resume task error:", error);
    res
      .status(500)
      .json({ message: "Error resuming task", error: error.message });
  }
});

// Complete task
router.post("/:taskId/complete", employeeAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const employee = req.employee;

    const task = await Task.findOne({
      _id: taskId,
      employee: employee._id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status === "completed") {
      return res.status(400).json({ message: "Task is already completed" });
    }

    // If task is in progress, calculate final session time
    if (
      task.status === "in_progress" &&
      task.timeTracking.currentSessionStart
    ) {
      const now = new Date();
      const sessionDuration = Math.floor(
        (now - task.timeTracking.currentSessionStart) / 1000
      );

      task.timeTracking.sessions.push({
        startTime: task.timeTracking.currentSessionStart,
        endTime: now,
        duration: sessionDuration,
        type: "work",
      });

      task.timeTracking.totalSeconds += sessionDuration;
      task.timeTracking.currentSessionStart = null;
    }

    task.status = "completed";
    task.completedAt = new Date();

    await task.save();

    res.json({
      message: "Task completed",
      task,
    });
  } catch (error) {
    console.error("Complete task error:", error);
    res
      .status(500)
      .json({ message: "Error completing task", error: error.message });
  }
});

// Stop task (same as pause for now)
router.post("/:taskId/stop", employeeAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const employee = req.employee;

    const task = await Task.findOne({
      _id: taskId,
      employee: employee._id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status !== "in_progress") {
      return res.status(400).json({ message: "Task is not in progress" });
    }

    const now = new Date();
    const sessionDuration = Math.floor(
      (now - task.timeTracking.currentSessionStart) / 1000
    );

    task.timeTracking.sessions.push({
      startTime: task.timeTracking.currentSessionStart,
      endTime: now,
      duration: sessionDuration,
      type: "work",
    });

    task.timeTracking.totalSeconds += sessionDuration;
    task.timeTracking.currentSessionStart = null;
    task.status = "pending";

    await task.save();

    res.json({
      message: "Task stopped",
      task,
      sessionDuration,
    });
  } catch (error) {
    console.error("Stop task error:", error);
    res
      .status(500)
      .json({ message: "Error stopping task", error: error.message });
  }
});

// Update task
router.put("/:taskId", employeeAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, priority, dueDate, tags } = req.body;
    const employee = req.employee;

    const task = await Task.findOne({
      _id: taskId,
      employee: employee._id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // if (title !== undefined) task.title = title.trim();
    // if (description !== undefined) task.description = description?.trim();
    if (title !== undefined || description !== undefined) {
      task.history.push({
        title: title !== undefined ? title.trim() : "",
        description: description !== undefined ? description.trim() : "",
      });
    }
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined)
      task.dueDate = dueDate ? new Date(dueDate) : null;
    if (tags !== undefined) task.tags = tags;

    await task.save();

    res.json({
      message: "Task updated",
      task,
    });
  } catch (error) {
    console.error("Update task error:", error);
    res
      .status(500)
      .json({ message: "Error updating task", error: error.message });
  }
});

// Delete task
router.delete("/:taskId", employeeAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const employee = req.employee;

    // const task = await Task.findOneAndDelete({
    //   _id: taskId,
    //   employee: employee._id
    // });
    const task = await Task.findByIdAndUpdate(
      taskId,
      { stopTime: new Date(), isArchived: true },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    res
      .status(500)
      .json({ message: "Error deleting task", error: error.message });
  }
});

// Carry forward incomplete tasks
router.post("/carry-forward", employeeAuth, async (req, res) => {
  try {
    const employee = req.employee;
    const yesterday = moment().subtract(1, "day").startOf("day").toDate();
    const yesterdayEnd = moment().subtract(1, "day").endOf("day").toDate();
    const today = moment().startOf("day").toDate();

    // Find incomplete tasks from yesterday
    const incompleteTasks = await Task.find({
      employee: employee._id,
      date: { $gte: yesterday, $lte: yesterdayEnd },
      status: { $in: ["pending", "in_progress", "paused"] },
    });

    const carriedTasks = [];

    for (const oldTask of incompleteTasks) {
      // Create new task for today
      const newTask = new Task({
        employee: oldTask.employee,
        organization: oldTask.organization,
        // title: oldTask.title,
        // description: oldTask.description,
        history: oldTask.history,
        priority: oldTask.priority,
        dueDate: oldTask.dueDate,
        tags: oldTask.tags,
        date: today,
        isCarriedForward: true,
        carriedFromDate: oldTask.date,
        status: "pending",
        startTime: new Date().toISOString(),
        pauseTime: new Date().toISOString(),
      });

      await newTask.save();
      carriedTasks.push(newTask);

      // Update old task status
      oldTask.status = "cancelled";
      await oldTask.save();
    }

    res.json({
      message: `${carriedTasks.length} tasks carried forward to today`,
      carriedTasks,
      count: carriedTasks.length,
    });
  } catch (error) {
    console.error("Carry forward tasks error:", error);
    res
      .status(500)
      .json({ message: "Error carrying forward tasks", error: error.message });
  }
});

// Get tasks for a specific employee (Admin only)
router.get("/employee/:employeeId", auth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status, priority, limit = 50, page = 1 } = req.query;

    // Validate employee ID
    if (!employeeId) {
      return res.status(400).json({ message: "Employee ID is required" });
    }

    // Check if employee exists and belongs to the same organization
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Verify the employee belongs to the admin's organization
    if (employee.organization.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Build query
    const query = { employee: employeeId };
    if (status) {
      query.status = status;
    }
    if (priority) {
      query.priority = priority;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get tasks
    const tasks = await Task.find(query)
      .populate("employee", "name email department")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const totalTasks = await Task.countDocuments(query);

    // Calculate statistics
    const stats = await Task.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
          inProgressTasks: {
            $sum: {
              $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0],
            },
          },
          pendingTasks: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },
          totalTimeSpent: { $sum: "$timeTracking.totalSeconds" },
        },
      },
    ]);

    const statistics = stats[0] || {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      pendingTasks: 0,
      totalTimeSpent: 0,
    };

    res.json({
      success: true,
      tasks,
      statistics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTasks / parseInt(limit)),
        totalTasks,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching employee tasks:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get tasks employee wise (Admin only)
router.get("/employee-wise", auth, async (req, res) => {
  try {
    const organizationId = req.user._id;
    const { status, priority, limit = 50, page = 1, date } = req.query;

    // get all employees of the organization
    const employees = await Employee.find({
      organization: organizationId,
    }).select("name email department");

    const employeeIds = employees.map((e) => e._id);

    // Build match query
    const matchQuery = { employee: { $in: employeeIds } };

    if (status && status !== "all") matchQuery.status = status;
    if (priority && priority !== "all") matchQuery.priority = priority;

    // Date range filter
    if (date) {
      matchQuery.createdAt = {};

      matchQuery.createdAt.$gte = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      matchQuery.createdAt.$lte = endDate;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Aggregation: group tasks by employee
    const groupedData = await Task.aggregate([
      { $match: matchQuery },

      { $sort: { createdAt: -1 } },

      { $skip: skip },
      { $limit: parseInt(limit) },

      {
        $group: {
          _id: "$employee",
          tasks: { $push: "$$ROOT" },
        },
      },

      // Lookup employee data
      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },

      // Lookup department details
      {
        $lookup: {
          from: "departments",
          localField: "employee.department",
          foreignField: "_id",
          as: "departmentInfo",
        },
      },
      {
        $unwind: {
          path: "$departmentInfo",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Final response structure
      {
        $project: {
          _id: 0,
          employee: {
            _id: "$employee._id",
            name: "$employee.name",
            email: "$employee.email",
            department: {
              _id: "$departmentInfo._id",
              name: "$departmentInfo.name",
              colorCode: "$departmentInfo.colorCode",
            },
          },
          tasks: 1,
        },
      },
    ]);

    // Count total tasks for pagination
    const totalTasks = await Task.countDocuments(matchQuery);

    res.json({
      success: true,
      employeeWiseTasks: groupedData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTasks / parseInt(limit)),
        totalTasks,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching employee wise tasks:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
