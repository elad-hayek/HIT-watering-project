# Watering Dashboard - Project Specification

**Written by:**  
Elad Hayek  
Shirin Fakiri  
Daniel Gunko  
Gleb Tyutrin

Faculty of Science, HIT - Holon Institute of Technology

---

# Table of Contents

- Administration
  - 0.1 Introduction – Existing Situation (Problem/Gaps)
  - 0.2 Rationale and Goals
  - 0.3 Concepts & Definitions

- System Description
  - 1.1 Application Character & Scope
  - 1.2 Users & Roles
  - 1.3 Usage Scenarios (Use Cases)
    - 1.3.1 Viewer Use Cases
    - 1.3.2 Registered User Use Cases
    - 1.3.3 Area Manager Use Cases
    - 1.3.4 Administrator Use Cases

- Preliminary Specification Document
- Class Diagram
- Activity Diagram

---

# 0. Administration

## 0.1 Introduction – Existing Situation (Problem/Gaps)

Agricultural and landscape management operations today face significant challenges in organizing and monitoring distributed watering zones across multiple geographically dispersed locations. Organizations and municipalities managing multiple areas must manually coordinate watering schedules, track plant health through scattered documents, and maintain accurate operational records.

**Key Problems:**

- Watering zone information exists in scattered documents and spreadsheets with no unified platform
- No interactive mapping of watering areas and plant locations; coordinates are text-based without visual context
- No role-based access control mechanism; difficult to delegate responsibility or track who made changes
- No comprehensive action tracking; impossible to investigate issues or verify compliance
- Manual reporting and status monitoring take significant time and operational effort

The goal is a web platform that centralizes watering management data, offers an interactive map for operations, and enables transparent team collaboration.

---

## 0.2 Rationale and Goals

The Watering Dashboard is a web-based system designed to provide an efficient solution for managing and monitoring watering zones and associated plants across different geographic areas.

**System Goals:**

1. **Centralize Operations** – Single platform for managing all watering zones, plants, and their status
2. **Enable Team Collaboration** – Role-based access for different team members with clear audit trails
3. **Ensure Data Integrity** – Validate plant locations fall within authorized area boundaries
4. **Facilitate Decision-Making** – Dashboard with visual mapping and activity history for compliance
5. **Scalable & Maintainable** – Modular three-tier architecture supporting growth

The system helps organizations maintain up-to-date geographic area definitions, plant locations, team assignments, and operational history in a single accessible location.

---

## 0.3 Concepts & Definitions

### Watering Area / Zone

A defined geographic region with boundaries visualized on an interactive map. Can be a rectangle or polygon.

### Plant / Watering Station

A specific location within a watering area with latitude/longitude coordinates. Includes status (healthy, needs water, diseased, dormant).

### Geographic Boundary

Visual representation of an area's extent via rectangle (two corner points) or polygon (multiple vertices).

### Role / User Role

A global permission level: **User** (read-only on assigned areas), **Area Manager** (create areas, manage plants, assign permissions), or **Admin** (full system access).

### Area-Level Permission

Access grant for a specific user within a specific area: **read** (view only), **update** (edit plants), **area_manager** (full management), or **admin** (administrative).

### Coordinate Validation

Verification that a plant's coordinates fall within its assigned area boundary.

### Audit Trail / Activity Log

Comprehensive record of all system actions: who performed it, when, what entity was affected, and relevant details.

---

# 1. System Description

## 1.1 Application Character & Scope

- Local web application (on-prem/local) with no external cloud dependencies.
- English-only UI (no multilingual / RTL support).
- Interactive map showing areas (polygons) and plants (markers), with create/edit/delete and basic validations.
- Basic entity management: CRUD for Plants and Areas persisted to the database.
- Quality rules:
  - Plant must be inside an Area
  - Occupancy ≤ Capacity
- Role-based user authentication with audit logging.

---

## 1.2 Users & Roles

### Registered User

A person registered in the system with default "User" role. Can view assigned areas only and add plants if granted update permission.

### Area Manager

Can create areas, manage plants, and assign other users to areas with specific permissions.

### Administrator

Full system access. Can view all areas, manage all users, assign roles, and access complete audit logs.

---

# 1.3 Usage Scenarios (Use Cases)

---

## 1.3.1 Viewer Use Cases

The user sees the Watering Dashboard home page with:

- Top navigation bar: Home | About | Register | Login
- Headline and description about managing watering zones on an interactive map
- Two prominent actions: **Get Started (Register)** and **Sign In**
- Capability cards showing: Interactive Mapping, Area Management, Plant Monitoring, Role-Based Control

### Signup & Login

When clicking **Register**, user enters:

