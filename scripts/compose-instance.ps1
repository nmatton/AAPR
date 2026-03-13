param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('up', 'down', 'clean', 'ps', 'logs', 'config', 'health', 'validate-isolation', 'inspect')]
    [string]$Action,

    [Parameter(Mandatory = $false)]
    [string]$EnvFile = 'deploy/compose/stu.env'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-EnvFile {
    param([string]$Path)

    $result = @{}
    $fullPath = Resolve-Path $Path
    Get-Content $fullPath | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq '' -or $line.StartsWith('#')) {
            return
        }

        $parts = $line.Split('=', 2)
        if ($parts.Count -eq 2) {
            $result[$parts[0]] = $parts[1]
        }
    }

    return $result
}

if (-not (Test-Path $EnvFile)) {
    throw "Env file not found: $EnvFile"
}

# Validate port values in env file
$envMap = Read-EnvFile -Path $EnvFile
foreach ($portVar in @('FRONTEND_HOST_PORT', 'BACKEND_HOST_PORT', 'POSTGRES_HOST_PORT')) {
    $val = $envMap[$portVar]
    if ($val -and ($val -notmatch '^\d+$' -or [int]$val -lt 1 -or [int]$val -gt 65535)) {
        throw "$portVar must be an integer between 1 and 65535, got: $val"
    }
}

$composeArgs = @('--env-file', $EnvFile, '-f', 'docker-compose.yml')

