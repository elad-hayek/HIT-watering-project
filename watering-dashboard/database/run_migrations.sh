#!/bin/bash

# ============================================================================
# Database Migration Runner Script
# Usage: bash run_migrations.sh [database_name] [mysql_user] [mysql_password]
# ============================================================================

set -e  # Exit on error

# Configuration
DB_NAME="${1:-watering_db}"
DB_USER="${2:-root}"
DB_PASSWORD="${3:-}"
MIGRATIONS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/database/migrations"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Database Migration Runner${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Migrations Directory: $MIGRATIONS_DIR"
echo ""

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo -e "${RED}Error: Migrations directory not found: $MIGRATIONS_DIR${NC}"
  exit 1
fi

# Get list of migrations
MIGRATIONS=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort)

if [ -z "$MIGRATIONS" ]; then
  echo -e "${RED}Error: No migration files found in $MIGRATIONS_DIR${NC}"
  exit 1
fi

# Count migrations
TOTAL=$(echo "$MIGRATIONS" | wc -l)
echo -e "${BLUE}Found $TOTAL migration(s) to run${NC}"
echo ""

# Build MySQL connection string
if [ -z "$DB_PASSWORD" ]; then
  MYSQL_CMD="mysql -u $DB_USER -p $DB_NAME"
  echo -e "${BLUE}You will be prompted for MySQL password${NC}"
  echo ""
else
  MYSQL_CMD="mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME"
fi

# Run migrations
COUNT=0
while IFS= read -r migration; do
  COUNT=$((COUNT + 1))
  FILENAME=$(basename "$migration")
  
  echo -e "${BLUE}[$COUNT/$TOTAL] Running: $FILENAME${NC}"
  
  if eval "$MYSQL_CMD < \"$migration\""; then
    echo -e "${GREEN}✓ Completed: $FILENAME${NC}"
  else
    echo -e "${RED}✗ Failed: $FILENAME${NC}"
    exit 1
  fi
  echo ""
done <<< "$MIGRATIONS"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All migrations completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
