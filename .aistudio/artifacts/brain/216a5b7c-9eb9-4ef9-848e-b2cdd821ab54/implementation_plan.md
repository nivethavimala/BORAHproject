# LUMORA — Private Journal, Memory, Planner & Life Companion

LUMORA is a secure, comforting, and private digital life companion designed as an intimate personal notebook. It brings together rich journaling with scrapbook customization, photo memory albums, a daily planner, to-do lists, mood tracking with analytics, and gentle, non-clinical AI-assisted reflections.

## User Review & Critical Decisions

> [!IMPORTANT]
> The application is built to run immediately in the live environment as a full-stack system with Express + SQLite + modern responsive frontend, while providing complete Python/Flask models, test suites, and academic documentation for the user's MSc submission requirements.

- **Confirmed Runtime Architecture**: Full-stack Node.js/Express service layer on port 3000 with persistent SQLite storage, JWT authorization, secure user isolation, and client-side modern notebook UI with Tailwind CSS.
- **Default Theme & Aesthetic Atmosphere**: "Warm Sunrise" (soft warm cream `#FFFBF5`, gentle terracotta/rose accents, natural paper textures, and rounded notebook cards) with instant switching to Cozy Sage, Lavender Dream, Midnight, or Ocean Calm.
- **AI Safety & Clinical Boundary**: Strictly non-clinical language ("AI detected an emotional pattern", "Gentle reflections"), observational tone, and immediate supportive care crisis resources if distress triggers are detected.

---

## 1. Overview & Core Concept

- **What It Does**: A private, distraction-free life companion where users can write diary entries with stickers and formatting, archive precious photo memories with captions, schedule events and study sessions, manage tasks with progress trackers, record mood intensities (1–10), and view personal emotional and productivity patterns over time.
- **Target Audience / Persona**: Students, researchers, and individuals seeking a comforting personal space for self-reflection, academic planning, habit tracking, and memory preservation without social media noise or invasive tracking.
- **Key Value**: Uncompromising privacy and data ownership (every record is strictly scoped to the authenticated user ID, with full JSON export and account deletion), combined with an emotionally soothing scrapbook experience.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Authentication & First-Time Onboarding**:
   - Secure Sign Up & Login with email validation, secure password hashing, and JWT tokens.
   - 3-step gentle onboarding modal: pick theme (Warm Sunrise, Cozy Sage, Lavender Dream, Midnight), choose font style (Clean Sans, Warm Serif, or Cozy Handwritten), and select personal priority modules.
2. **Personalized Companion Dashboard**:
   - Time-of-day greeting ("Good morning, [Name] 🌷"), current date, quick mood logger widget.
   - Today's focus card: tasks completed count with circular progress indicator.
   - Upcoming schedule highlight, recent journal snippet, pinned notes, and memory polaroid teaser.
3. **Rich Journal & Scrapbook Editor**:
   - Title, date selector, mood tag, and privacy toggle.
   - Rich formatting: Bold, Italic, Underline, Bullet/Numbered lists, font sizing, color highlights.
   - Scrapbook elements: Cute sticker picker (🌸, ✨, ☕, 🌿, 🧸, 📚, 🌙, 🐱), photo attachments, and favorite toggle.
4. **Photo Memory Album**:
   - Create curated albums ("College Memories", "Best Days", "Quiet Walks").
   - Polaroid-style cards with date, location, descriptions, and photo galleries with captioning.
5. **Planner, Timetable & Task Manager**:
   - Planner: Day, Week, and Month views with color-coded categories (Study, Work, Personal, Important).
   - Tasks: Priority badges (🔴 High, 🟡 Medium, 🟢 Low), due dates, filterable by status, and celebratory micro-toast upon completing all daily items.
6. **Mood Tracking & Emotional History**:
   - 8 core moods (😊 Happy, 😌 Calm, 😐 Neutral, 😔 Sad, 😰 Anxious, 😡 Angry, 😴 Tired, 🤩 Excited) with 1–10 intensity slider and journal notes.
   - Visual trend line and mood distribution charts (daily, weekly, monthly).
7. **AI Reflections & Smart Summaries (Gemini 3.8 Flash)**:
   - "Analyze emotional tone" button on journal drafts with non-clinical pattern feedback.
   - "Weekly Reflection Prompts" generating 3 constructive self-growth questions.
   - "Summarize my week" highlighting positive moments, key themes, and progress.
8. **Privacy & Data Freedom**:
   - Account security dashboard, single-click "Export My Data (JSON)", and confirmed account deletion.

### Visual Identity & Theme Tokens

```
Canvas Neutral (60%):    #FFFBF5 (Warm Cream) / #0F172A (Midnight Dark)
Structural Surface (30%):#FFFFFF / #FBF7F0 / #1E293B
Primary Accent (10%):    #E07A5F (Terracotta Peach) / #81B29A (Cozy Sage)
Text Hierarchy:          Display: 'Plus Jakarta Sans', 600-700
                         Journal Body: 'Lora' / 'Plus Jakarta Sans', 400
                         Data & Metrics: 'JetBrains Mono', tabular-nums
```

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full-Stack Express with Embedded SQLite**:
  - *Chosen Approach*: Node.js Express server running with SQLite database file (`lumora.db`) backed by schema migrations and REST API endpoints.
  - *Why*: Ensures zero external database cloud setup barriers, instant local boot time, genuine server-side JWT security enforcement, and relational integrity.
