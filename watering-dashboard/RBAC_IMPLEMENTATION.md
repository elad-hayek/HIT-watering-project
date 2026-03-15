# RBAC Implementation Guide

## Overview

A comprehensive Role-Based Access Control (RBAC) system has been implemented for the Watering Dashboard. Users are assigned one of three roles: User, Area Manager, or Administrator.

## Role Hierarchy & Capabilities

### 1. **User** (Level 1 - Lowest)

- **Default Role**: Automatically assigned to all new registrations
- **Capabilities**:
  - View only assigned areas
  - View only plants in assigned areas
  - Cannot add/edit/delete areas or plants
  - Cannot view activity logs
  - Cannot access User Management
  - Role is read-only in profile
  - Cannot change own role (only admin can)

### 2. **Area Manager** (Level 2)

- **Capabilities**:
  - Manage (view/edit) assigned areas
  - Manage (add/edit) plants in assigned areas
  - View activity logs for managed areas
  - Assign User role to basic users
  - Cannot assign Area Manager or Admin roles
  - Cannot delete areas (Admin only)
  - Cannot delete plants (Admin only)
  - Cannot access User Management (search all users)

### 3. **Admin** (Level 3 - Highest)

- **Capabilities**:
  - View all areas and plants
  - Create/edit/delete any area or plant
  - View all activity logs
  - Access User Management tab
  - Search for any user and change their role
  - Assign any role to any user (except cannot make another admin equal or greater)

## Database Schema Changes

### New Migrations Applied

Run the migration script to add:

```sql
-- Added role column to users table (ENUM: user, area_manager, admin)
-- Created user_area_mapping table for area assignments
-- Created role_definitions table for reference
```

**Commands:**

```bash
mysql -u root -p watering_db < rbac_migration.sql
```

### Key Tables Modified

1. **users** - Added `role` column (ENUM: 'user', 'area_manager', 'admin')
2. **user_area_mapping** - New table for linking users to areas they manage
3. **role_definitions** - New reference table with role definitions

## Backend Implementation

### New Files Created

- `server/rbac.js` - Role and permission utilities
- `server/rbacMiddleware.js` - Express middleware for role checking

### Modified Endpoints

#### Users API (`/api/users/*`)

- **POST /register** - Auto-assigns 'user' role (no role input)
- **POST /login** - Now returns role in user object
- **GET /users** - List all users (Admin only)
- **GET /users/search/:query** - Search users by name/ID (Admin only)
- **PUT /users/:id/role** - Update user role (respects hierarchy)
- **POST /users/:userId/areas/:areaId** - Assign area to user
- **DELETE /users/:userId/areas/:areaId** - Remove area from user
- **GET /users/:userId/areas** - Get user's assigned areas

#### Areas API (`/api/areas/*`)

