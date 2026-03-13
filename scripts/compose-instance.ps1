param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('up', 'down', 'clean', 'ps', 'logs', 'config', 'health')]
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
}