- **Decision 2: Strict Multi-Tenant Data Isolation at Service Layer**:
  - *Chosen Approach*: Every single SQL query checks `WHERE user_id = ?` extracted from verified JWT tokens. No client-supplied ID parameters can access unowned records.
  - *Why*: Prevents Insecure Direct Object References (IDOR) and protects sensitive private thoughts.
- **Decision 3: Non-Clinical AI Guardrails**:
  - *Chosen Approach*: System instructions for Gemini 3.8 Flash explicitly ban medical diagnoses, therapy pretension, and catastrophic language, enforcing observational wording ("I noticed a possible pattern...").

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LUMORA CLIENT (Vite SPA)                        │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐  │
│  │   Navigation & Theme  │  │   Dashboard / Journal / Memories /     │  │
│  │   (Warm/Sage/Midnight)│  │   Planner / Tasks / Mood / AI Insights │  │
│  └───────────┬───────────┘  └───────────────────┬────────────────────┘  │
└──────────────┼──────────────────────────────────┼───────────────────────┘
               │  REST API Calls (Bearer JWT)     │
               ▼                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      EXPRESS BACKEND (server.ts)                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Auth & JWT Middleware (verifyToken, password hash, rate-limit)  │  │
│  └──────────┬──────────────────────────────┬────────────────────────┘  │
│             │                              │                            │
│  ┌──────────▼─────────────┐   ┌────────────▼────────────────────────┐  │
│  │  Data Controllers      │   │  AI Service (@google/genai)         │  │
│  │  - /api/auth           │   │  - Emotion tone detection           │  │
│  │  - /api/journal        │   │  - Weekly reflection summary        │  │
│  │  - /api/memories       │   │  - Smart self-check prompts         │  │
│  │  - /api/tasks          │   └─────────────────────────────────────┘  │
│  │  - /api/schedule       │                                             │
│  │  - /api/moods          │                                             │
│  │  - /api/notes          │                                             │
│  │  - /api/search         │                                             │
│  └──────────┬─────────────┘                                             │
└─────────────┼───────────────────────────────────────────────────────────┘
              │  Parameterized SQL Queries (user_id scoped)
              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SQLITE DATABASE (lumora.db)                     │
│  users · journal_entries · memories · memory_photos · tasks ·          │
│  schedules · mood_entries · notes · stickers · user_settings           │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Entities

- `User`: `id`, `name`, `email`, `password_hash`, `profile_photo`, `created_at`
- `JournalEntry`: `id`, `user_id`, `title`, `content`, `mood`, `entry_date`, `is_favorite`, `is_private`, `font_family`, `text_color`, `stickers_json`, `created_at`, `updated_at`
- `Memory`: `id`, `user_id`, `title`, `description`, `memory_date`, `location`, `cover_image`, `is_favorite`, `created_at`
- `MemoryPhoto`: `id`, `memory_id`, `user_id`, `image_url`, `caption`, `uploaded_at`
- `Task`: `id`, `user_id`, `title`, `description`, `priority` (high/medium/low), `category` (study/work/personal/health/project), `due_date`, `due_time`, `completed`, `created_at`
- `Schedule`: `id`, `user_id`, `title`, `description`, `date`, `start_time`, `end_time`, `category`, `reminder_enabled`
- `MoodEntry`: `id`, `user_id`, `mood`, `intensity` (1-10), `note`, `date`, `created_at`
- `Note`: `id`, `user_id`, `title`, `content`, `priority`, `is_pinned`, `color`, `created_at`
- `UserSettings`: `user_id`, `theme`, `font_family`, `font_size`, `accent_color`, `primary_interests_json`

---

## 5. Development Phases

- **Phase 1**: Environment setup, Express server structure, database schema initialization (`sqlite3`/better-sqlite3/sql engine), password hashing, and JWT middleware.
- **Phase 2**: Full RESTful API endpoints with strict user ownership validation (`/api/auth`, `/api/journal`, `/api/memories`, `/api/tasks`, `/api/schedule`, `/api/moods`, `/api/notes`, `/api/search`, `/api/export`).
- **Phase 3**: Design system tokens, warm notebook shell, theme provider (Warm Sunrise, Cozy Sage, Lavender Dream, Midnight), and responsive navigation.
- **Phase 4**: Personalized Dashboard, Onboarding Wizard, and Quick Mood Logger.
- **Phase 5**: Rich Journal & Scrapbook Editor with formatting toolbar, sticker placement, mood picker, and favorite filtering.
- **Phase 6**: Memories Album with polaroid layouts, photo captions, and timeline view.
- **Phase 7**: Planner & Timetable (Day/Week/Month) + Task Manager with progress metrics.
- **Phase 8**: Important Notes board with pinning, color accents, and priority tags.
- **Phase 9**: Mood Tracking & Analytics with trends, distribution charts, and pattern observations.
- **Phase 10**: Gemini 3.8 Flash AI integrations (emotion pattern detection, weekly smart summaries, gentle reflection prompts) with non-clinical safety guards.
- **Phase 11**: Global search across all entities + Account Privacy & Data Export (JSON).
- **Phase 12**: Verification, responsive mobile audit, and complete MSc academic documentation package (ER diagram, Python Flask reference files, test suite, and Viva preparation).
