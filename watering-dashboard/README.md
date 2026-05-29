# README

# Watering Dashboard - Setup Guide

A full-stack web application for managing watering zones and plants with interactive maps - built with React + Leaflet (frontend) and Node.js + Express + MySQL (backend).

Supports creating and editing areas (zones), placing plants/watering stations on maps, photo uploads, and an audit log for all user actions.

## 1. Requirements

Make sure the following are installed:

- Node.js (v18 or newer)
- npm (comes with Node)
- MySQL Server
- Git (optional, for cloning)

## 2. Backend/Frontend Setup

### Step 1 - Install dependencies

```bash
npm install i
```

### Step 2 - Create `.env` file

Create the `.env` file in the server directory:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=watering_db
PORT=3000
NODE_ENV=development
```

### Step 3 - Create the database in MySQL

```sql
CREATE DATABASE watering_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 4 - Run database migrations

```bash
cd database
# On Windows
powershell -ExecutionPolicy Bypass -File run_migrations.ps1

# On Linux/Mac
bash run_migrations.sh
```

### Step 5 - Start backend

```bash
cd server
npm install
node server.js
```

## 3. Frontend Setup (React)

### Step 1 - Go to frontend folder

```bash
cd client
```

### Step 2 - Start frontend

```bash
npm start
```

If using Vite:

```bash
npm run dev
```

## 4. Environment Notes

- The `.env` file must exist before running the backend.
- Backend runs on `http://localhost:3000`
- Frontend runs on `http://localhost:5173` (Vite) or `3000` (Create React App).
- CORS is enabled for local development.

## 5. Usage Flow

1. Register a user account
2. Login with your credentials
3. The system opens the dashboard
4. Add or edit watering zones (areas) using the map interface
5. Place plants/watering stations on the interactive map
6. Upload photos for areas and plants
7. Check audit logs for all system actions