switch ($Action) {
    'up' { docker compose @composeArgs up -d }
    'down' { docker compose @composeArgs down --remove-orphans }
    'clean' { docker compose @composeArgs down --remove-orphans --volumes }
    'ps' { docker compose @composeArgs ps }
    'logs' { docker compose @composeArgs logs --tail=200 }
    'config' { docker compose @composeArgs config }
    'health' {
        $envMap = Read-EnvFile -Path $EnvFile
        $frontendPort = $envMap['FRONTEND_HOST_PORT']
        $backendPort = $envMap['BACKEND_HOST_PORT']

        if (-not $frontendPort -or -not $backendPort) {
            throw 'FRONTEND_HOST_PORT and BACKEND_HOST_PORT must be defined in env file'
        }

        Write-Host "Checking backend health on http://localhost:$backendPort/api/v1/health"
        $backend = Invoke-WebRequest -Uri "http://localhost:$backendPort/api/v1/health" -UseBasicParsing
        Write-Host "Backend status code: $($backend.StatusCode)"

        Write-Host "Checking frontend health on http://localhost:$frontendPort/"
        $frontend = Invoke-WebRequest -Uri "http://localhost:$frontendPort/" -UseBasicParsing
        Write-Host "Frontend status code: $($frontend.StatusCode)"

        docker compose @composeArgs ps
    }
    'inspect' {
        $envMap = Read-EnvFile -Path $EnvFile
        $projectName = $envMap['COMPOSE_PROJECT_NAME']
        $instanceKey = $envMap['INSTANCE_KEY']

        if (-not $projectName) {
            throw 'COMPOSE_PROJECT_NAME must be defined in env file'
        }

        Write-Host "=== Instance Resource Inspection: $instanceKey ($projectName) ==="
        Write-Host ""

        Write-Host "--- Containers ---"
        docker ps --filter "label=com.aapr.instance=$instanceKey" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        Write-Host ""

        Write-Host "--- Network ---"
        $networkName = "$projectName-net"
        $networkExists = docker network ls --filter "name=^${networkName}$" --format "{{.Name}}" 2>$null
        if ($networkExists) {
            Write-Host "Network: $networkName (exists)"
            docker network inspect $networkName --format "{{range .Containers}}  - {{.Name}}{{println}}{{end}}" 2>$null
        } else {
            Write-Host "Network: $networkName (not found)"
        }
        Write-Host ""

        Write-Host "--- Volume ---"
        $volumeName = "$projectName-postgres-data"
        $volumeExists = docker volume ls --filter "name=^${volumeName}$" --format "{{.Name}}" 2>$null
        if ($volumeExists) {
            Write-Host "Volume: $volumeName (exists)"
        } else {
            Write-Host "Volume: $volumeName (not found)"
        }
        Write-Host ""

        Write-Host "--- Database ---"
        $dbName = $envMap['POSTGRES_DB']
        Write-Host "Database name: $dbName"
        Write-Host "Container: $projectName-db"
    }
    'validate-isolation' {
        Write-Host "=== Isolation Validation Across All Instance Profiles ==="
        Write-Host ""

        $envDir = 'deploy/compose'
        $envFiles = Get-ChildItem -Path $envDir -Filter '*.env' | Where-Object { $_.Name -ne '.env.instance.example' }

        if ($envFiles.Count -lt 2) {
            Write-Host "WARNING: Found $($envFiles.Count) env profile(s). Need at least 2 for isolation validation."
            if ($envFiles.Count -eq 0) { throw 'No instance env files found' }
        }

        $projectNames = @{}
        $dbNames = @{}
        $portOwners = @{}
        $errors = @()

        foreach ($file in $envFiles) {
            $env = Read-EnvFile -Path $file.FullName
            $instance = $env['INSTANCE_KEY']
            $project = $env['COMPOSE_PROJECT_NAME']
            $db = $env['POSTGRES_DB']
            $fp = $env['FRONTEND_HOST_PORT']
            $bp = $env['BACKEND_HOST_PORT']
            $pp = $env['POSTGRES_HOST_PORT']

            Write-Host "Profile: $($file.Name) (instance=$instance)"

            # Check required isolation fields
            foreach ($field in @('INSTANCE_KEY', 'COMPOSE_PROJECT_NAME', 'POSTGRES_DB', 'FRONTEND_HOST_PORT', 'BACKEND_HOST_PORT', 'POSTGRES_HOST_PORT', 'JWT_SECRET')) {
                if (-not $env[$field]) {
                    $errors += "  MISSING: $field in $($file.Name)"
                }
            }

            # Check COMPOSE_PROJECT_NAME uniqueness
            if ($projectNames.ContainsKey($project)) {
                $errors += "  COLLISION: COMPOSE_PROJECT_NAME='$project' shared by $($file.Name) and $($projectNames[$project])"
            } else {
                $projectNames[$project] = $file.Name
            }

            # Check POSTGRES_DB uniqueness
            if ($dbNames.ContainsKey($db)) {
                $errors += "  COLLISION: POSTGRES_DB='$db' shared by $($file.Name) and $($dbNames[$db])"
            } else {
                $dbNames[$db] = $file.Name
            }

            # Check host-port uniqueness across ALL services (global host binding)
            foreach ($portEntry in @(@{Name='FRONTEND_HOST_PORT';Val=$fp}, @{Name='BACKEND_HOST_PORT';Val=$bp}, @{Name='POSTGRES_HOST_PORT';Val=$pp})) {
                $portValue = $portEntry.Val
                $currentOwner = "$($file.Name):$($portEntry.Name)"
                if ($portOwners.ContainsKey($portValue)) {
                    $errors += "  COLLISION: host port '$portValue' used by $currentOwner and $($portOwners[$portValue])"
                } else {
                    $portOwners[$portValue] = $currentOwner
                }
            }
        }

        Write-Host ""
        if ($errors.Count -gt 0) {
            Write-Host "ISOLATION VALIDATION FAILED:" -ForegroundColor Red
            foreach ($err in $errors) {
                Write-Host $err -ForegroundColor Red
            }
            throw "Isolation validation failed with $($errors.Count) error(s)"
        } else {
            Write-Host "ISOLATION VALIDATION PASSED" -ForegroundColor Green
            Write-Host "  Instances: $($envFiles.Count)"
            Write-Host "  Project names: $($projectNames.Keys -join ', ')"
            Write-Host "  Database names: $($dbNames.Keys -join ', ')"
            Write-Host "  No port collisions detected"
        }
    }
}
