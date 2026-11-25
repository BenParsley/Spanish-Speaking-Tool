# Panamanian Spanish · A1 Speaking Tool

A local-first, speech-only web app for practicing Panamanian Spanish (`es-PA`) across 8 CEFR A1 units, powered by a local hybrid pronunciation scorer and spaced-repetition tracking.

## Features
- **8 CEFR A1 Units**: Covers greetings, identity, numbers & time, family, daily verbs, food & shopping, city & transit, and weather/health/plans with dynamic sentence variations.
- **Local Hybrid Pronunciation Scoring**: Evaluates spoken Spanish locally via FastAPI (`127.0.0.1:8765`) with phoneme-level feedback and optional in-session Browser Speech-to-Text fallback.
- **Base + Optional Variant Prompts**: Only the base phrase is required to pass; optional variants are highlighted in pastel yellow and award a full-answer bonus + mastery tracking when included.
- **Practice, Graded & Hands-Free Modes**: Includes audio playback, slow/word-by-word listening, Push-to-Talk (`Space`), and hands-free auto-advance.
- **Guidebook & Progress Tracking**: Jump freely to any stage across all units from the Guidebook, track daily goals and active study time in the header, and review stats, calendar history, and mastery tables.
- **Debug Mode**: Toggleable at the top of Settings to use the app without recording or saving any changes.

## Requirements
- Windows with **Google Chrome** (required for full microphone and speech support)
- **Python 3.12** (for the local AI scorer and web server)

## Quick Start

### 1. First-Time Setup (Local AI Scorer)
```powershell
cd local-scorer
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 2. Run the App
From the project root:
```powershell
.\start-local-ai-model.ps1
```

This script automatically:
1. Starts the Local AI Scorer on `http://127.0.0.1:8765`
2. Starts the Speech-Only web app on `http://localhost:8001` (with live-reload)
3. Opens the app in Google Chrome

## Project Structure
- `speech-only/` — Frontend static web app (`index.html`, `styles.css`, `app.js`, `curriculum/`, `modules/`, `serve.py`)
- `local-scorer/` — Python FastAPI pronunciation scoring server (`server.py`, `run_server.py`, `requirements.txt`)
- `start-local-ai-model.ps1` — One-command launcher for both servers and Chrome
- `CHANGELOG.md` — Summary of recent changes
