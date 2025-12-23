const express = require("express");
const jwt = require("jsonwebtoken");
const Organization = require("../models/Organization");
const Employee = require("../models/Employee");
const { auth } = require("../middleware/auth");
const { sendOTPEmail } = require("../utils/email");

const router = express.Router();

// // @route   POST /api/auth/callback/credentials
// // @desc    NextAuth credentials callback (for admin web app)
// // @access  Public
// router.post('/callback/credentials', async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({
//         error: 'ValidationError',
//         message: 'Please provide both email and password'
//       });
//     }

//     const organization = await Organization.findOne({ email, isActive: true });
//     if (!organization) {
//       return res.status(401).json({
//         error: 'InvalidCredentials',
//         message: 'Invalid email or password. Please check your credentials and try again.'
//       });
//     }

//     const isMatch = await organization.comparePassword(password);
//     if (!isMatch) {
//       return res.status(401).json({
//         error: 'InvalidCredentials',
//         message: 'Invalid email or password. Please check your credentials and try again.'
//       });
//     }

//     // Update last login
//     organization.lastLogin = new Date();
//     await organization.save();

//     const payload = {
//       id: organization._id,
//       email: organization.email,
//       role: organization.role,
//       permissions: organization.permissions
//     };

//     const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
//       expiresIn: '30d' // 30 days (1 month)
//     });

//     res.json({
//       token,
//       admin: {
//         id: organization._id,
//         name: organization.name,
//         email: organization.email,
//         role: organization.role,
//         permissions: organization.permissions
//       }
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({
//       error: 'ServerError',
//       message: 'An error occurred during login. Please try again later.'
//     });
//   }
// });

// @route   POST /api/auth/callback/credentials
// @desc    NextAuth credentials callback (Admin + Employee)
// @access  Public
router.post("/callback/credentials", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("📱 Login attempt:", { email, password });

    if (!email || !password) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Please provide both email and password",
      });
    }

    /* =========================
       1️⃣ Try Organization Admin
       ========================= */

    const organization = await Organization.findOne({
      email,
      isActive: true,
    });

    if (organization) {
      const isMatch = await organization.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          error: "InvalidCredentials",
          message: "Invalid email or password.",
        });
      }

      organization.lastLogin = new Date();
      await organization.save();

      const payload = {
        id: organization._id,
        email: organization.email,
        role: organization.role,
        permissions: organization.permissions,
        organizationId: organization._id,
        // userType: "admin",
      };

      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || "fallback-secret",
        { expiresIn: "30d" }
      );

      return res.json({
        token,
        // userType: "admin",
        user: {
          id: organization._id,
          name: organization.name,
          email: organization.email,
          role: organization.role,
          permissions: organization.permissions,
        },
      });
    }

    /* =========================
       2️⃣ Try Employee (Manager / Team Lead)
       ========================= */

    const employee = await Employee.findOne({
      email,
      // isActive: true,
      role: { $in: ["manager", "teamlead"] },
    }).populate("organization", "name isActive");

    if (!employee || !employee.organization?.isActive) {
      return res.status(401).json({
        error: "InvalidCredentials",
        message: "Invalid email or password.",
      });
    }

    const isEmployeeMatch = await employee.comparePassword(password);
    if (!isEmployeeMatch) {
      return res.status(401).json({
        error: "InvalidCredentials",
        message: "Invalid email or password.",
      });
    }

    employee.lastLogin = new Date();
    await employee.save();

    const payload = {
      id: employee._id,
      email: employee.email,
      role: employee.role, // manager | teamlead
      permissions: employee.permissions,
      organizationId: employee.organization._id,
      employeeId: employee._id,
      userType: "employee",
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "30d" }
    );

    return res.json({
      token,
      // userType: "employee",
      user: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        permissions: employee.permissions,
        organization: {
          id: employee.organization._id,
          name: employee.organization.name,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "ServerError",
      message: "An error occurred during login. Please try again later.",
    });
  }
});

// @route   POST /api/auth/login
// @desc    Organization login (alternative endpoint)
// @access  Public
// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     console.log(email, password)
//     if (!email || !password) {
//       return res.status(400).json({
//         error: 'ValidationError',
//         message: 'Please provide both email and password'
//       });
//     }

//     const organization = await Organization.findOne({ email, isActive: true });
//     if (!organization) {
//       return res.status(401).json({
//         error: 'InvalidCredentials',
//         message: 'Invalid email or password. Please check your credentials and try again.'
//       });
//     }

