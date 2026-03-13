# Story 7.3: Isolation Verification Script
# Validates that multi-instance resources are properly isolated.
# Requires Docker to be running. Does NOT start/stop instances.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/verify-isolation.ps1
#
# Prerequisites:
#   - At least two instances must be running (e.g., stu + hms)
#   - Run: npm run compose:up:stu; npm run compose:up:hms

param(
    [Parameter(Mandatory = $false)]
    [string]$EnvDir = 'deploy/compose'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-EnvFile {
    param([string]$Path)
    $result = @{}
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq '' -or $line.StartsWith('#')) { return }
        $parts = $line.Split('=', 2)
        if ($parts.Count -eq 2) { $result[$parts[0]] = $parts[1] }
    }
    return $result
}

function Run-DockerCommand {
    param([string[]]$Args)
    return & docker @Args 2>$null
}

Write-Host "=== Story 7.3: Multi-Instance Isolation Verification ==="
Write-Host ""

# --- Phase 1: Profile contract validation ---
Write-Host "--- Phase 1: Profile Contract Validation ---"
$envFiles = Get-ChildItem -Path $EnvDir -Filter '*.env' | Where-Object { $_.Name -notmatch '\.example$' }
$instances = @()
$errors = @()

if ($envFiles.Count -lt 2) {
    throw "Need at least 2 instance env files in '$EnvDir' for isolation verification"
}

foreach ($file in $envFiles) {
    $env = Read-EnvFile -Path $file.FullName

    foreach ($field in @('INSTANCE_KEY', 'COMPOSE_PROJECT_NAME', 'POSTGRES_DB', 'POSTGRES_USER', 'FRONTEND_HOST_PORT', 'BACKEND_HOST_PORT', 'POSTGRES_HOST_PORT', 'JWT_SECRET')) {
        if (-not $env[$field]) {
            $errors += "MISSING: $field in $($file.Name)"
        }
    }

    $instances += @{
        File = $file.Name
        FullPath = $file.FullName
        Key = $env['INSTANCE_KEY']
        Project = $env['COMPOSE_PROJECT_NAME']
        DB = $env['POSTGRES_DB']
        DBUser = $env['POSTGRES_USER']
        FrontendPort = $env['FRONTEND_HOST_PORT']
        BackendPort = $env['BACKEND_HOST_PORT']
        PostgresPort = $env['POSTGRES_HOST_PORT']
    }
}

# Check uniqueness
$projectNames = $instances | ForEach-Object { $_.Project }
$dbNames = $instances | ForEach-Object { $_.DB }
$allPorts = @()
foreach ($i in $instances) {
    $allPorts += "$($i.FrontendPort)"
    $allPorts += "$($i.BackendPort)"
    $allPorts += "$($i.PostgresPort)"
}

if (($projectNames | Select-Object -Unique).Count -ne $projectNames.Count) {
    $errors += "COMPOSE_PROJECT_NAME collision detected"
}
if (($dbNames | Select-Object -Unique).Count -ne $dbNames.Count) {
    $errors += "POSTGRES_DB collision detected"
}
if (($allPorts | Select-Object -Unique).Count -ne $allPorts.Count) {
    $errors += "Host port collision detected"
}

if ($errors.Count -gt 0) {
    foreach ($err in $errors) { Write-Host "  FAIL: $err" -ForegroundColor Red }
    throw "Profile contract validation failed"
} else {
    Write-Host "  PASS: $($instances.Count) profiles with unique project names, DB names, and ports" -ForegroundColor Green
}

Write-Host ""

# --- Phase 2: Docker resource isolation verification ---
Write-Host "--- Phase 2: Docker Resource Isolation ---"

$runningInstances = 0

