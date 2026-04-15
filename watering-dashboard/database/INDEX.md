# Database Directory Structure

```
database/
├── migrations/                    # All database migration files (MAIN LOCATION)
│   ├── README.md                 # Detailed migration guide
│   ├── 001_initial_schema.sql    # Initial database setup
│   ├── 002_rbac_and_permissions.sql  # RBAC and permissions system
│   └── [future migrations...]
├── run_migrations.sh             # Bash script to run all migrations
├── run_migrations.ps1            # PowerShell script to run all migrations
└── INDEX.md                      # This file
```

## Overview

The database has been reorganized into a proper migration system. Each migration is numbered and can be run in order.

### Migration Files

| File                           | Status         | Description                                                           |
| ------------------------------ | -------------- | --------------------------------------------------------------------- |
| `001_initial_schema.sql`       | ✅ Already Run | Creates database and initial tables (users, areas, plants, audit_log) |
| `002_rbac_and_permissions.sql` | ✅ Already Run | Adds RBAC system and area-level permissions                           |

### Scripts

| File                 | OS        | Purpose                                 |
| -------------------- | --------- | --------------------------------------- |
| `run_migrations.sh`  | Linux/Mac | Automated migration runner (bash)       |
| `run_migrations.ps1` | Windows   | Automated migration runner (PowerShell) |

## Quick Commands

### Run All Migrations (Windows PowerShell)

```powershell
cd database
.\run_migrations.ps1 -DatabaseName "watering_db" -User "root" -Password "your_password"
```

### Run All Migrations (Linux/Mac Bash)

```bash
cd database
bash run_migrations.sh watering_db root your_password
```

### Run Specific Migration (Windows)

```bash
mysql -u root -pYOUR_PASSWORD watering_db < migrations\001_initial_schema.sql
```

### Run Specific Migration (Linux/Mac)

```bash
mysql -u root -p watering_db < migrations/001_initial_schema.sql
```

## Migration Progression

```
[000] (Not Used)
  ↓
[001_initial_schema.sql] - Creates db structure
  ↓
[002_rbac_and_permissions.sql] - Adds RBAC features
  ↓
[003_*.sql] - (Future migrations go here)
  ↓
[004_*.sql] - (etc...)
```

## How to Add a New Migration

1. Create a new file: `003_description_of_change.sql`
2. Add header with description and prerequisites
3. Use `USE watering_db;` at the top
4. Write SQL changes
5. Add comments explaining what changed
6. Test locally before committing

### Template for New Migration

```sql
-- ============================================================================
-- Migration 003: Your Migration Title
-- Description: What this migration does
-- Date Created: YYYY-MM-DD
-- Prerequisites: Migration 002 must be run first
-- ============================================================================

USE watering_db;

-- Your SQL here

-- ============================================================================
-- Migration complete
-- ============================================================================
```

## Safety Guidelines

✅ **Do This:**

- Create new migration files (never modify existing ones)
- Use `IF NOT EXISTS` / `IF EXISTS` for safety
- Include descriptive comments
- Test on development database first
- Keep migrations in sequential order

❌ **Don't Do This:**

- Modify existing migration files
- Use `DROP DATABASE`
- Run migrations out of order
- Skip numbered migrations

## Running Migrations for the First Time vs Later

### First Time Setup

```bash
mysql -u root -p < migrations/001_initial_schema.sql
mysql -u root -p < migrations/002_rbac_and_permissions.sql
```

### Adding New Migrations Later

```bash
# Only run the new migration(s)
mysql -u root -p watering_db < migrations/003_my_new_migration.sql
```

## Troubleshooting

### See also: `migrations/README.md` for detailed troubleshooting

### Quick Fixes

```bash
# Check MySQL connection
mysql -u root -p -e "SELECT 1"

# List all tables
mysql -u root -p -e "SHOW TABLES;" watering_db

# Check migration status
mysql -u root -p -e "DESCRIBE users;" watering_db
```

## Historical Files

The following files are kept for historical reference:

- `watering_db.sql` → Now: `migrations/001_initial_schema.sql`
- `rbac_migration.sql` → Now: `migrations/002_rbac_and_permissions.sql`

These old files are marked as archived and should not be used for new setups.

## Links

- [Full Migration Guide](migrations/README.md)
- [Database Setup Guide](../DATABASE_SETUP.md)
- [RBAC System Documentation](../AREA_PERMISSIONS.md)
