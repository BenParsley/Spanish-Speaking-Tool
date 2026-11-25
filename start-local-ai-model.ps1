param(
    [switch]$AppWindow,
    [switch]$Minimized
)

$ErrorActionPreference = 'Stop'

$RootDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$SpeechDir = Join-Path $RootDir 'speech-only'
$ScorerDir = Join-Path $RootDir 'local-scorer'
$VenvPython = Join-Path $ScorerDir '.venv\Scripts\python.exe'
$ServeScript = Join-Path $SpeechDir 'serve.py'
$ShellExe = if (Get-Command pwsh -ErrorAction SilentlyContinue) { 'pwsh.exe' } else { 'powershell.exe' }
$TargetUrl = 'http://localhost:8001'

# 1. Stop any running servers on ports 8765, 8001, or 8000
Write-Host "Stopping any running apps..." -ForegroundColor Yellow
$Ports = @(
    @{ Port = 8765; Label = 'Local AI Scorer (127.0.0.1:8765)' },
    @{ Port = 8001; Label = 'Speech-Only Web App (localhost:8001)' },
    @{ Port = 8000; Label = 'Normal-Mode Web App (localhost:8000)' }
)

$StoppedAny = $false
foreach ($Item in $Ports) {
    $Conns = Get-NetTCPConnection -LocalPort $Item.Port -State Listen -ErrorAction SilentlyContinue
    $Pids = $Conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($ProcId in $Pids) {
        if ($ProcId -and $ProcId -gt 4) {
            try {
                $Proc = Get-Process -Id $ProcId -ErrorAction Stop
                $CimProc = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcId" -ErrorAction SilentlyContinue
                $ParentId = if ($CimProc) { $CimProc.ParentProcessId } else { $null }
                Stop-Process -Id $ProcId -Force -ErrorAction Stop
                Write-Host "Stopped $($Item.Label) [PID $ProcId - $($Proc.ProcessName)]" -ForegroundColor Yellow
                $StoppedAny = $true
                # Also stop Uvicorn's parent reloader process if present so it does not respawn
                if ($Item.Port -eq 8765 -and $ParentId -and $ParentId -gt 4) {
                    $ParentCim = Get-CimInstance Win32_Process -Filter "ProcessId = $ParentId" -ErrorAction SilentlyContinue
                    if ($ParentCim -and $ParentCim.CommandLine -match 'uvicorn|run_server\.py') {
                        Stop-Process -Id $ParentId -Force -ErrorAction SilentlyContinue
                        Write-Host "Stopped Local AI Scorer reloader supervisor [PID $ParentId]" -ForegroundColor Yellow
                    }
                }
            } catch {
                Write-Host "Could not stop PID $ProcId on port $($Item.Port): $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
}

if ($StoppedAny) {
    Start-Sleep -Milliseconds 800
} else {
    Write-Host "No running servers were found on ports 8765, 8001, or 8000." -ForegroundColor Cyan
}

# 2. Validate required paths
if (-not (Test-Path -LiteralPath $VenvPython)) {
    Write-Host "Local AI Scorer virtual environment not found at:" -ForegroundColor Red
    Write-Host "  $VenvPython" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run these commands first:" -ForegroundColor Cyan
    Write-Host "  cd `"$ScorerDir`""
    Write-Host "  py -3.12 -m venv .venv"
    Write-Host "  .\.venv\Scripts\python.exe -m pip install -r requirements.txt"
    exit 1
}

if (-not (Test-Path -LiteralPath $ServeScript)) {
    Write-Host "Speech-Only server script not found at:" -ForegroundColor Red
    Write-Host "  $ServeScript" -ForegroundColor Yellow
    exit 1
}

$ServerWindowStyle = if ($Minimized) { 'Minimized' } else { 'Normal' }

# 3. Start Local AI Scorer (127.0.0.1:8765) with automatic hot-reload
Write-Host "Starting Local AI Scorer (hot-reload enabled) on http://127.0.0.1:8765 ..." -ForegroundColor Green
$ScorerRunner = Join-Path $ScorerDir 'run_server.py'
$EscScorerDir = $ScorerDir -replace "'", "''"
$EscVenvPython = $VenvPython -replace "'", "''"
$EscScorerRunner = $ScorerRunner -replace "'", "''"
$EscSpeechDir = $SpeechDir -replace "'", "''"
$EscServeScript = $ServeScript -replace "'", "''"
$ScorerCommand = @"
`$Host.UI.RawUI.WindowTitle = 'Local AI Scorer (127.0.0.1:8765 · Hot Reload)'
Set-Location -LiteralPath '$EscScorerDir'
Write-Host 'Starting Local AI Scorer (hot-reload enabled) on http://127.0.0.1:8765 ...' -ForegroundColor Green
& '$EscVenvPython' '$EscScorerRunner'
"@
Start-Process -FilePath $ShellExe -WorkingDirectory $ScorerDir -WindowStyle $ServerWindowStyle -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $ScorerCommand)

# 4. Start Speech-Only Web App (localhost:8001)
Write-Host "Starting Speech-Only Web App on $TargetUrl ..." -ForegroundColor Cyan
$WebCommand = @"
`$Host.UI.RawUI.WindowTitle = 'Spanish A1 Speech-Only Web App (localhost:8001)'
Set-Location -LiteralPath '$EscSpeechDir'
Write-Host 'Starting Speech-Only Web App on $TargetUrl ...' -ForegroundColor Cyan
& '$EscVenvPython' '$EscServeScript' 8001
"@
Start-Process -FilePath $ShellExe -WorkingDirectory $SpeechDir -WindowStyle $ServerWindowStyle -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $WebCommand)
Start-Sleep -Seconds 1

# 5. Open localhost:8001 explicitly in Google Chrome (not the default browser)
$ChromeCandidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
)

$ChromeExe = $ChromeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1

if (-not $ChromeExe) {
    $RegPaths = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe'
    )
    foreach ($RegPath in $RegPaths) {
        if (Test-Path $RegPath) {
            $Val = (Get-ItemProperty -Path $RegPath -ErrorAction SilentlyContinue).'(default)'
            if ($Val -and (Test-Path -LiteralPath $Val)) {
                $ChromeExe = $Val
                break
            }
        }
    }
}

if (-not $ChromeExe) {
    $Cmd = Get-Command chrome.exe -ErrorAction SilentlyContinue
    if ($Cmd) { $ChromeExe = $Cmd.Source }
}

if (-not $ChromeExe) {
    Write-Host "Google Chrome was not found on this machine." -ForegroundColor Red
    Write-Host "Open $TargetUrl manually in Google Chrome." -ForegroundColor Yellow
    exit 1
}

if ($AppWindow) {
    Start-Process -FilePath $ChromeExe -ArgumentList @("--app=$TargetUrl")
    Write-Host "Opened $TargetUrl in Google Chrome (App Window)." -ForegroundColor Green
} else {
    Start-Process -FilePath $ChromeExe -ArgumentList @($TargetUrl)
    Write-Host "Opened $TargetUrl in Google Chrome." -ForegroundColor Green
}