foreach ($inst in $instances) {
    $projectName = $inst.Project
    $networkName = "$projectName-net"
    $volumeName = "$projectName-postgres-data"
    $instanceKey = $inst.Key

    Write-Host ""
    Write-Host "Instance: $instanceKey ($projectName)"

    # Check network
    $netExists = Run-DockerCommand -Args @('network', 'ls', '--filter', "name=^${networkName}$", '--format', '{{.Name}}')
    if ($netExists) {
        Write-Host "  Network: $networkName [EXISTS]" -ForegroundColor Green

        # Verify only this instance's containers are on this network
        $attachedContainers = Run-DockerCommand -Args @('network', 'inspect', $networkName, '--format', '{{range .Containers}}{{.Name}} {{end}}')
        $attachedList = ($attachedContainers -split '\s+') | Where-Object { $_ -ne '' }
        $foreignContainers = $attachedList | Where-Object { $_ -notmatch "^$([regex]::Escape($projectName))-" }

        if ($foreignContainers) {
            Write-Host "  FAIL: Foreign containers on network: $($foreignContainers -join ', ')" -ForegroundColor Red
            $errors += "Foreign container on $networkName"
        } else {
            Write-Host "  Attached containers: $($attachedList -join ', ')" -ForegroundColor Green
        }
    } else {
        Write-Host "  Network: $networkName [NOT RUNNING]" -ForegroundColor Red
        $errors += "Missing runtime network: $networkName"
    }

    # Check volume
    $volExists = Run-DockerCommand -Args @('volume', 'ls', '--filter', "name=^${volumeName}$", '--format', '{{.Name}}')
    if ($volExists) {
        Write-Host "  Volume: $volumeName [EXISTS]" -ForegroundColor Green
    } else {
        Write-Host "  Volume: $volumeName [NOT FOUND]" -ForegroundColor Red
        $errors += "Missing runtime volume: $volumeName"
    }

    # Check containers
    $containerCount = (Run-DockerCommand -Args @('ps', '--filter', "label=com.aapr.instance=$instanceKey", '--format', '{{.Names}}') | Measure-Object -Line).Lines
    Write-Host "  Containers with label com.aapr.instance=${instanceKey}: ${containerCount}"
    if ($containerCount -gt 0) {
        $runningInstances += 1
    } else {
        $errors += "No running containers found for instance '$instanceKey'"
    }
}

if ($runningInstances -lt 2) {
    $errors += "Need at least 2 running instances for runtime isolation checks (found $runningInstances)"
}

Write-Host ""

# --- Phase 3: Cross-instance network isolation ---
Write-Host "--- Phase 3: Cross-Instance Network Isolation ---"
$allNetworks = @()
foreach ($inst in $instances) {
    $netName = "$($inst.Project)-net"
    $netId = Run-DockerCommand -Args @('network', 'ls', '--filter', "name=^${netName}$", '--format', '{{.ID}}')
    if ($netId) {
        $allNetworks += @{ Name = $netName; Id = $netId; Instance = $inst.Key }
    }
}

if ($allNetworks.Count -ge 2) {
    $uniqueIds = $allNetworks | ForEach-Object { $_.Id } | Select-Object -Unique
    if ($uniqueIds.Count -eq $allNetworks.Count) {
        Write-Host "  PASS: All $($allNetworks.Count) instance networks are distinct Docker networks" -ForegroundColor Green
    } else {
        Write-Host "  FAIL: Some instances share the same Docker network ID" -ForegroundColor Red
        $errors += "Shared network ID detected"
    }
} else {
    Write-Host "  FAIL: Need at least 2 running instance networks to verify cross-instance isolation" -ForegroundColor Red
    $errors += "Insufficient runtime networks for cross-instance isolation check"
}

Write-Host ""

# --- Phase 4: Cross-instance volume isolation ---
Write-Host "--- Phase 4: Cross-Instance Volume Isolation ---"
$allVolumes = @()
foreach ($inst in $instances) {
    $volName = "$($inst.Project)-postgres-data"
    $volExists = Run-DockerCommand -Args @('volume', 'ls', '--filter', "name=^${volName}$", '--format', '{{.Name}}')
    if ($volExists) {
        $allVolumes += @{ Name = $volName; Instance = $inst.Key }
    }
}

if ($allVolumes.Count -ge 2) {
    $uniqueVols = $allVolumes | ForEach-Object { $_.Name } | Select-Object -Unique
    if ($uniqueVols.Count -eq $allVolumes.Count) {
        Write-Host "  PASS: All $($allVolumes.Count) instance volumes are distinct" -ForegroundColor Green
    } else {
        Write-Host "  FAIL: Volume name collision detected" -ForegroundColor Red
        $errors += "Volume name collision"
    }
} else {
    Write-Host "  FAIL: Need at least 2 running instance volumes to verify volume isolation" -ForegroundColor Red
    $errors += "Insufficient runtime volumes for cross-instance isolation check"
}

