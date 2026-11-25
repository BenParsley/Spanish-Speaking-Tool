# Panamanian Spanish · A1 Speaking Tool

A local-first, speech-only web app for practicing Panamanian Spanish (`es-PA`) across 8 CEFR A1 units, powered by a local hybrid pronunciation scorer and spaced-repetition tracking.

## Features
- **8 CEFR A1 Units**: Covers greetings, identity, numbers & time, family, daily verbs, food & shopping, city & transit, and weather/health/plans with dynamic sentence variations.
- **Local Hybrid Pronunciation Scoring**: Evaluates spoken Spanish locally via FastAPI (`127.0.0.1:8765`) with phoneme-level feedback and optional in-session Browser Speech-to-Text fallback.
- **Base + Optional Variant Prompts**: Only the base phrase is required to pass; optional variants are highlighted in pastel yellow, award a full-answer bonus when spoken accurately, and track both correct and incorrect variant attempts separately in Extensions stats.
- **Speech-First Play & Hands-Free Autopilot**: Features Push-to-Talk (`Space`), slow/word-by-word review playback, a top-right **Hands-Free** steering-wheel autopilot toggle (`Alt+H`), smart skip cooldowns (2nd skip bans a base question for 10 questions; 3rd+ skip bans for an additional 15 questions), and automatic skip deduplication.
- **Learn Progression Map & Revision Drill**: Two-column progression map (`A1.1`–`A1.8`) with a connected unit rail, horizontal stage stepper, inline Topic Rules, per-unit Cog controls (`Play`, `Intros`, `Skip`, `Undo Skip`), audio replay on every vocabulary row, and a dedicated **Revision (`< 75%`)** view with one-click **Play Revision** drilling.
- **Calendar and Stats**: Unified **Calendar** (with Daily Goal & Time Spent progress bars, Month/Week views, and slide-out day details), **Trends** (`Time Spent`, `New Words`, `Pronunciation`), **Mastery Table** (with Base skip tracking and a **Banned** filter for problem words), and **Achievements**.
- **Developer Tools & Backups**: Collapsible Settings sections with **Debug Mode** (no tracking/saving), toggleable **Speech Console**, and **Export / Import JSON** progress backups.

## Requirements
- Windows with **Google Chrome** (recommended for full microphone and speech support)
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
