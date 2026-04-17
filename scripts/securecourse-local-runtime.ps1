[CmdletBinding()]
param(
  [switch]$ResetCluster,
  [switch]$SkipSeed,
  [switch]$SkipBackend
)

$ErrorActionPreference = "Stop"

$workspace = "C:\Users\User\Documents\Playground"
$backendDir = Join-Path $workspace "backend"
$pgData = Join-Path $workspace "data\securecourse-pg"
$postgresExe = "C:\Program Files\PostgreSQL\18\bin\postgres.exe"
$initdbExe = "C:\Program Files\PostgreSQL\18\bin\initdb.exe"
$psqlExe = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$pgReadyExe = "C:\Program Files\PostgreSQL\18\bin\pg_isready.exe"
$pgPort = 5433
$dbName = "securecourse"
$dbUser = "securecourse"
$dbUrl = "postgresql://${dbUser}@localhost:${pgPort}/${dbName}?schema=public"
$backendUrl = "http://127.0.0.1:4000/api/health"

function Wait-PostgresReady {
  param(
    [int]$Attempts = 40
  )

  for ($i = 0; $i -lt $Attempts; $i++) {
    & $pgReadyExe -h 127.0.0.1 -p $pgPort -U $dbUser *> $null
    if ($LASTEXITCODE -eq 0) {
      return
    }

    Start-Sleep -Seconds 1
  }

  throw "Postgres on port $pgPort did not become ready."
}

function Wait-BackendReady {
  param(
    [int]$Attempts = 40
  )

  for ($i = 0; $i -lt $Attempts; $i++) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $backendUrl -TimeoutSec 3
      if ($response.StatusCode -eq 200) {
        return $response.Content
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  throw "Backend health endpoint did not become ready at $backendUrl"
}

if (-not (Test-Path $postgresExe)) {
  throw "PostgreSQL binaries were not found. Install PostgreSQL or use docker-compose on a machine with Docker."
}

if ($ResetCluster -and (Test-Path $pgData)) {
  if ($pgData -notlike "$workspace\data\securecourse-pg") {
    throw "Refusing to remove unexpected path: $pgData"
  }

  Remove-Item -LiteralPath $pgData -Recurse -Force
}

if (-not (Test-Path (Join-Path $pgData "PG_VERSION"))) {
  New-Item -ItemType Directory -Path $pgData -Force | Out-Null
  & $initdbExe -D $pgData -U $dbUser -A trust | Out-Host
}

$pidFile = Join-Path $pgData "postmaster.pid"
if (Test-Path $pidFile) {
  & $pgReadyExe -h 127.0.0.1 -p $pgPort -U $dbUser *> $null
  if ($LASTEXITCODE -ne 0) {
    Remove-Item -LiteralPath $pidFile -Force
  }
}

& $pgReadyExe -h 127.0.0.1 -p $pgPort -U $dbUser *> $null
if ($LASTEXITCODE -ne 0) {
  $postgresCmd = "& '$postgresExe' -D '$pgData' -p $pgPort -h 127.0.0.1"
  $pgHost = Start-Process `
    -FilePath "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $postgresCmd) `
    -WindowStyle Hidden `
    -PassThru

  Wait-PostgresReady
} else {
  $pgHost = $null
}

$dbExists = & $psqlExe -h localhost -p $pgPort -U $dbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$dbName';"
if ([string]::IsNullOrWhiteSpace($dbExists) -or $dbExists.Trim() -ne "1") {
  & $psqlExe -h localhost -p $pgPort -U $dbUser -d postgres -c "CREATE DATABASE $dbName;" | Out-Host
}

$env:DATABASE_URL = $dbUrl
$env:REDIS_URL = "mock://local"
$env:ALLOW_INSECURE_DEV_VIDEO_FALLBACK = "true"
$env:PUBLIC_WEB_URL = "http://localhost:3000"
$env:APP_URL = "http://localhost:4000"
$env:PORT = "4000"

Push-Location $backendDir
try {
  & npm.cmd run prisma:deploy | Out-Host
  & npm.cmd run prisma:generate | Out-Host
  & npm.cmd run build | Out-Host

  if (-not $SkipSeed) {
    & npm.cmd run prisma:seed | Out-Host
  }
} finally {
  Pop-Location
}

if (-not $SkipBackend) {
  $backendCmd = @(
    "`$env:DATABASE_URL='$dbUrl'",
    "`$env:REDIS_URL='mock://local'",
    "`$env:ALLOW_INSECURE_DEV_VIDEO_FALLBACK='true'",
    "`$env:PUBLIC_WEB_URL='http://localhost:3000'",
    "`$env:APP_URL='http://localhost:4000'",
    "`$env:PORT='4000'",
    "Set-Location '$backendDir'",
    "npm.cmd run start:prod"
  ) -join "; "

  $backendHost = Start-Process `
    -FilePath "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $backendCmd) `
    -WindowStyle Hidden `
    -PassThru

  $health = Wait-BackendReady
} else {
  $backendHost = $null
  $health = $null
}

[pscustomobject]@{
  postgresPort = $pgPort
  databaseUrl = $dbUrl
  redisUrl = "mock://local"
  postgresHostPid = if ($pgHost) { $pgHost.Id } else { $null }
  backendHostPid = if ($backendHost) { $backendHost.Id } else { $null }
  backendHealth = $health
} | ConvertTo-Json -Depth 4