//     const isMatch = await organization.comparePassword(password);
//     if (!isMatch) {
//       return res.status(401).json({
//         error: 'InvalidCredentials',
//         message: 'Invalid email or password. Please check your credentials and try again.'
//       });
//     }

//     // Update last login
//     organization.lastLogin = new Date();
//     await organization.save();

//     const payload = {
//       id: organization._id,
//       email: organization.email,
//       role: organization.role,
//       permissions: organization.permissions
//     };

//     const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
//       expiresIn: '30d' // 30 days (1 month)
//     });

//     res.json({
//       token,
//       admin: {
//         id: organization._id,
//         name: organization.name,
//         email: organization.email,
//         role: organization.role,
//         permissions: organization.permissions
//       }
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({
//       error: 'ServerError',
//       message: 'An error occurred during login. Please try again later.'
//     });
//   }
// });

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Please provide both email and password",
      });
    }

    /* =========================
       1️⃣ Try Organization Admin
       ========================= */

    const organization = await Organization.findOne({
      email,
      isActive: true,
    });

    if (organization) {
      const isMatch = await organization.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          error: "InvalidCredentials",
          message: "Invalid email or password.",
        });
      }

      organization.lastLogin = new Date();
      await organization.save();

      const payload = {
        id: organization._id,
        role: organization.role,
        email: organization.email,
        permissions: organization.permissions,
        organizationId: organization._id,
      };

      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || "fallback-secret",
        { expiresIn: "30d" }
      );

      return res.json({
        token,
        userType: "admin",
        admin: {
          id: organization._id,
          name: organization.name,
          email: organization.email,
          role: organization.role,
          permissions: organization.permissions,
        },
      });
    }

    /* =========================
       2️⃣ Try Employee Login
       ========================= */

    const employee = await Employee.findOne({
      email,
      // isActive: true,
      role: { $in: ["team_lead", "manager"] },
    }).populate("organization", "name email isActive");

    if (!employee || !employee.organization?.isActive) {
      return res.status(401).json({
        error: "InvalidCredentials",
        message: "Invalid email or password.",
      });
    }

    const isEmployeeMatch = await employee.comparePassword(password);
    if (!isEmployeeMatch) {
      return res.status(401).json({
        error: "InvalidCredentials",
        message: "Invalid email or password.",
      });
    }

    employee.lastLogin = new Date();
    await employee.save();

    const payload = {
      id: employee._id,
      email: employee.email,
      role: employee.role, // teamlead | manager
      permissions: employee.permissions,
      organizationId: employee.organization._id,
      employeeId: employee._id,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "30d" }
    );

    return res.json({
      token,
      userType: "employee",
      admin: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        permissions: employee.permissions,
        organization: {
          id: employee.organization._id,
          name: employee.organization.name,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "ServerError",
      message: "An error occurred during login. Please try again later.",
    });
  }
});

