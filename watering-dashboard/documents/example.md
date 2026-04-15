# Initiation Document for Implementation  
# Shelter Management System

**Written by:**  
Shirin Fakiri  
Daniel Gunko  
Ofir Nesher  

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

- Preliminary Specification Document  
- Class Diagram  
- Activity Diagram  

---

# 0. Administration

## 0.1 Introduction – Existing Situation (Problem/Gaps)

Municipalities and emergency teams manage public shelters with fragmented tools and stale data. There is no unified, up-to-date solution for managing shelter information (location, capacity, occupancy, temperature, supplies), monitoring real-time status, and coordinating maintenance.  

The goal is a web platform that centralizes shelter data, offers an interactive map for operations, and shortens response times while reducing operational costs.

---

## 0.2 Rationale and Goals

Creating a web-based system that provides an efficient solution for managing and monitoring public shelters in different areas of the country.  

The system helps municipalities and emergency teams maintain up-to-date shelter information, status, capacity, temperature, and food availability.

---

## 0.3 Concepts & Definitions

### Shelter
A protective space with geolocation, capacity, accessibility, and status attributes.

### Area / Zone
A named administrative region.

### Notification
A message triggered by events (CRUD, status changes, failures).

### User
A person registered in the system. A registered user can create, update, and delete Areas and Shelters.

---

# 1. System Description

## 1.1 Application Character & Scope

- Local web application (on-prem/local) with no external cloud dependencies.  
- English-only UI (no multilingual / RTL support yet).  
- Interactive map showing Areas (polygons) and Shelters (markers), with create/edit/delete and basic validations.  
- Basic entity management: CRUD for Shelters and Areas persisted to the database.  
- Quality rules:
  - Shelter must be inside an Area  
  - Occupancy ≤ Capacity  
- Basic user authentication:
  - Pre-defined users / roles  
  - No admin console  
  - No notifications management UI  

---

## 1.2 Users & Roles

### Registered User
A person registered in the system. A registered user can create, update, and delete Areas and Shelters.

### Viewer
Can only see the home page of the application and register to the application.

---

# 1.3 Usage Scenarios (Use Cases)

---

## 1.3.1 Viewer Use Cases

The user sees the Shelter Management System home page with:

- Top navigation bar:
  - Home
  - Notifications
  - Register
  - Login

- Headline and description about managing shelters and areas on an interactive map.

- Two prominent actions:
  - **Get Started (Register)**
  - **I Already Have an Account**

Below are capability cards:

- Interactive Map  
- Draw Areas  
- Add & Edit Shelters  
- Simple & Secure Login  

Each includes a brief description of system capabilities.

### Signup & Login

Register with verified national ID.  
Secure login.  
Log all attempts (success/failure) to Audit.

---

### Register Screen

When clicking **Register**, the user lands on the Register screen with a form to enter:

- ID (exactly 9 digits)  
- Password  
- Last Name  
- First Name  
- Title  
- City (dropdown)

At the bottom there is a green **Register** button to submit and complete signup.

---

## 1.3.2 Registered User Use Cases

### Login Screen

The user sees the Login page with two fields:

- ID  
- Password  

And a green **Login** button.

Top navigation bar includes:

- Home  
- Notifications  
- Register  
- Login

---

### Dashboard After Login

The screen shows a Shelter Management dashboard with:

#### Status Cards

- Total Shelters  
- Open  
- Capacity  
- Occupancy  

#### Main Actions

- Search bar  
- Add Shelter  
- Add Area  

#### Main Content

- City map with area polygons and shelter markers  
- Legend: Open / Closed  

#### Side Panel

Areas & Shelters panel with area list and actions.

---

### What the User Can Do

- Search shelters by name / city  
- Add a new Area or Shelter  
- Select an Area from the list to Edit or Manage Photos  
- Pan / Zoom the map  
- Click markers / polygons for details  
- Use top bar to Log Off and navigate to Home / Notifications

---

## Add Shelter Flow

When the user clicks **Add Shelter**, they can:

- Pick shelter location on the map (click)  
- Or enter coordinates manually  
- Fill shelter details:
  - Name
  - City (optional)
  - Capacity
  - Current Occupancy
  - Temperature
- Choose an Area (required)
- Set flags:
  - Shelter is Open
  - Food Available
- Upload files/photos (optional)
- Pan / Zoom the map to refine location

---

## Add Area Flow

When the user clicks **Add Area**, they can:

- Enter Area name (optional)
- Upload photos/files (optional)
- Draw on the map:
  - Rectangle
  - Polygon
- Drag / Move / Edit vertices
- Delete shape or redraw
- Only one shape is kept
- Zoom map to refine location

---

## Notifications Screen

When the user clicks **Notifications**, they see a chronological activity log by date.

Each card may represent:

- Shelter created  
- User login  
- User registered  
- Area created  
- Photos uploaded  
- Shelter deleted  

Each event displays:

- Who performed it  
- When  
- Affected Entity  
- Extra info when relevant:
  - Area name
  - Polygon type
  - Number of photos
  - Area ID
  - Shelter ID

---

# Preliminary Specification Document

(To be completed)

---

# Class Diagram

(To be attached)

---

# Activity Diagram

(To be attached)

---