- ID (exactly 9 digits)
- Password (minimum 8 characters)
- First and last name
- City (dropdown)

System validates input, creates account with default "User" role, and redirects to login. On **Login**, user enters ID and password to access dashboard.

---

## 1.3.2 Registered User (Read-Only on Assigned Areas)

After login, user sees customized dashboard with:

**Status Cards:**

- Total assigned areas
- Total plants across assigned areas
- Recent activity

**Main Content:**

- Filterable list of assigned areas
- Interactive map showing area boundaries
- Search functionality for plants

**Available Actions:**

- View area boundaries on map
- View plants in each area with status indicators
- Search and filter plants by name/status
- View area photos/documentation
- Access own activity log entries

---

## 1.3.3 Area Manager Use Cases

### Add Area

When user clicks **Add Area**:

- Enter area name and optional description
- Draw boundary on map using rectangle or polygon tool
- Optionally upload reference map/photo
- Click "Create Area"
- System stores area with coordinates, logs action, assigns user as manager
- Result: New area visible in user's areas list and on map

### Add Plant to Area

When user clicks **Add Plant** for a specific area:

- Enter plant location by clicking map or entering coordinates
- Fill plant details: name, type, watering frequency, health status, notes
- Submit form
- System validates plant coordinates fall within area boundary
  - If valid → Plant created, marker placed on map, action logged
  - If invalid → Error message; user prompted to reposition
- Result: Plant visible on map within area boundaries

### Assign User to Area

When user clicks "Manage Users" on area details:

- Select user from dropdown (all registered users)
- Assign permission level: **read** (view only), **update** (edit plants), **area_manager** (full management)
- Click "Assign"
- System creates permission record, logs action
- Selected user now has access to area based on permission level

### Upload Photos

When user clicks "Upload Photo":

- Select image files from computer (jpg, png, gif)
- System uploads to server storage
- Photo URLs stored with area record
- Photos appear in area details view

---

## 1.3.4 Administrator Use Cases

### View Activity Dashboard

When admin clicks "Activity Dashboard":

- Dashboard displays activity entries in reverse chronological order
- Each entry shows: who performed action, when, what action, affected entity, extra details
- Admin can filter by: specific user, action type, date range
- System loads in batches for performance; infinite scroll available
- Result: Complete visibility into all system operations

### Manage Users and Roles

When admin clicks "User Management":

- Page displays all registered users with username, name, current role, assigned areas, registration date
- Admin can click user to: change global role, view/modify area-specific permissions, delete account
- Changes take immediate effect system-wide
- All modifications logged to audit trail
- Result: Full control over user access levels and permissions

---

# Preliminary Specification Document

(To be completed)

---

# Class Diagram

(To be attached)

---

# Activity Diagram

(To be attached)

### Add Area

When user clicks **Add Area**:

- Enter area name and optional description
- Draw boundary on map using rectangle or polygon tool
- Optionally upload reference map/photo
- Click "Create Area"
- System stores area with coordinates, logs action, assigns user as manager
- Result: New area visible in user's areas list and on map

### Add Plant to Area

When user clicks **Add Plant** for a specific area:

- Enter plant location by clicking map or entering coordinates
- Fill plant details: name, type, watering frequency, health status, notes
- Submit form
- System validates plant coordinates fall within area boundary
  - If valid → Plant created, marker placed on map, action logged
  - If invalid → Error message; user prompted to reposition
- Result: Plant visible on map within area boundaries

### Assign User to Area

When user clicks "Manage Users" on area details:

- Select user from dropdown (all registered users)
- Assign permission level: **read** (view only), **update** (edit plants), **area_manager** (full management)
- Click "Assign"
- System creates permission record, logs action
- Selected user now has access to area based on permission level

### Upload Photos

When user clicks "Upload Photo":

- Select image files from computer (jpg, png, gif)
- System uploads to server storage
- Photo URLs stored with area record
- Photos appear in area details view

---

## 1.3.4 Administrator Use Cases

### View Activity Dashboard

When admin clicks "Activity Dashboard":

- Dashboard displays activity entries in reverse chronological order
- Each entry shows: who performed action, when, what action, affected entity, extra details
- Admin can filter by: specific user, action type, date range
- System loads in batches for performance; infinite scroll available
- Result: Complete visibility into all system operations

### Manage Users and Roles

When admin clicks "User Management":

- Page displays all registered users with username, name, current role, assigned areas, registration date
- Admin can click user to: change global role, view/modify area-specific permissions, delete account
- Changes take immediate effect system-wide
- All modifications logged to audit trail
- Result: Full control over user access levels and permissions

---

# Preliminary Specification Document

(To be completed)

---

# Class Diagram

(To be attached)

---

# Activity Diagram

(To be attached)
