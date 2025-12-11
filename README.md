# TMBC Attendance Monitoring System

A comprehensive employee attendance monitoring system with admin dashboard and mobile app integration.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- npm or yarn

### Installation

1. **Clone the repository** (if applicable)

   ```bash
   cd "tmbc attendance app"
   ```
2. **Setup Server**

   ```bash
       cd server
   npm install
   cp env.example .env
   # Edit .env with your configuration
   ```
3. **Setup Admin Dashboard**

   ```bash
   cd ../admin
   npm install
   ```
4. **Create First Admin Account**

   ```bash
   cd ../server
   npm run setup:admin
   ```

   This will create an organization admin with credentials from your `.env` file.

   **Default credentials:**

   - Email: `admin@tmbc.com`
   - Password: `Admin@123456`

   ⚠️ **Change the password immediately after first login!**
5. **Start the Application**

   **Terminal 1 - Start Server:**

   ```bash
   cd server
   npm run dev
   ```

   Server runs on: http://localhost:5000

   **Terminal 2 - Start Admin Dashboard:**

   ```bash
   cd admin
   npm run dev
   ```

   Admin Dashboard runs on: http://localhost:3000
6. **Login to Admin Dashboard**

   - Open: http://localhost:3000/auth/login
   - Use the admin credentials created in step 4

---

## 📁 Project Structure

```
tmbc attendance app/
├── server/              # Backend API (Express + MongoDB)
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth & validation middleware
│   ├── utils/           # Helper functions
│   ├── scripts/         # Setup & utility scripts
│   └── index.js         # Server entry point
│
├── admin/               # Admin Dashboard (Next.js)
│   ├── app/             # Next.js app directory
│   ├── components/      # React components
│   ├── lib/             # Redux store & utilities
│   └── public/          # Static assets
│
└── README.md            # This file
```

---

## 🔧 Configuration

### Server Environment Variables (.env)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/tmbc-attendance

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here

# First Admin Credentials
FIRST_ADMIN_EMAIL=admin@tmbc.com
FIRST_ADMIN_PASSWORD=Admin@123456

# Admin Dashboard URL
ADMIN_URL=http://localhost:3000

# Email Configuration (for employee invitations)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@tmbc.com
```

---

## 👤 Admin Account Management

### Single Organization Admin

This system is designed for **ONE organization admin** who manages all employees.

**Admin Capabilities:**

- ✅ Invite and manage employees
- ✅ View attendance reports
- ✅ Configure system settings
- ✅ Perform bulk operations
- ✅ Monitor employee activity

### Verify Admin Account

```bash
cd server
npm run verify:admin
```

### Reset Admin Password

If you forget the password, delete and recreate:

```bash
cd server
# This will show existing admin
npm run verify:admin

# Delete all admins and create new one
mongosh tmbc-attendance --eval "db.admins.deleteMany({})"
npm run setup:admin
```

---

## 📱 Features

### Admin Dashboard

- Employee management (invite, activate, deactivate)
- Attendance monitoring and reports
- Bulk employee operations
- Real-time notifications
- Role-based permissions
- Secure authentication with NextAuth

### Employee Features (Mobile App)

- QR code-based attendance
- Check-in/check-out tracking
- Attendance history
- Profile management

---

## 🛠️ Development

### Server Development

```bash
cd server
npm run dev        # Start with nodemon (auto-reload)
```

### Admin Dashboard Development

```bash
cd admin
npm run dev        # Start Next.js dev server
```

### Build for Production

**Server:**

```bash
cd server
npm start
```

**Admin Dashboard:**

```bash
cd admin
npm run build
npm start
```

---

## 📊 Database Models

### Admin

- Organization administrator account
- Roles: super_admin, admin, hr_manager
- Permissions-based access control

### Employee

- Employee accounts with invitation system
- Status: pending, active, inactive, suspended
- Profile information and preferences

### Attendance (Future)

- Check-in/check-out records
- Location tracking
- Reports and analytics

---

## 🔒 Security Features

- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Rate limiting on API endpoints
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input validation
- ✅ Session management
- ✅ Secure invitation tokens

---

## 📝 API Endpoints

### Authentication

- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/me` - Get current admin info

### Employees

- `GET /api/employees` - List all employees
- `POST /api/employees` - Create employee (invite)
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `POST /api/employees/bulk-invite` - Bulk invite employees

### Invites

- `POST /api/invites/send` - Send invitation
- `POST /api/invites/resend/:id` - Resend invitation
- `POST /api/invites/revoke/:id` - Revoke invitation

### Reports

- `GET /api/reports/attendance` - Attendance reports
- `GET /api/reports/summary` - Summary statistics

---

## 🐛 Troubleshooting

### MongoDB Connection Error

```bash
# Make sure MongoDB is running
sudo systemctl start mongod
# or
mongod
```

### Port Already in Use

Change the port in `.env`:

```env
PORT=5001
```

### Admin Already Exists

```bash
# Verify existing admin
npm run verify:admin

# If needed, delete and recreate
mongosh tmbc-attendance --eval "db.admins.deleteMany({})"
npm run setup:admin
```

---

## 📖 Documentation

- [Server Setup Guide](server/SETUP.md)
- API Documentation (coming soon)
- Deployment Guide (coming soon)

---

## 🤝 Support

For issues or questions:

1. Check the troubleshooting section
2. Review the setup documentation
3. Check server logs for errors

---

## 📄 License

ISC

---

## 🎯 Roadmap

- [ ] Mobile app integration
- [ ] Advanced reporting and analytics
- [ ] Multi-location support
- [ ] Shift management
- [ ] Leave management
- [ ] Notifications system
- [ ] Export reports (PDF, Excel)
- [ ] Dashboard widgets
- [ ] Audit logs viewer

---

**Version:** 1.0.0
**Last Updated:** October 2025
