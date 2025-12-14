# TMBC Attendance App - Setup Guide

## Initial Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` file to `.env`:
```bash
cp env.example .env
```

Edit `.env` and update the following:
```env
# Database
MONGODB_URI=mongodb://192.168.31.75:27017/tmbc-attendance

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here

# First Admin Credentials
FIRST_ADMIN_EMAIL=admin@tmbc.com
FIRST_ADMIN_PASSWORD=Admin@123456

# Email Configuration (for sending invites)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Start MongoDB
Make sure MongoDB is running:
```bash
# If using local MongoDB
mongod

# Or if using Docker
docker run -d -p 27017:27017 --name mongodb mongo
```

### 4. Create First Admin Account
Run the setup script to create the organization admin:
```bash
npm run setup:admin
```

This will create a super admin account with the credentials from your `.env` file.

**Output:**
```
✅ First admin created successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: admin@tmbc.com
🔑 Password: Admin@123456
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  IMPORTANT: Please change the password after first login!
🌐 Login at: http://192.168.31.75:3000/auth/login
```

### 5. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will start on: `http://192.168.31.75:5000`

### 6. Access Admin Dashboard
1. Open your browser and go to: `http://192.168.31.75:3000/auth/login`
2. Login with the admin credentials
3. **Important:** Change your password immediately after first login!

---

## Admin Account Management

### Single Organization Admin
This system is designed for **ONE organization admin** (super admin) who manages all employees.

The admin can:
- ✅ Invite employees
- ✅ Manage employee accounts
- ✅ View attendance reports
- ✅ Configure system settings
- ✅ Perform bulk operations

### Resetting Admin Password

If you forget the admin password, you can reset it using MongoDB:

```bash
# Connect to MongoDB
mongosh tmbc-attendance

# Update admin password (this will be hashed on next login)
db.admins.updateOne(
  { email: "admin@tmbc.com" },
  { $set: { password: "$2b$12$newHashedPasswordHere" } }
)
```

Or delete and recreate:
```bash
# Delete existing admin
mongosh tmbc-attendance --eval 'db.admins.deleteMany({})'

# Run setup script again
npm run setup:admin
```

---

## Troubleshooting

### "Admin already exists" message
If you see this message, an admin account already exists. To view the existing admin:

```javascript
// In MongoDB shell
mongosh tmbc-attendance
db.admins.findOne({}, { password: 0 })
```

### Cannot connect to MongoDB
Make sure MongoDB is running:
```bash
# Check if MongoDB is running
ps aux | grep mongod

# Or check the service
sudo systemctl status mongod
```

### Port already in use
If port 5000 is already in use, change it in `.env`:
```env
PORT=5001
```

---

## Security Recommendations

1. **Change default password immediately** after first login
2. **Use strong passwords** (minimum 12 characters, mix of letters, numbers, symbols)
3. **Keep JWT_SECRET secure** and never commit it to version control
4. **Enable HTTPS** in production
5. **Set up firewall rules** to restrict database access
6. **Regular backups** of MongoDB database
7. **Monitor login attempts** and failed authentications

---

## Next Steps

After setting up the admin account:

1. Login to the admin dashboard
2. Change your password
3. Configure email settings for employee invitations
4. Start inviting employees
5. Set up attendance monitoring

For more information, see the main [README.md](../README.md)