Write-Host ""

# --- Phase 5: Backup/restore executable checks ---
Write-Host "--- Phase 5: Backup/Restore Executable Checks ---"
foreach ($inst in $instances) {
    $dbContainer = "$($inst.Project)-db"
    $dbName = $inst.DB
    $dbUser = $inst.DBUser

    $dbRunning = Run-DockerCommand -Args @('ps', '--filter', "name=^${dbContainer}$", '--format', '{{.Names}}')
    if (-not $dbRunning) {
        Write-Host "  FAIL: DB container not running for $($inst.Key): $dbContainer" -ForegroundColor Red
        $errors += "DB container not running for backup/restore check: $dbContainer"
        continue
    }

    $toolsCheck = Run-DockerCommand -Args @('exec', $dbContainer, 'sh', '-lc', 'command -v pg_dump >/dev/null 2>&1 && command -v psql >/dev/null 2>&1 && echo OK')
    if (-not ($toolsCheck -match 'OK')) {
        Write-Host "  FAIL: pg_dump/psql not available in $dbContainer" -ForegroundColor Red
        $errors += "Backup/restore tools missing in $dbContainer"
        continue
    }

    $currentDb = Run-DockerCommand -Args @('exec', $dbContainer, 'psql', '-U', $dbUser, '-d', $dbName, '-tAc', 'SELECT current_database();')
    $currentDb = ($currentDb | Out-String).Trim()
    if ($currentDb -ne $dbName) {
        Write-Host "  FAIL: DB scope mismatch for $dbContainer (expected=$dbName, actual=$currentDb)" -ForegroundColor Red
        $errors += "Backup/restore scope mismatch for $dbContainer"
    } else {
        Write-Host "  PASS: $dbContainer tools available and scoped to DB '$dbName'" -ForegroundColor Green
    }
}

Write-Host ""

# --- Phase 6: Targeted teardown scope checks (non-destructive) ---
Write-Host "--- Phase 6: Targeted Teardown Scope Checks ---"
foreach ($inst in $instances) {
    $composeIds = & docker compose --env-file $inst.FullPath -f docker-compose.yml ps -q 2>$null
    if (-not $composeIds) {
        Write-Host "  FAIL: No compose-managed containers found for $($inst.Key)" -ForegroundColor Red
        $errors += "No compose-managed containers found for teardown scope check: $($inst.Key)"
        continue
    }

    $projectMismatches = @()
    foreach ($cid in ($composeIds -split '\s+' | Where-Object { $_ -ne '' })) {
        $projectLabel = Run-DockerCommand -Args @('inspect', $cid, '--format', '{{ index .Config.Labels "com.docker.compose.project" }}')
        $projectLabel = ($projectLabel | Out-String).Trim()
        if ($projectLabel -ne $inst.Project) {
            $projectMismatches += $cid
        }
    }

    if ($projectMismatches.Count -gt 0) {
        Write-Host "  FAIL: Teardown scope mismatch for $($inst.Key) (foreign container IDs: $($projectMismatches -join ', '))" -ForegroundColor Red
        $errors += "Teardown scope mismatch for $($inst.Key)"
    } else {
        Write-Host "  PASS: Teardown scope for $($inst.Key) is compose-project isolated" -ForegroundColor Green
    }
}

Write-Host ""

# --- Summary ---
Write-Host "=== Verification Summary ==="
if ($errors.Count -gt 0) {
    Write-Host "RESULT: FAILED ($($errors.Count) error(s))" -ForegroundColor Red
    foreach ($err in $errors) { Write-Host "  - $err" -ForegroundColor Red }
    exit 1
} else {
    Write-Host "RESULT: PASSED" -ForegroundColor Green
    Write-Host "  Instances verified: $($instances.Count)"
    Write-Host "  All naming patterns, networks, volumes, and containers are properly isolated."
    exit 0
}