- **GET /** - Filtered by role (Admin sees all, others see assigned)
- **GET /:id** - Check access before returning
- **POST /** - Requires Area Manager role
- **PUT /:id** - Requires Area Manager role + access verification
- **DELETE /:id** - Admin only
- **POST /:id/photo** - Requires Area Manager role + access to area

#### Plants API (`/api/plants/*`)

- **GET /** - Filtered by role and assigned areas
- **GET /:id** - Check access before returning
- **POST /** - Requires Area Manager role + access to area
- **PUT /:id** - Requires Area Manager role + access to plant's area
- **DELETE /:id** - Admin only

#### Activity/Audit API (`/api/audit/*`)

- **GET /logs** - Filtered by role (Users get 403, Managers see their areas, Admins see all)
- **GET /filters** - Filtered by role
- **GET /entity/:type/:id** - Check access for Area Managers

### Header Requirements

All requests to protected endpoints must include:

```javascript
headers: {
  "x-user-id": user.id,
  "x-user-role": user.role,
  "x-user": user.username,
}
```

## Frontend Implementation

### New Components

1. **UserManagement.jsx** - Admin-only component for searching and managing user roles
   - Search users by name, lastname, or ID
   - Change user roles based on hierarchy
   - Provides role dropdown with available options
   - Shows current role and allows updating

### Modified Components

1. **App.jsx**
   - Added UserManagement route (admin-only)
   - Protected Activity route (area_manager and admin only)
   - Added permission check helpers

2. **Header.jsx**
   - Now shows user's role badge
   - UserManagement link visible for admins only
   - Activity link visible for area managers and admins only

3. **user.jsx (Profile)**
   - Shows role as read-only field
   - Displays current role with badge
   - Note explaining role can only be changed by admin
   - Removed title field from form

4. **Register.jsx**
   - Removed title/role selection field
   - Added info box explaining default User role assignment
   - Updated API call to not send title

## API Request Headers Setup

When making API requests from components, always include role headers:

```javascript
const response = await fetch(url, {
  method: "GET/POST/PUT/DELETE",
  headers: {
    "Content-Type": "application/json",
    "x-user-id": user.id,
    "x-user-role": user.role,
    "x-user": user.username,
  },
  body: JSON.stringify(data), // for POST/PUT
});
```

## Access Control Rules

### Area Visibility

- **Admin**: All areas
- **Area Manager**: Only areas in user_area_mapping
- **User**: Only areas in user_area_mapping

### Plant Visibility

- **Admin**: All plants
- **Area Manager**: Only plants in their assigned areas
- **User**: Only plants in their assigned areas

### Activity Visibility

- **Admin**: All activity
- **Area Manager**: Activity for their managed areas
- **User**: NO access (unauthorized)

### Edit Permissions

- **Admin**: Can edit all areas and plants
- **Area Manager**: Can edit only assigned areas and their plants
- **User**: Cannot edit anything

### Delete Permissions

- **Admin**: Can delete all areas and plants
- **Area Manager**: Cannot delete (Admin only)
- **User**: Cannot delete

### Role Assignment

- **Admin**: Can assign any role to any user
- **Area Manager**: Can only assign User role
- **User**: Cannot assign any role

## Testing Checklist

### User Registration & Login

- [ ] Register new user → gets 'user' role automatically
- [ ] Login returns role in user object
- [ ] Role displays in header for logged-in user
- [ ] Profile shows role as read-only

### User Management (Admin)

- [ ] Admin sees User Management tab in header
- [ ] Search functionality works (by name, lastname, ID)
- [ ] Can change user roles
- [ ] Role hierarchy enforced (can't assign equal/higher roles)
- [ ] Cannot change own role

### Area Manager Features

- [ ] Sees only assigned areas
- [ ] Can add/edit areas
- [ ] Cannot delete areas
- [ ] Can view activity for assigned areas
- [ ] Cannot access User Management
- [ ] Cannot view places they don't manage

### Regular User Features

- [ ] Sees only assigned areas
- [ ] Cannot add/edit areas
- [ ] Cannot view activity
- [ ] Activity tab hidden
- [ ] User Management NOT accessible

### Admin Features

- [ ] Sees all areas
- [ ] Can create/edit/delete areas
- [ ] Can create/edit/delete plants
- [ ] Can view all activity
- [ ] User Management tab visible and functional
- [ ] Can change any user's role

### Audit/Activity Logging

- [ ] Role changes logged
- [ ] Area assignments logged
- [ ] Activity visible to appropriate roles
- [ ] Regular users see "Access Denied"

## Migration Steps

1. **Backup Database**

   ```bash
   mysqldump -u root -p watering_db > watering_db_backup.sql
   ```

2. **Run Migration**

   ```bash
   mysql -u root -p watering_db < rbac_migration.sql
   ```

3. **Restart Server**

   ```bash
   npm start
   ```

4. **Update Frontend** (Already done - components are updated)

5. **Test All Features** (See Testing Checklist above)

## Troubleshooting

### Issue: "Access denied" on all API calls

**Solution**: Verify headers are being sent with all requests. Check that `x-user-id`, `x-user-role`, and `x-user` headers are included.

### Issue: Roles not updating

**Solution**:

1. Clear browser localStorage: `localStorage.clear()`
2. Re-login to get fresh user data with new role
3. Check database: `SELECT id, username, role FROM users;`

### Issue: User Management tab not visible

**Solution**: Verify user has 'admin' role in database:

```sql
SELECT * FROM users WHERE username = '340969674'; -- should be admin
```

### Issue: Area visibility not filtering

**Solution**: Check user_area_mapping table:

```sql
SELECT uam.*, u.username, a.name FROM user_area_mapping uam
JOIN users u ON uam.user_id = u.id
JOIN areas a ON uam.area_id = a.id;
```

## Future Enhancements

1. Add area manager assignment UI for admins
2. Add team/department management
3. Add permission granularity (can_edit, can_view_only, etc.)
4. Add role-based API token generation
5. Add audit trail for role changes with detailed timestamps
6. Add bulk role assignment functionality
7. Add role expiration/temporary assignments