// @route   POST /api/auth/employee-login
// @desc    Employee login
// @access  Public
router.post("/employee-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("📱 Employee login attempt:", {
      email,
      hasPassword: !!password,
    });

    if (!email || !password) {
      console.log("❌ Validation failed: Missing email or password");
      return res.status(400).json({
        error: "ValidationError",
        message: "Please provide both email and password",
      });
    }

    console.log("🔍 Searching for employee:", email);
    const employee = await Employee.findOne({
      email,
      status: "active",
    }).populate("department", "_id name");
    console.log("🔍 Employee:", employee);

    if (!employee) {
      console.log("❌ Employee not found or not active:", email);
      return res.status(401).json({
        error: "InvalidCredentials",
        message:
          "Invalid email or password. Please check your credentials and try again.",
      });
    }

    console.log("✅ Employee found:", {
      id: employee._id,
      name: employee.name,
      status: employee.status,
      hasPassword: !!employee.password,
    });

    const isMatch = await employee.comparePassword(password);
    console.log("🔐 Password match:", isMatch);

    if (!isMatch) {
      console.log("❌ Password mismatch for employee:", email);
      return res.status(401).json({
        error: "InvalidCredentials",
        message:
          "Invalid email or password. Please check your credentials and try again.",
      });
    }

    // Update last login
    employee.lastLogin = new Date();
    await employee.save();
    console.log("✅ Last login updated");

    const payload = {
      userId: employee._id,
      email: employee.email,
      role: employee.role,
      organization: employee.organization,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "fallback-secret",
      {
        expiresIn: "30d", // 30 days (1 month)
      }
    );

    console.log("✅ Employee login successful:", {
      employeeId: employee.employeeId,
      name: employee.name,
      tokenGenerated: !!token,
    });

    res.json({
      token,
      user: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        departmentId: employee.department._id,
        departmentName: employee.department.name,
        designation: employee.designation,
        role: employee.role,
        status: employee.status,
      },
    });
  } catch (error) {
    console.error("❌ Employee login error:", error);
    res.status(500).json({
      error: "ServerError",
      message: "An error occurred during login. Please try again later.",
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current organization
// @access  Private
router.get("/me", auth, async (req, res) => {
  try {
    res.json({
      admin: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        permissions: req.user.permissions,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({
      error: "ServerError",
      message: "An error occurred. Please try again later.",
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Organization logout (client-side token removal)
// @access  Private
router.post("/logout", auth, (req, res) => {
  res.json({ message: "Logged out successfully" });
});

// @route   POST /api/auth/refresh-token
// @desc    Refresh authentication token
// @access  Private
router.post("/refresh-token", auth, async (req, res) => {
  try {
    const user = req.user;

    // Generate new token with same payload structure
    let payload;
    if (user.permissions) {
      // Admin/Organization token
      payload = {
        id: user._id,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      };
    } else {
      // Employee token
      payload = {
        userId: user._id,
        email: user.email,
        role: user.role,
        organization: user.organization,
      };
    }

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "fallback-secret",
      {
        expiresIn: "30d", // 30 days (1 month)
      }
    );

    res.json({
      token,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      error: "ServerError",
      message:
        "An error occurred during token refresh. Please try again later.",
    });
  }
});

router.post("/send-password-reset-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const employee = await Employee.findOne({ email });
    if (!employee) {
      return res.status(400).json({ message: "Employee not found" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    employee.otpCode = String(otp);
    employee.otpCodeExpiresAt = expiresAt;
    employee.otpCodeVerified = false;
    await employee.save();

    await sendOTPEmail(email, otp, employee.name);

    res.status(200).json({
      message: "OTP sent successfully",
      otp,
      expiresAt,
    });
  } catch (error) {
    console.error("Send password reset OTP error:", error);
    res.status(500).json({
      error: "ServerError",
      message:
        "An error occurred during send password reset OTP. Please try again later.",
    });
  }
});

router.post("/verify-password-reset-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const employee = await Employee.findOne({ email });
    if (!employee) {
      return res.status(400).json({ message: "Employee not found" });
    }

    // Convert both to strings for comparison since OTP from request is a string
    if (String(employee.otpCode) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (employee.otpCodeExpiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (employee.otpCodeVerified) {
      return res.status(400).json({ message: "OTP already verified" });
    }

    // Mark OTP as verified but don't set password yet
    employee.otpCodeVerified = true;
    await employee.save();

    // Create JWT token with employee _id, name, and email
    const payload = {
      _id: employee._id,
      name: employee.name,
      email: employee.email,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "fallback-secret",
      {
        expiresIn: "1h", // Token expires in 1 hour for password reset flow
      }
    );

    res.status(200).json({
      message: "OTP verified successfully",
      token,
    });
  } catch (error) {
    console.error("Verify password reset OTP error:", error);
    res.status(500).json({
      error: "ServerError",
      message:
        "An error occurred during verify password reset OTP. Please try again later.",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Verify and decode JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Extract email from token
    if (!decoded.email) {
      return res
        .status(400)
        .json({ message: "Invalid token: email not found" });
    }

    const email = decoded.email;

    // Find employee by email
    const employee = await Employee.findOne({ email });
    if (!employee) {
      return res.status(400).json({ message: "Employee not found" });
    }

    // Verify that OTP was verified (token proves this, but double-check for security)
    if (!employee.otpCodeVerified) {
      return res
        .status(400)
        .json({ message: "OTP not verified. Please verify OTP first." });
    }

    // Set new password
    employee.password = newPassword;
    employee.otpCode = null;
    employee.otpCodeExpiresAt = null;
    employee.otpCodeVerified = false;
    await employee.save();

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      error: "ServerError",
      message:
        "An error occurred during password reset. Please try again later.",
    });
  }
});
module.exports = router;
