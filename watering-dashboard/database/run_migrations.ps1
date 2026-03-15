# ============================================================================
# Database Migration Runner Script (PowerShell)
# Usage: .\run_migrations.ps1 -DatabaseName "watering_db" -User "root" -Password "password"
# ============================================================================

param(
    [string]$DatabaseName = "watering_db",
    [string]$User = "root",
    [string]$Password = "",
    [string]$Host = "localhost"
)

# Colors for output
$Green = [System.ConsoleColor]::Green
$Blue = [System.ConsoleColor]::Cyan
$Red = [System.ConsoleColor]::Red
$Yellow = [System.ConsoleColor]::Yellow

# Paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MigrationsDir = Join-Path $ScriptDir "migrations"

# Helper functions
function Write-Header {
    param([string]$Message)
    Write-Host "========================================" -ForegroundColor $Blue
    Write-Host $Message -ForegroundColor $Blue
    Write-Host "========================================" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor $Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor $Red
}

function Write-Info {
    param([string]$Message)
    Write-Host $Message -ForegroundColor $Blue
}

# Main execution
Write-Header "Database Migration Runner"

Write-Host "Database: $DatabaseName" -ForegroundColor $Blue
Write-Host "User: $User" -ForegroundColor $Blue
Write-Host "Host: $Host" -ForegroundColor $Blue
Write-Host "Migrations Directory: $MigrationsDir" -ForegroundColor $Blue
Write-Host ""

# Check if migrations directory exists
if (-not (Test-Path $MigrationsDir)) {
    Write-Error "Migrations directory not found: $MigrationsDir"
    exit 1
}

# Get list of migration files
$Migrations = Get-ChildItem -Path $MigrationsDir -Filter "*.sql" | Sort-Object Name

if ($Migrations.Count -eq 0) {
    Write-Error "No migration files found in $MigrationsDir"
    exit 1
}

Write-Info "Found $($Migrations.Count) migration(s) to run"
Write-Host ""

# Prompt for password if not provided
if ([string]::IsNullOrEmpty($Password)) {
    $SecurePassword = Read-Host "Enter MySQL password for user '$User'" -AsSecureString
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($SecurePassword))
}

# Prepare MySQL connection
$ConnectionString = "--host=$Host --user=$User --password=$Password --database=$DatabaseName"

# Run migrations
$SuccessCount = 0
$FailureCount = 0

for ($i = 0; $i -lt $Migrations.Count; $i++) {
    $Migration = $Migrations[$i]
    $MigrationNumber = $i + 1
    $TotalCount = $Migrations.Count
    
    Write-Info "[$MigrationNumber/$TotalCount] Running: $($Migration.Name)"
    
    try {
        # Run the migration
        $Output = mysql $ConnectionString.Split() -le $Migration.FullName 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Completed: $($Migration.Name)"
            $SuccessCount++
        } else {
            Write-Error "Failed: $($Migration.Name)"
            Write-Host $Output -ForegroundColor $Red
            $FailureCount++
        }
    } catch {
        Write-Error "Exception running $($Migration.Name): $_"
        $FailureCount++
    }
    
    Write-Host ""
}

# Summary
Write-Header "Migration Summary"
Write-Host "Successful: $SuccessCount" -ForegroundColor $Green
Write-Host "Failed: $FailureCount" -ForegroundColor $(if ($FailureCount -gt 0) { $Red } else { $Green })

if ($FailureCount -gt 0) {
    Write-Host ""
    Write-Error "Some migrations failed!"
    exit 1
} else {
    Write-Host ""
    Write-Success "All migrations completed successfully!"
}
