param (
    [Parameter(Mandatory=$true, HelpMessage="Enter your Hugging Face API Token (must have Read permissions)")]
    [string]$HF_TOKEN
)

$ErrorActionPreference = "Stop"
$PersonaPlexDir = "C:\dev\personaplex"

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host " DungeonMaister - PersonaPlex Server Installer " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Check if Python is installed
if (-not (Get-Command "python" -ErrorAction SilentlyContinue)) {
    Write-Error "Python is not installed or not in your PATH. Please install Python 3.10+."
    exit 1
}

# 1. Clone the repository
if (-not (Test-Path $PersonaPlexDir)) {
    Write-Host "`n[1/4] Cloning NVIDIA PersonaPlex repository..." -ForegroundColor Yellow
    git clone https://github.com/NVIDIA/personaplex.git $PersonaPlexDir
} else {
    Write-Host "`n[1/4] Repository already exists at $PersonaPlexDir" -ForegroundColor Green
}

Set-Location $PersonaPlexDir

# 2. Create Virtual Environment
Write-Host "`n[2/4] Setting up Python virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path "$PersonaPlexDir\venv")) {
    python -m venv venv
}
$env:VIRTUAL_ENV = "$PersonaPlexDir\venv"
$env:Path = "$PersonaPlexDir\venv\Scripts;" + $env:Path

# 3. Install Moshi / PersonaPlex Requirements
Write-Host "`n[3/4] Installing dependencies from source (this might take a few minutes)..." -ForegroundColor Yellow
python -m pip install --upgrade pip
pip install moshi/

# 4. Set HF Token and Prepare Launch Script
Write-Host "`n[4/4] Configuring Hugging Face environment variable..." -ForegroundColor Yellow
[System.Environment]::SetEnvironmentVariable('HF_TOKEN', $HF_TOKEN, 'User')

Write-Host "`n===============================================" -ForegroundColor Green
Write-Host " Installation Complete! " -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "To launch the PersonaPlex server, run the following command in a new terminal:"
Write-Host "  cd C:\dev\personaplex"
Write-Host "  .\venv\Scripts\Activate.ps1"
Write-Host "  python -m moshi.server --host 127.0.0.1 --port 8998" -ForegroundColor Cyan
Write-Host "Note: The first time you run this, it will download ~20GB of model weights." -ForegroundColor Red
