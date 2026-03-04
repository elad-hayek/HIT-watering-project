# Watering Dashboard - Setup & Deployment Guide

Complete guide to set up and run the Watering Dashboard project.

## 📋 Prerequisites

- **Node.js** 14.x or higher
- **npm** 6.x or higher
- **MySQL** 8.0 or higher
- **Git** (optional)

## 🗄️ Database Setup

### 1. Create the Database

Open MySQL command line or MySQL Workbench and run:

```bash
mysql -u root -p < watering_db.sql
```

Or if you don't have a root password:

```bash
mysql -u root < watering_db.sql
```

This will create:

- Database: `watering_db`
- Tables: `users`, `areas`, `plants`, `audit_log`
- Sample user: ID `340969674`, Password `123456`

### 2. Verify Database

```bash
mysql -u root -p watering_db
SHOW TABLES;
SELECT * FROM users;
EXIT;
```

## 🚀 Server Setup

### 1. Navigate to Server Directory

```bash
cd watering-dashboard/server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Edit `.env` file with your MySQL credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=watering_db
PORT=3000
```

Leave `DB_PASSWORD` empty if you have no password.

### 4. Create Uploads Directory

```bash
mkdir -p uploads/areas
```

### 5. Start the Server

**Development mode (with auto-reload):**

```bash
npm run dev
```

**Production mode:**

```bash
node server.js
```

The server will start on `http://localhost:3000`

**Expected Output:**

```
✅ Connected to MySQL database!
🌱 Watering Dashboard API running on http://localhost:3000
```

## 💻 Client Setup

### 1. Navigate to Client Directory

```bash
cd watering-dashboard/client
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Client

```bash
npm start
```

The app will open on `http://localhost:3000` in your browser.

**Note:** If port 3000 is in use, the app may open on a different port like 3001.

## 🔐 Demo Credentials

Use these credentials to test the application:

```
ID: 340969674
Password: 123456
```

## 📁 Project Structure

```
watering-dashboard/
├── client/                          # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Home.jsx            # Landing page
│   │   │   ├── Home_AfterLogin.jsx # Main dashboard
│   │   │   ├── LoginPage.jsx       # Login form
│   │   │   ├── Register.jsx        # Registration
│   │   │   ├── Header.jsx          # Navigation
│   │   │   ├── AddAreaButton.jsx   # Create area
│   │   │   ├── EditAreaModal.jsx   # Edit area
│   │   │   ├── AddPlantButton.jsx  # Create plant
│   │   │   ├── EditPlantModal.jsx  # Edit plant
│   │   │   ├── AreaDetailMap.jsx   # Map display
│   │   │   ├── user.jsx            # User profile
│   │   │   └── notification.jsx    # Activity log
│   │   ├── utils/
│   │   │   ├── auth.front.js       # Auth utilities
│   │   │   └── geo.front.js        # Geo utilities
│   │   ├── App.jsx                 # Main app component
│   │   ├── index.js                # React entry point
│   │   └── index.css               # Global styles
│   ├── public/
│   │   ├── index.html              # HTML template
│   │   ├── manifest.json           # PWA manifest
│   │   └── robots.txt              # SEO
│   └── package.json
├── server/                          # Express Backend
│   ├── Database.js                 # MySQL connection
│   ├── users.js                    # User routes
│   ├── areas.js                    # Area routes
│   ├── plants.js                   # Plant routes
│   ├── logs.js                     # Audit log routes
│   ├── server.js                   # Main server
│   ├── .env                        # Environment config
│   ├── uploads/                    # Uploaded files
│   └── package.json
├── watering_db.sql                 # Database schema
├── README.md                        # Project readme
└── package.json
```

## 🔌 API Endpoints

### Users

- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users/:id` - Get user info

### Areas

- `GET /api/areas` - Get all areas
- `POST /api/areas` - Create new area
- `GET /api/areas/:id` - Get area details
- `PUT /api/areas/:id` - Update area
- `DELETE /api/areas/:id` - Delete area
- `POST /api/areas/:id/photo` - Upload area photo

### Plants

- `GET /api/plants?areaId=:id` - Get plants in area
- `POST /api/plants` - Create new plant
- `GET /api/plants/:id` - Get plant details
- `PUT /api/plants/:id` - Update plant
- `DELETE /api/plants/:id` - Delete plant

### Audit Logs

- `GET /api/audit` - Get audit logs
- `GET /api/audit/entity/:type/:id` - Get entity logs

## 🛠️ Troubleshooting

### MySQL Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solution:** Make sure MySQL is running and credentials in `.env` are correct.

### Port Already in Use

```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :3000
kill -9 <PID>
```

### CORS Error

**Solution:** The server has CORS enabled. Make sure the client is accessing `http://localhost:3000` for the API.

### Module Not Found

```bash
# Clean node_modules and reinstall
rm -rf node_modules
npm install
```

## 🎨 Features Implemented

✅ User registration with 9-digit ID validation
✅ Secure login system
✅ Create and manage watering areas
✅ Add and manage plants per area
✅ Interactive maps with Leaflet
✅ Plant status tracking (healthy, needs water, diseased, dormant)
✅ Soil moisture monitoring
✅ Watering frequency management
✅ Comprehensive audit logging
✅ Professional responsive UI
✅ Mobile-friendly design

## 📝 Database Schema

### users

- `id` - Primary key
- `username` - 9-digit ID (unique)
- `password` - User password
- `name` - First name
- `lastname` - Last name
- `title` - Job title
- `city` - City
- `created_at` - Registration date

### areas

- `id` - Primary key
- `name` - Area name
- `description` - Area description
- `type` - rectangle or polygon
- `bounds_json` - Geographic bounds
- `positions` - Coordinate positions
- `photo_url` - Area image URL
- `created_by` - User ID who created
- `created_at` - Creation date

### plants

- `id` - Primary key
- `area_id` - Foreign key to areas
- `name` - Plant name
- `type` - Plant type/species
- `lat` - Latitude
- `lng` - Longitude
- `watering_frequency_days` - Watering interval
- `last_watered` - Last watering date
- `status` - Plant health status
- `soil_moisture` - Moisture percentage
- `notes` - Additional notes
- `created_by` - User ID who created
- `created_at` - Creation date

### audit_log

- `id` - Primary key
- `action` - Action type
- `entity_type` - Type of entity affected
- `entity_id` - ID of entity
- `actor` - User who performed action
- `ip_address` - IP address
- `details` - JSON details
- `created_at` - Action timestamp

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [MySQL Documentation](https://dev.mysql.com/doc)
- [Leaflet Map Library](https://leafletjs.com)

## 📞 Support

For issues or questions about this project, please refer to the project documentation or create an issue.

---

**Happy Watering! 🌿💧**
