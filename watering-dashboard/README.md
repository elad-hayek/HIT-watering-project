# Watering Dashboard

A comprehensive system for managing watering zones and plants with interactive maps and user management.

## Features

1. ✅ User Registration and Login with Hierarchy
2. ✅ Create and Manage Areas (Zones)
3. ✅ Upload Maps/Images for Areas
4. ✅ Place Plants/Watering Stations on Interactive Maps
5. ✅ Full CRUD Operations for Areas and Plants
6. ✅ Audit Logging
7. ✅ Professional UI/UX Design

## Tech Stack

- **Frontend**: React, React Router, Leaflet, Leaflet-Draw
- **Backend**: Express.js, Node.js
- **Database**: MySQL
- **File Upload**: Multer
- **CORS**: Enabled for cross-origin requests

## Installation

### Prerequisites

- Node.js 14+
- MySQL 8.0+

### Setup

1. **Create Database**

```bash
mysql -u root < watering_db.sql
```

2. **Server Setup**

```bash
cd server
cp .env.example .env
# Edit .env with your MySQL credentials
npm install
npm run dev
```

3. **Client Setup**

```bash
cd client
npm install
npm start
```

## Project Structure

```
watering-dashboard/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # React Components
│   │   ├── utils/          # Utility Functions
│   │   └── App.jsx         # Main App Component
│   └── package.json
├── server/                 # Express Backend
│   ├── Database.js         # MySQL Connection
│   ├── areas.js            # Areas API
│   ├── plants.js           # Plants API
│   ├── users.js            # Users API
│   ├── logs.js             # Audit Logs
│   ├── server.js           # Main Server
│   └── package.json
└── README.md
```

## API Endpoints

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

- `GET /api/plants` - Get all plants
- `POST /api/plants` - Create new plant
- `GET /api/plants/:id` - Get plant details
- `PUT /api/plants/:id` - Update plant
- `DELETE /api/plants/:id` - Delete plant

### Audit Logs

- `GET /api/audit` - Get audit logs

## License

MIT
