# BORAH — Private Journal, Memory, Planner & Companion

> *"Your space, your story, your moments."*

BORAH is a privacy-focused digital journaling sanctuary, voice memo studio, planner, task tracker, mood analytics dashboard, and AI companion built with **Python (Flask)**, **HTML5**, **CSS3 (Tailwind CSS)**, and **Vanilla JavaScript (ES6+)**.

## Features
- **Journal Studio:** Rich diary editor with 12 wallpaper themes, 8 typography presets, stickers, emojis, photo lightbox gallery, warm Eyes Protection filter, and client-side PDF archive export.
- **Cursor-Anchored Voice Journals:** Record audio directly inside an entry via the `MediaRecorder` API with a live 12-bar Web `AudioContext` frequency visualizer and inline `[[voice_memo:<id>]]` playback cards.
- **Bora AI Companion:** Interactive lavender bunny offering gentle affirmations, inspirational quotes, celebratory confetti, and a guided 4-4-4 breathing timer.
- **Gemini AI Reflections (Non-Clinical):** Tone detection, 4-part weekly reflection synthesis, speech transcription, and optional ambient music generation using `google-genai` with deterministic local fallbacks.
- **Daily Sanctuary Tools:** Hourly planner, priority task checklists with Web Audio chimes, sticky notes pinboard, memory albums, and 7-day guided challenges.
- **Built-In Academic Artifacts:** Includes the 13-page monochrome IEEE research paper (`.pdf`, `.docx`, `.tex`) and 9-slide widescreen presentation deck (`/BORAH_Project_Presentation.pdf`).

## Tech Stack
- **Backend:** Python 3.11+, Flask, PyJWT, bcrypt, `python-dotenv`, `google-genai`, ReportLab, `python-docx`
- **Database:** SQLite 3 (user accounts & sign-in audit log) + user-isolated JSON data store (auto-initialized in `database/` on first run)
- **Frontend:** HTML5, CSS3 / Tailwind CSS v4 (static build), Vanilla ES6+ JavaScript modules, Lucide Icons, jsPDF, Canvas Confetti

## Project Structure
```text
├── app.py                     # Flask application server, auth, CRUD & download APIs
├── backend/                   # AI service, SQLite & JSON persistence modules
├── templates/index.html       # Frontend HTML entry point
├── static/
│   ├── css/                   # Compiled Tailwind CSS & custom animations
│   ├── js/                    # Modular ES6 components, state, API & utilities
│   └── vendor/                # Local Lucide, jsPDF, and Canvas Confetti scripts
├── scripts/
│   ├── start_server.sh        # Self-bootstrapping Python venv launcher
│   ├── generate_bw_latex_paper.py
│   └── generate_presentation_pdf.py
├── public/                    # Downloadable research paper & presentation PDF
├── msc_docs/screens/          # App screenshots used by presentation generator
├── requirements.txt           # Python dependencies
└── .env.example               # Sample environment configuration
```

## Quick Start (Local)

1. **Clone the repository and create a virtual environment:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure environment variables (optional):**
   ```bash
   cp .env.example .env
   # Add your GEMINI_API_KEY and JWT_SECRET in .env
   ```

3. **Run the server:**
   ```bash
   python app.py
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser and sign up or click **Explore with Demo Account**.

## Authors & Credits
- **Project & Presentation:** Nivetha M
- **IEEE Research Manuscript:** Mrs. Nivetha M 
