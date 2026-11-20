#!/usr/bin/env python3
"""
BORAH Project Presentation PDF Generator (16:9 Widescreen, 9 Slides)
Prompt Engineering Student Project Deck — Presented by Nivetha M
Generates /public/BORAH_Project_Presentation.pdf and /msc_docs/BORAH_Project_Presentation.pdf
"""

import os
from pathlib import Path
from typing import List, Tuple

from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


# 16:9 Widescreen Slide Dimensions (13.333 in x 7.5 in = 960 x 540 pt)
SLIDE_W = 960.0
SLIDE_H = 540.0

# Color Palette (BORAH Sanctuary Theme: Deep Lavender, Royal Plum, Warm Amber, Slate)
C_BG_CREAM = colors.HexColor("#FAF7F2")
C_DARK_PLUM = colors.HexColor("#1E1038")
C_DEEP_INDIGO = colors.HexColor("#2E1065")
C_PURPLE = colors.HexColor("#7C3AED")
C_PURPLE_SOFT = colors.HexColor("#F3E8FF")
C_PURPLE_BORDER = colors.HexColor("#DDD6FE")
C_AMBER = colors.HexColor("#D97706")
C_AMBER_LIGHT = colors.HexColor("#FEF3C7")
C_AMBER_BORDER = colors.HexColor("#FDE68A")
C_PINK = colors.HexColor("#DB2777")
C_PINK_SOFT = colors.HexColor("#FCE7F3")
C_SKY = colors.HexColor("#0284C7")
C_SKY_SOFT = colors.HexColor("#E0F2FE")
C_EMERALD = colors.HexColor("#059669")
C_EMERALD_SOFT = colors.HexColor("#D1FAE5")
C_INK = colors.HexColor("#0F172A")
C_SLATE = colors.HexColor("#334155")
C_MUTED = colors.HexColor("#64748B")
C_BORDER = colors.HexColor("#E2E8F0")
C_WHITE = colors.white


def wrap_lines(text: str, font: str, size: float, max_w: float) -> List[str]:
    words = text.split()
    lines: List[str] = []
    cur = ""
    for w in words:
        cand = f"{cur} {w}".strip()
        if stringWidth(cand, font, size) <= max_w:
            cur = cand
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_wrapped(
    c: canvas.Canvas,
    text: str,
    x: float,
    y_top: float,
    max_w: float,
    font: str = "Helvetica",
    size: float = 11.0,
    leading: float = 15.0,
    color=C_SLATE,
) -> float:
    c.setFont(font, size)
    c.setFillColor(color)
    y = y_top
    for line in wrap_lines(text, font, size, max_w):
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_card(
    c: canvas.Canvas,
    x: float,
    y_bottom: float,
    w: float,
    h: float,
    fill=C_WHITE,
    stroke=C_BORDER,
    radius: float = 12.0,
    stroke_w: float = 1.0,
) -> None:
    c.saveState()
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(stroke_w)
    c.roundRect(x, y_bottom, w, h, radius, stroke=1, fill=1)
    c.restoreState()


def draw_pill(
    c: canvas.Canvas,
    x: float,
    y_bottom: float,
    text: str,
    bg=C_PURPLE_SOFT,
    fg=C_PURPLE,
    font: str = "Helvetica-Bold",
    size: float = 8.5,
    pad_x: float = 9.0,
    h: float = 18.0,
) -> float:
    tw = stringWidth(text, font, size)
    w = tw + pad_x * 2
    c.saveState()
    c.setFillColor(bg)
    c.setStrokeColor(bg)
    c.roundRect(x, y_bottom, w, h, h / 2.0, stroke=0, fill=1)
    c.setFont(font, size)
    c.setFillColor(fg)
    c.drawString(x + pad_x, y_bottom + (h - size) / 2.0 + 1.2, text)
    c.restoreState()
    return w


def draw_chrome(
    c: canvas.Canvas,
    slide_num: int,
    total_slides: int,
    kicker: str,
    title: str,
    subtitle: str = "",
) -> None:
    # Background canvas
    c.setFillColor(C_BG_CREAM)
    c.rect(0, 0, SLIDE_W, SLIDE_H, stroke=0, fill=1)

    # Top accent bar (split plum -> purple -> amber)
    c.setFillColor(C_DEEP_INDIGO)
    c.rect(0, SLIDE_H - 5, SLIDE_W * 0.45, 5, stroke=0, fill=1)
    c.setFillColor(C_PURPLE)
    c.rect(SLIDE_W * 0.45, SLIDE_H - 5, SLIDE_W * 0.35, 5, stroke=0, fill=1)
    c.setFillColor(C_AMBER)
    c.rect(SLIDE_W * 0.80, SLIDE_H - 5, SLIDE_W * 0.20, 5, stroke=0, fill=1)

    # Kicker pill + slide title
    draw_pill(c, 42, SLIDE_H - 42, kicker.upper(), bg=C_PURPLE_SOFT, fg=C_PURPLE, size=8.0)

    c.setFont("Helvetica-Bold", 21)
    c.setFillColor(C_INK)
    c.drawString(42, SLIDE_H - 70, title)

    if subtitle:
        c.setFont("Helvetica", 10.5)
        c.setFillColor(C_MUTED)
        c.drawString(42, SLIDE_H - 87, subtitle)

    # Divider line under header
    c.setStrokeColor(C_BORDER)
    c.setLineWidth(0.8)
    c.line(42, SLIDE_H - 96, SLIDE_W - 42, SLIDE_H - 96)

    # Footer bar
    c.setStrokeColor(C_BORDER)
    c.setLineWidth(0.6)
    c.line(42, 30, SLIDE_W - 42, 30)

    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(C_PURPLE)
    c.drawString(42, 16, "BORAH")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(C_MUTED)
    c.drawString(
        42 + stringWidth("BORAH", "Helvetica-Bold", 8.5) + 6,
        16,
        "|  Prompt Engineering Student Project  •  Presented by Nivetha M",
    )

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(C_SLATE)
    c.drawRightString(SLIDE_W - 42, 16, f"Slide {slide_num} / {total_slides}")


def draw_bullet_item(
    c: canvas.Canvas,
    x: float,
    y_top: float,
    heading: str,
    body: str,
    max_w: float,
    dot_color=C_PURPLE,
    body_size: float = 9.8,
) -> float:
    c.saveState()
    c.setFillColor(dot_color)
    c.circle(x + 4, y_top + 3.5, 3.2, stroke=0, fill=1)
    c.restoreState()

    c.setFont("Helvetica-Bold", body_size + 0.4)
    c.setFillColor(C_INK)
    c.drawString(x + 14, y_top, heading)

    y_next = draw_wrapped(
        c,
        body,
        x + 14,
        y_top - 13.5,
        max_w - 14,
        font="Helvetica",
        size=body_size,
        leading=13.0,
        color=C_SLATE,
    )
    return y_next - 5


def draw_image_framed(
    c: canvas.Canvas,
    img_path: Path,
    x: float,
    y_bottom: float,
    box_w: float,
    box_h: float,
    caption: str = "",
) -> None:
    draw_card(c, x, y_bottom, box_w, box_h, fill=C_WHITE, stroke=C_PURPLE_BORDER, radius=10, stroke_w=1.2)
    cap_h = 20.0 if caption else 4.0
    pad = 6.0
    avail_w = box_w - pad * 2
    avail_h = box_h - pad * 2 - cap_h

    if img_path.exists():
        ir = ImageReader(str(img_path))
        iw, ih = ir.getSize()
        scale = min(avail_w / iw, avail_h / ih)
        dw = iw * scale
        dh = ih * scale
        ix = x + pad + (avail_w - dw) / 2.0
        iy = y_bottom + cap_h + pad + (avail_h - dh) / 2.0
        c.drawImage(ir, ix, iy, width=dw, height=dh, preserveAspectRatio=True, mask="auto")
    else:
        c.setFont("Helvetica-Oblique", 10)
        c.setFillColor(C_MUTED)
        c.drawCentredString(x + box_w / 2.0, y_bottom + box_h / 2.0, f"[Output screenshot: {img_path.name}]")

    if caption:
        c.setFillColor(C_PURPLE_SOFT)
        c.rect(x + 1, y_bottom + 1, box_w - 2, cap_h - 1, stroke=0, fill=1)
        c.setFont("Helvetica-Bold", 8.5)
        c.setFillColor(C_DEEP_INDIGO)
        c.drawCentredString(x + box_w / 2.0, y_bottom + 6.5, caption)


def slide_1_title(c: canvas.Canvas) -> None:
    # Dark sanctuary hero background
    c.setFillColor(C_DARK_PLUM)
    c.rect(0, 0, SLIDE_W, SLIDE_H, stroke=0, fill=1)

    # Decorative geometric accent shapes
    c.saveState()
    c.setFillColor(colors.HexColor("#3B0764"))
    c.circle(SLIDE_W - 70, SLIDE_H - 60, 175, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#4C1D95"))
    c.circle(SLIDE_W - 140, 80, 120, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#2E1065"))
    c.circle(70, 50, 140, stroke=0, fill=1)
    c.restoreState()

    # Left vertical gold/amber bar
    c.setFillColor(C_AMBER)
    c.rect(52, 118, 5, 310, stroke=0, fill=1)

    # Top project tag
    draw_pill(
        c,
        74,
        406,
        "PROMPT ENGINEERING PROJECT PRESENTATION",
        bg=colors.HexColor("#4C1D95"),
        fg=colors.HexColor("#FDE68A"),
        size=9.0,
        h=22.0,
    )

    # Project Main Title
    c.setFont("Helvetica-Bold", 42)
    c.setFillColor(C_WHITE)
    c.drawString(74, 352, "BORAH")

    c.setFont("Helvetica-Bold", 19)
    c.setFillColor(colors.HexColor("#E9D5FF"))
    c.drawString(74, 318, "A Private Sanctuary & Voice-Integrated Cognitive")
    c.drawString(74, 294, "Journaling Companion")

    c.setFont("Helvetica-Oblique", 12.5)
    c.setFillColor(colors.HexColor("#FCD34D"))
    c.drawString(74, 260, '"Your space, your story, your moments."')

    # Presenter box
    draw_card(
        c,
        74,
        122,
        460,
        112,
        fill=colors.HexColor("#2E1065"),
        stroke=colors.HexColor("#7C3AED"),
        radius=14,
        stroke_w=1.2,
    )
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.HexColor("#C4B5FD"))
    c.drawString(94, 210, "PRESENTED BY")

    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(C_WHITE)
    c.drawString(94, 180, "Nivetha M")

    c.setFont("Helvetica", 10.5)
    c.setFillColor(colors.HexColor("#E2E8F0"))
    c.drawString(94, 156, "Engineering Student  •  Prompt Engineering & Full-Stack Web Development")
    c.drawString(94, 138, "Tech Stack: Python (Flask), HTML5, CSS3, JavaScript (ES6+), SQLite 3, Gemini AI")

    # Right summary highlights card
    draw_card(
        c,
        575,
        122,
        325,
        306,
        fill=colors.HexColor("#241247"),
        stroke=colors.HexColor("#6D28D9"),
        radius=16,
        stroke_w=1.2,
    )
    c.setFont("Helvetica-Bold", 12.5)
    c.setFillColor(colors.HexColor("#FDE68A"))
    c.drawString(598, 400, "What This Presentation Covers")

    topics = [
        ("01", "Why I Built BORAH", "Privacy, mental wellness & voice journaling"),
        ("02", "Prompt Engineering", "Iterative prompting from spec to runtime"),
        ("03", "How I Built It", "System architecture & Python backend"),
        ("04", "Languages & Libraries", "HTML, CSS, JS, Python & Gemini GenAI"),
        ("05", "Live Output Images", "Real screens from the running web app"),
    ]
    ty = 365
    for num, head, desc in topics:
        draw_pill(c, 598, ty - 4, num, bg=C_PURPLE, fg=C_WHITE, size=8.5, pad_x=7, h=18)
        c.setFont("Helvetica-Bold", 10.5)
        c.setFillColor(C_WHITE)
        c.drawString(634, ty + 2, head)
        c.setFont("Helvetica", 8.8)
        c.setFillColor(colors.HexColor("#CBD5E1"))
        c.drawString(634, ty - 11, desc)
        ty -= 48

    # Slide 1 footer
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#A78BFA"))
    c.drawString(74, 42, "BORAH Digital Sanctuary  •  Academic Project Presentation")
    c.drawRightString(SLIDE_W - 60, 42, "Slide 1 / 9")


def slide_2_why(c: canvas.Canvas) -> None:
    draw_chrome(
        c,
        2,
        9,
        "Motivation & Problem Statement",
        "Why I Built BORAH: Bridging Privacy, Reflection & Voice",
        "Real challenges I noticed as an engineering student balancing academic pressure and mental clarity.",
    )

    # Left Column: Personal Motivation Story
    draw_card(c, 42, 52, 428, 378, fill=C_WHITE, stroke=C_PURPLE_BORDER, radius=14)
    draw_pill(c, 60, 396, "THE PROBLEM I WANTED TO SOLVE", bg=C_PINK_SOFT, fg=C_PINK, size=8.0)

    c.setFont("Helvetica-Bold", 13.5)
    c.setFillColor(C_INK)
    c.drawString(60, 370, "Why Existing Apps Weren't Enough for Students")

    y = 342
    y = draw_bullet_item(
        c,
        60,
        y,
        "1. Privacy & Judgment Anxiety",
        "Many journaling apps push social feeds, public streaks, or aggressive analytics. Students need a safe, non-judgmental vault where thoughts stay 100% isolated per user.",
        390,
        dot_color=C_PURPLE,
    )
    y = draw_bullet_item(
        c,
        60,
        y,
        "2. Disconnected Text and Voice Tools",
        "When exhausted after lab sessions or lectures, typing long paragraphs feels heavy. Recording an audio clip in a separate voice app breaks the flow of a diary page.",
        390,
        dot_color=C_PINK,
    )
    y = draw_bullet_item(
        c,
        60,
        y,
        "3. Fragmented Daily Productivity",
        "Managing timetables, assignment checklists, quick sticky notes, moods, and reflective journaling across five separate tools creates cognitive overload.",
        390,
        dot_color=C_AMBER,
    )
    draw_bullet_item(
        c,
        60,
        y,
        "4. Unsafe Clinical Framing in AI Tools",
        "Generic chatbots attempt pseudo-medical labels. I wanted strictly non-clinical, gentle observational AI insights that comfort rather than diagnose.",
        390,
        dot_color=C_EMERALD,
    )

    # Right Column: Vision & Core Goals Cards
    cards = [
        (
            "All-in-One Calm Sanctuary",
            "Combines rich diary writing, cursor-anchored voice memos, photo memories, weekly planner, tasks, sticky notes, and mood spectrum inside one serene interface.",
            C_PURPLE_SOFT,
            C_PURPLE,
            "VISION GOAL 01",
        ),
        (
            "Bora: Empathy-First Companion",
            "Built an interactive lavender bunny companion offering affirmations, 4-4-4 breathing exercises, and soothing quotes without distracting from deep work.",
            C_AMBER_LIGHT,
            C_AMBER,
            "VISION GOAL 02",
        ),
        (
            "Student-First Engineering Rigor",
            "Zero external bloat: built on an accessible Python + HTML/CSS/JS stack with deterministic local fallbacks so BORAH works seamlessly even offline.",
            C_EMERALD_SOFT,
            C_EMERALD,
            "VISION GOAL 03",
        ),
    ]
    cy = 310
    for heading, text, bg, fg, badge in cards:
        draw_card(c, 492, cy, 426, 120, fill=C_WHITE, stroke=C_BORDER, radius=14)
        c.setFillColor(fg)
        c.rect(492, cy + 12, 5, 96, stroke=0, fill=1)
        draw_pill(c, 512, cy + 92, badge, bg=bg, fg=fg, size=7.8, h=16)
        c.setFont("Helvetica-Bold", 12.5)
        c.setFillColor(C_INK)
        c.drawString(512, cy + 72, heading)
        draw_wrapped(c, text, 512, cy + 54, 388, font="Helvetica", size=9.6, leading=13.2, color=C_SLATE)
        cy -= 129


def slide_3_prompt_engineering(c: canvas.Canvas) -> None:
    draw_chrome(
        c,
        3,
        9,
        "Prompt Engineering Methodology",
        "How Prompt Engineering Drove Both Development & Runtime AI",
        "Designing structured, constraint-driven prompts as an engineering discipline—not guesswork.",
    )

    # Top row: 4-Stage Prompt Engineering Cycle
    stages = [
        ("Stage 1: Role & Persona", "Assigned clear roles: full-stack architect for app synthesis & gentle, non-clinical companion for runtime AI.", C_PURPLE),
        ("Stage 2: Constraints First", "Explicit negative rules: no clinical diagnosis, zero social pressure, strictly isolated per-user data paths.", C_PINK),
        ("Stage 3: Structured Schemas", "Forced deterministic JSON outputs (primaryEmotion, confidence, keywords) with mime-type locking.", C_SKY),
        ("Stage 4: Graceful Fallback", "Engineered timeout guards (8s HttpOptions) & thoughtful fallbacks when external AI quota or keys pause.", C_EMERALD),
    ]
    sx = 42
    sw = 207
    for idx, (st_title, st_body, st_col) in enumerate(stages):
        draw_card(c, sx, 294, sw, 134, fill=C_WHITE, stroke=C_BORDER, radius=12)
        c.setFillColor(st_col)
        c.rect(sx + 14, 412, sw - 28, 3.5, stroke=0, fill=1)
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(C_INK)
        c.drawString(sx + 14, 390, st_title)
        draw_wrapped(c, st_body, sx + 14, 370, sw - 28, font="Helvetica", size=9.3, leading=13.0, color=C_SLATE)
        if idx < 3:
            c.setFont("Helvetica-Bold", 14)
            c.setFillColor(C_MUTED)
            c.drawString(sx + sw + 4, 358, "→")
        sx += sw + 16

    # Bottom Left: Build-Time Prompting Example (Cursor-Anchored Voice Note)
    draw_card(c, 42, 52, 428, 224, fill=C_WHITE, stroke=C_PURPLE_BORDER, radius=14)
    draw_pill(c, 60, 248, "BUILD-TIME PROMPT ITERATION", bg=C_PURPLE_SOFT, fg=C_PURPLE, size=8.0)
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(C_INK)
    c.drawString(60, 226, "From Idea to Cursor-Anchored Voice Token")

    draw_wrapped(
        c,
        "Initial prompt asked for an audio recorder at the bottom of the page. Iterating the prompt with exact DOM interaction specs produced inline cursor anchoring:",
        60,
        208,
        392,
        font="Helvetica",
        size=9.4,
        leading=12.8,
        color=C_SLATE,
    )

    # Code-like prompt box
    draw_card(c, 60, 68, 392, 102, fill=colors.HexColor("#1E1B4B"), stroke=C_DEEP_INDIGO, radius=10)
    c.setFont("Courier-Bold", 8.6)
    c.setFillColor(colors.HexColor("#FDE68A"))
    c.drawString(74, 152, "Engineered Specification Prompt:")
    c.setFont("Courier", 8.3)
    c.setFillColor(colors.HexColor("#E2E8F0"))
    c.drawString(74, 136, '• Track textarea.selectionStart before recording')
    c.drawString(74, 122, '• Capture MediaRecorder audio + WebAudio bars')
    c.drawString(74, 108, '• Insert [[voice_memo:<clip_id>]] at exact cursor')
    c.drawString(74, 94,  '• Split read view on token -> inline player card')
    c.drawString(74, 80,  '• Migrate entire codebase to Python + HTML/CSS/JS')

    # Bottom Right: Runtime Gemini Prompt Engineering (backend/ai_service.py)
    draw_card(c, 490, 52, 428, 224, fill=C_WHITE, stroke=C_AMBER_BORDER, radius=14)
    draw_pill(c, 508, 248, "RUNTIME GEMINI PROMPT DESIGN", bg=C_AMBER_LIGHT, fg=C_AMBER, size=8.0)
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(C_INK)
    c.drawString(508, 226, "Safety-Guarded Multimodal System Instructions")

    y = 204
    y = draw_bullet_item(
        c,
        508,
        y,
        "Emotion Analysis (gemini-3.8-flash)",
        'System role forbids clinical terms; enforces strict JSON schema {primaryEmotion, confidence, observation, keywords}.',
        392,
        dot_color=C_PURPLE,
        body_size=9.2,
    )
    y = draw_bullet_item(
        c,
        508,
        y,
        "Weekly Synthesis Context Packing",
        "Feeds last 7 entries (120-char slices), task completion ratio, and mood intensity into a 4-key comforting weekly reflection JSON.",
        392,
        dot_color=C_AMBER,
        body_size=9.2,
    )
    draw_bullet_item(
        c,
        508,
        y,
        "Speech Transcription & Music Clips",
        "Audio bytes routed to gemini-3.5-transcribe (fallback 3.8-flash) and Lyria preview streaming for calming clips.",
        392,
        dot_color=C_EMERALD,
        body_size=9.2,
    )


def slide_4_how_architecture(c: canvas.Canvas) -> None:
    draw_chrome(
        c,
        4,
        9,
        "System Design & Implementation",
        "How I Built BORAH: End-to-End Architecture & Engineering Steps",
        "Clean client-server separation: modular ES6 browser SPA backed by a self-bootstrapping Python Flask server.",
    )

    # Architecture Diagram Container
    draw_card(c, 42, 222, 876, 206, fill=C_WHITE, stroke=C_PURPLE_BORDER, radius=14)
    draw_pill(c, 58, 400, "FULL-STACK SYSTEM ARCHITECTURE", bg=C_PURPLE_SOFT, fg=C_PURPLE, size=8.0)

    # Box 1: Browser Frontend
    draw_card(c, 58, 242, 232, 146, fill=colors.HexColor("#F8FAFC"), stroke=C_SKY, radius=10, stroke_w=1.3)
    c.setFillColor(C_SKY)
    c.rect(58, 366, 232, 22, stroke=0, fill=1)
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(C_WHITE)
    c.drawCentredString(174, 373, "1. Browser Client (SPA)")
    items_b1 = [
        "• HTML5 + Static Tailwind CSS v4",
        "• 21 Modular ES6 Components",
        "• Web AudioContext Visualizer",
        "• MediaRecorder Voice Capture",
        "• Web SpeechSynthesis TTS",
        "• jsPDF Client Archive Export",
    ]
    by = 348
    c.setFont("Helvetica", 8.8)
    c.setFillColor(C_SLATE)
    for it in items_b1:
        c.drawString(70, by, it)
        by -= 16

    # Arrow 1 -> 2
    c.setStrokeColor(C_PURPLE)
    c.setFillColor(C_PURPLE)
    c.setLineWidth(2.0)
    c.line(294, 315, 329, 315)
    p = c.beginPath()
    p.moveTo(337, 315)
    p.lineTo(327, 320)
    p.lineTo(327, 310)
    p.close()
    c.drawPath(p, stroke=0, fill=1)
    c.setFont("Helvetica-Bold", 7.8)
    c.setFillColor(C_MUTED)
    c.drawCentredString(315, 326, "PyJWT")
    c.drawCentredString(315, 300, "REST")

    # Box 2: Python Flask Backend
    draw_card(c, 344, 242, 248, 146, fill=colors.HexColor("#FAF5FF"), stroke=C_PURPLE, radius=10, stroke_w=1.3)
    c.setFillColor(C_PURPLE)
    c.rect(344, 366, 248, 22, stroke=0, fill=1)
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(C_WHITE)
    c.drawCentredString(468, 373, "2. Python Flask API (app.py)")
    items_b2 = [
        "• Auth Guard: @authenticate_token",
        "• Bcrypt Salted Password Hashing",
        "• 25+ User-Scoped CRUD Routes",
        "• 16 MB Base64 Audio/Photo Support",
        "• Paper & Presentation PDF Routes",
        "• Auto .venv Bootstrap (start_server.sh)",
    ]
    by = 348
    c.setFont("Helvetica", 8.8)
    c.setFillColor(C_SLATE)
    for it in items_b2:
        c.drawString(356, by, it)
        by -= 16

    # Arrows 2 -> 3 (top & bottom)
    c.setStrokeColor(C_AMBER)
    c.setFillColor(C_AMBER)
    c.setLineWidth(1.8)
    for ay in (348, 282):
        c.line(596, ay, 630, ay)
        pa = c.beginPath()
        pa.moveTo(638, ay)
        pa.lineTo(628, ay + 4.5)
        pa.lineTo(628, ay - 4.5)
        pa.close()
        c.drawPath(pa, stroke=0, fill=1)

    # Box 3A: Dual Storage
    draw_card(c, 644, 318, 256, 70, fill=colors.HexColor("#ECFDF5"), stroke=C_EMERALD, radius=10, stroke_w=1.2)
    c.setFont("Helvetica-Bold", 9.8)
    c.setFillColor(C_EMERALD)
    c.drawString(656, 370, "3A. Dual Data Persistence")
    c.setFont("Helvetica", 8.6)
    c.setFillColor(C_SLATE)
    c.drawString(656, 353, "• SQLite 3 (users & signin audit log)")
    c.drawString(656, 338, "• Isolated JSON Store (entries, tasks,")
    c.drawString(656, 325, "  moods, planner, notes, albums)")

    # Box 3B: Gemini AI + Document Engine
    draw_card(c, 644, 242, 256, 68, fill=colors.HexColor("#FFFBEB"), stroke=C_AMBER, radius=10, stroke_w=1.2)
    c.setFont("Helvetica-Bold", 9.8)
    c.setFillColor(C_AMBER)
    c.drawString(656, 293, "3B. Gemini GenAI & Doc Engine")
    c.setFont("Helvetica", 8.6)
    c.setFillColor(C_SLATE)
    c.drawString(656, 276, "• google-genai SDK (8s HttpOptions)")
    c.drawString(656, 261, "• ReportLab & python-docx PDF/DOCX")

    # Bottom 4 Engineering Build Steps
    steps = [
        ("Step 1: Schema & Auth", "Built SQLite 3 + JSON persistence with bcrypt password hashing and 7-day PyJWT bearer tokens."),
        ("Step 2: Sanctuary Modules", "Implemented Dashboard, Journal Studio, Planner, Tasks, Sticky Notes, Insights & Settings in ES6 JS."),
        ("Step 3: Audio & AI Pipelines", "Integrated Web AudioContext waveform visualizer, inline voice tokens & Gemini JSON prompts."),
        ("Step 4: Python Stack & Deploy", "Migrated entire codebase to Python + HTML/CSS/JS with self-healing .venv startup on port 3000."),
    ]
    stx = 42
    stw = 207
    for idx, (h_txt, b_txt) in enumerate(steps):
        draw_card(c, stx, 52, stw, 152, fill=C_WHITE, stroke=C_BORDER, radius=12)
        draw_pill(c, stx + 14, 174, f"PHASE 0{idx + 1}", bg=C_SKY_SOFT, fg=C_SKY, size=7.8, h=16)
        c.setFont("Helvetica-Bold", 10.8)
        c.setFillColor(C_INK)
        c.drawString(stx + 14, 152, h_txt)
        draw_wrapped(c, b_txt, stx + 14, 132, stw - 28, font="Helvetica", size=9.2, leading=13.0, color=C_SLATE)
        stx += stw + 16


def slide_5_languages_libraries(c: canvas.Canvas) -> None:
    draw_chrome(
        c,
        5,
        9,
        "Languages & Technology Stack",
        "Programming Languages, Frameworks & Libraries Used",
        "Every layer purposefully uses core web standards (HTML, CSS, JavaScript) and Python with focused libraries.",
    )

    cols = [
        (
            "Core Languages",
            "6 FOUNDATIONAL LANGUAGES",
            C_PURPLE,
            C_PURPLE_SOFT,
            [
                ("Python 3.11", "Backend server, auth, AI orchestration & PDF scripts"),
                ("HTML5", "Semantic entry template (templates/index.html)"),
                ("CSS3 + Tailwind v4", "Compiled static styling + custom animations"),
                ("JavaScript (ES6+)", "21 modular UI & state components under /static/js"),
                ("SQL (SQLite 3)", "Relational identity table & sign-in telemetry"),
                ("LaTeX (IEEEtran)", "Academic research manuscript source generation"),
            ],
        ),
        (
            "Python Backend Libraries",
            "FROM REQUIREMENTS.TXT",
            C_EMERALD,
            C_EMERALD_SOFT,
            [
                ("Flask (>= 3.0.0)", "HTTP routing, Jinja templates & file downloads"),
                ("PyJWT (>= 2.8.0)", "HS256 stateless Bearer token verification"),
                ("bcrypt (>= 4.1.2)", "10-round salted cryptographic password hashing"),
                ("google-genai (>= 1.0)", "Gemini 3.8 Flash, Transcribe & Lyria 3 integration"),
                ("ReportLab (>= 4.1)", "IEEE two-column paper & 16:9 presentation PDFs"),
                ("python-docx (>= 1.1)", "Academic Word (.docx) export with DOI links"),
                ("python-dotenv", "Environment & GEMINI_API_KEY configuration"),
            ],
        ),
        (
            "Frontend Libraries & Web APIs",
            "ZERO-BUNDLER BROWSER STACK",
            C_SKY,
            C_SKY_SOFT,
            [
                ("Tailwind CSS CLI", "Static 181 KB stylesheet with .dark theme support"),
                ("Lucide Icons", "Crisp SVG iconography across every navigation tab"),
                ("jsPDF", "Instant client-side multi-page diary PDF export"),
                ("Canvas Confetti", "Celebratory particle bursts for tasks & Bora magic"),
                ("Web AudioContext", "Real-time FFT frequency bar waveform visualizer"),
                ("MediaRecorder API", "In-browser microphone capture to audio/webm"),
                ("SpeechSynthesis API", "Accessible read-aloud for daily affirmations"),
            ],
        ),
    ]

    cx = 42
    cw = 280
    for title_txt, badge_txt, fg, bg, items in cols:
        draw_card(c, cx, 52, cw, 378, fill=C_WHITE, stroke=C_BORDER, radius=14)
        c.setFillColor(fg)
        c.rect(cx, 424, cw, 6, stroke=0, fill=1)
        draw_pill(c, cx + 16, 394, badge_txt, bg=bg, fg=fg, size=7.6, h=16)
        c.setFont("Helvetica-Bold", 13.5)
        c.setFillColor(C_INK)
        c.drawString(cx + 16, 370, title_txt)

        iy = 342
        for lib_name, lib_desc in items:
            c.setFillColor(fg)
            c.circle(cx + 20, iy + 3.5, 2.8, stroke=0, fill=1)
            c.setFont("Helvetica-Bold", 9.6)
            c.setFillColor(C_INK)
            c.drawString(cx + 30, iy, lib_name)
            iy = draw_wrapped(
                c,
                lib_desc,
                cx + 30,
                iy - 12.5,
                cw - 44,
                font="Helvetica",
                size=8.6,
                leading=11.5,
                color=C_MUTED,
            )
            iy -= 6
        cx += cw + 18


def slide_6_features(c: canvas.Canvas) -> None:
    draw_chrome(
        c,
        6,
        9,
        "Core Features & Innovations",
        "Inside BORAH: Multimodal Tools Crafted for Calm & Focus",
        "Six cohesive modules engineered around tactile comfort, audio expressiveness, and private ownership.",
    )

    feats = [
        (
            "INLINE VOICE JOURNALS",
            C_PURPLE,
            C_PURPLE_SOFT,
            "Cursor-Anchored Audio Memos",
            "Click 'Record Voice Note Here' anywhere while typing. Captures live audio with a 12-bar Web AudioContext visualizer and injects [[voice_memo:id]] tokens right into text.",
        ),
        (
            "JOURNAL STUDIO",
            C_SKY,
            C_SKY_SOFT,
            "12 Wallpapers, 8 Fonts & Stickers",
            "Customize every page with curated themes, typography presets, warm Eyes Protection filter, mood emojis, photo lightboxes, and 1-click PDF archive downloads.",
        ),
        (
            "BORA AI COMPANION",
            C_PINK,
            C_PINK_SOFT,
            "Interactive Lavender Companion",
            "Animated SVG bunny with 4 quick comfort actions (Affirmation, Purple Magic, Gentle Breath 4-4-4 timer, Cheer Me Up confetti) plus tab-aware encouragement.",
        ),
        (
            "GEMINI INSIGHTS",
            C_AMBER,
            C_AMBER_LIGHT,
            "Non-Clinical Mood & Weekly Synthesis",
            "Detects reflective tone and produces comforting 4-part weekly summaries (Highlights, Quiet Joy, Growth Tips, Pattern Observation) with safe offline fallbacks.",
        ),
        (
            "PLANNER, TASKS & NOTES",
            C_EMERALD,
            C_EMERALD_SOFT,
            "Unified Daily Flow & Chimes",
            "Hourly timetable blocks, priority task checklists with synthesized Web Audio reminders, sticky note pinboard, and curated photo memory albums.",
        ),
        (
            "BUILT-IN ACADEMICS",
            C_DEEP_INDIGO,
            C_PURPLE_SOFT,
            "IEEE Paper & Presentation Hub",
            "Ships with an embedded 13-page black-and-white IEEE research paper (.pdf/.docx/.tex with 28 DOI links) and this 9-slide downloadable presentation deck.",
        ),
    ]

    w = 278
    h = 178
    positions = [
        (42, 248),
        (341, 248),
        (640, 248),
        (42, 54),
        (341, 54),
        (640, 54),
    ]
    for (badge, fg, bg, head, body), (fx, fy) in zip(feats, positions):
        draw_card(c, fx, fy, w, h, fill=C_WHITE, stroke=C_BORDER, radius=14)
        draw_pill(c, fx + 16, fy + h - 32, badge, bg=bg, fg=fg, size=7.8, h=17)
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(C_INK)
        c.drawString(fx + 16, fy + h - 55, head)
        draw_wrapped(c, body, fx + 16, fy + h - 75, w - 32, font="Helvetica", size=9.4, leading=13.5, color=C_SLATE)


def slide_7_output_dashboard(c: canvas.Canvas, screens_dir: Path) -> None:
    draw_chrome(
        c,
        7,
        9,
        "Live Project Output (1 of 2)",
        "Output Showcase: Personal Sanctuary Home & AI Weekly Insights",
        "Actual browser screenshots captured from the live Python Flask application running on port 3000.",
    )

    # Left big screenshot: Dashboard
    draw_image_framed(
        c,
        screens_dir / "dashboard.png",
        42,
        132,
        430,
        296,
        caption="Live Output 1: Home Sanctuary Dashboard + Bora AI Companion",
    )

    # Right big screenshot: Insights
    draw_image_framed(
        c,
        screens_dir / "insights.png",
        488,
        132,
        430,
        296,
        caption="Live Output 2: Personal Insights & Gemini 3.8 Flash Summary",
    )

    # Bottom Engineering Callouts Strip
    draw_card(c, 42, 50, 876, 68, fill=C_WHITE, stroke=C_PURPLE_BORDER, radius=12)
    callouts = [
        ("Daily Affirmation + TTS", "Draws daily quotes with Web SpeechSynthesis audio playback & copy support."),
        ("Interactive Bora Widget", "Floating SVG companion shows current calm state and 4 instant self-care chips."),
        ("Non-Clinical AI Cards", "Weekly Reflection Summary displays strictly observational highlights & growth tips."),
    ]
    cx = 58
    for title_c, desc_c in callouts:
        c.setFillColor(C_PURPLE)
        c.circle(cx + 4, 100, 3.5, stroke=0, fill=1)
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(C_INK)
        c.drawString(cx + 14, 96, title_c)
        draw_wrapped(c, desc_c, cx + 14, 81, 254, font="Helvetica", size=8.6, leading=11.5, color=C_MUTED)
        cx += 288


def slide_8_output_journal(c: canvas.Canvas, screens_dir: Path) -> None:
    draw_chrome(
        c,
        8,
        9,
        "Live Project Output (2 of 2)",
        "Output Showcase: Journal Studio & Cursor-Anchored Voice Notes",
        "Rich diary workspace uniting serif typography, mood tagging, inline microphone capture & IEEE doc downloads.",
    )

    # Main large Journal screenshot on left
    draw_image_framed(
        c,
        screens_dir / "journal.png",
        42,
        52,
        594,
        378,
        caption="Live Output 3: Journal Studio Edit View with Inline Voice Toolbar & Academic Paper Button",
    )

    # Right Annotations Panel
    draw_card(c, 654, 52, 264, 378, fill=C_WHITE, stroke=C_PURPLE_BORDER, radius=14)
    draw_pill(c, 670, 398, "KEY UI OBSERVATIONS", bg=C_PURPLE_SOFT, fg=C_PURPLE, size=8.0)

    c.setFont("Helvetica-Bold", 12.5)
    c.setFillColor(C_INK)
    c.drawString(670, 374, "What Happens Here")

    y = 350
    y = draw_bullet_item(
        c,
        670,
        y,
        "Record Voice Note Here",
        "Opens a live 12-bar frequency waveform recorder and anchors [[voice_memo:id]] cleanly at cursor.",
        232,
        dot_color=C_PINK,
        body_size=9.1,
    )
    y = draw_bullet_item(
        c,
        670,
        y,
        "Dual-Pane Entry Browser",
        "Filter sidebar entries by mood emoji, starred favorites, voice-only entries, or live search text.",
        232,
        dot_color=C_SKY,
        body_size=9.1,
    )
    y = draw_bullet_item(
        c,
        670,
        y,
        "Research Paper & Export PDF",
        "One-click header access to read or download the IEEE manuscript and client-side diary archives.",
        232,
        dot_color=C_PURPLE,
        body_size=9.1,
    )
    draw_bullet_item(
        c,
        670,
        y,
        "Custom Studio Drawers",
        "Bottom palette controls 12 wallpapers, stickers, fonts, bullet styles, photos, and tags.",
        232,
        dot_color=C_AMBER,
        body_size=9.1,
    )


def slide_9_outcomes_thankyou(c: canvas.Canvas) -> None:
    # Subtle cream top + dark plum bottom closing banner
    c.setFillColor(C_BG_CREAM)
    c.rect(0, 0, SLIDE_W, SLIDE_H, stroke=0, fill=1)

    c.setFillColor(C_DEEP_INDIGO)
    c.rect(0, SLIDE_H - 5, SLIDE_W, 5, stroke=0, fill=1)

    draw_pill(c, 42, SLIDE_H - 42, "OUTCOMES & CONCLUSION", bg=C_PURPLE_SOFT, fg=C_PURPLE, size=8.0)
    c.setFont("Helvetica-Bold", 21)
    c.setFillColor(C_INK)
    c.drawString(42, SLIDE_H - 70, "Challenges Solved, Outcomes & Future Roadmap")

    # Left Card: Challenges & Engineering Solutions
    draw_card(c, 42, 198, 428, 240, fill=C_WHITE, stroke=C_BORDER, radius=14)
    draw_pill(c, 60, 408, "ENGINEERING CHALLENGES SOLVED", bg=C_AMBER_LIGHT, fg=C_AMBER, size=8.0)
    y = 382
    y = draw_bullet_item(
        c,
        60,
        y,
        "Full-Stack Language Migration",
        "Rebuilt 100% of frontend & backend cleanly into HTML, CSS, JavaScript, and Python without losing UI fidelity.",
        392,
        dot_color=C_PURPLE,
        body_size=9.3,
    )
    y = draw_bullet_item(
        c,
        60,
        y,
        "Cold-Boot Environment Recovery",
        "Built scripts/start_server.sh to auto-provision .venv and pip dependencies seamlessly if a fresh container boots.",
        392,
        dot_color=C_EMERALD,
        body_size=9.3,
    )
    draw_bullet_item(
        c,
        60,
        y,
        "Bounded AI Latency (8s Guard)",
        "Configured Gemini HttpOptions(timeout=8000) + graceful offline synthesis so API calls never hang the UI.",
        392,
        dot_color=C_SKY,
        body_size=9.3,
    )

    # Right Card: Key Project Outcomes + Future Scope
    draw_card(c, 490, 198, 428, 240, fill=C_WHITE, stroke=C_BORDER, radius=14)
    draw_pill(c, 508, 408, "OUTCOMES & FUTURE TRENDS", bg=C_EMERALD_SOFT, fg=C_EMERALD, size=8.0)

    # 3 metric tiles
    metrics = [
        ("21 Modules", "Pure ES6+ JS", C_PURPLE),
        ("25+ Routes", "Python Flask API", C_SKY),
        ("13 Pages", "IEEE Paper <4% Sim.", C_EMERALD),
    ]
    mx = 508
    for val, lbl, col in metrics:
        draw_card(c, mx, 336, 124, 54, fill=colors.HexColor("#F8FAFC"), stroke=C_BORDER, radius=10)
        c.setFont("Helvetica-Bold", 14)
        c.setFillColor(col)
        c.drawCentredString(mx + 62, 366, val)
        c.setFont("Helvetica", 8.5)
        c.setFillColor(C_MUTED)
        c.drawCentredString(mx + 62, 348, lbl)
        mx += 134

    y2 = 312
    y2 = draw_bullet_item(
        c,
        508,
        y2,
        "Future: On-Device Edge Whisper & E2EE",
        "Run quantized speech transcription directly via WebGPU and add client-side zero-knowledge encryption keys.",
        392,
        dot_color=C_PURPLE,
        body_size=9.3,
    )
    draw_bullet_item(
        c,
        508,
        y2,
        "Prompt Engineering Takeaway",
        "Clear constraints, explicit schemas, and failure fallbacks turn prompts into reliable software engineering artifacts.",
        392,
        dot_color=C_PINK,
        body_size=9.3,
    )

    # Closing Dark Plum Thank You Banner
    draw_card(c, 42, 44, 876, 134, fill=C_DARK_PLUM, stroke=C_PURPLE, radius=16, stroke_w=1.5)
    c.setFont("Helvetica-Bold", 28)
    c.setFillColor(C_WHITE)
    c.drawString(72, 128, "Thank You!")
    c.setFont("Helvetica", 13)
    c.setFillColor(colors.HexColor("#E9D5FF"))
    c.drawString(72, 102, "Thank you for exploring BORAH — my Prompt Engineering & Python/Web Sanctuary Project.")
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor("#FDE68A"))
    c.drawString(72, 72, "Presented by: Nivetha M   •   Questions & Discussion Welcome")

    c.setFont("Helvetica-Bold", 9.5)
    c.setFillColor(colors.HexColor("#C4B5FD"))
    c.drawRightString(SLIDE_W - 72, 72, "Slide 9 / 9")


def build_presentation() -> None:
    root = Path(__file__).resolve().parent.parent
    screens_dir = root / "msc_docs" / "screens"
    public_pdf = root / "public" / "BORAH_Project_Presentation.pdf"
    msc_pdf = root / "msc_docs" / "BORAH_Project_Presentation.pdf"

    public_pdf.parent.mkdir(parents=True, exist_ok=True)
    msc_pdf.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(public_pdf), pagesize=(SLIDE_W, SLIDE_H))
    c.setTitle("BORAH Project Presentation - Presented by Nivetha M")
    c.setAuthor("Nivetha M")
    c.setSubject("Prompt Engineering Project Presentation: BORAH Digital Sanctuary")

    slides = [
        lambda: slide_1_title(c),
        lambda: slide_2_why(c),
        lambda: slide_3_prompt_engineering(c),
        lambda: slide_4_how_architecture(c),
        lambda: slide_5_languages_libraries(c),
        lambda: slide_6_features(c),
        lambda: slide_7_output_dashboard(c, screens_dir),
        lambda: slide_8_output_journal(c, screens_dir),
        lambda: slide_9_outcomes_thankyou(c),
    ]

    for idx, fn in enumerate(slides):
        fn()
        if idx < len(slides) - 1:
            c.showPage()

    c.save()

    # Copy exact PDF bytes to msc_docs directory
    msc_pdf.write_bytes(public_pdf.read_bytes())
    print(f"Generated 9-slide presentation PDF -> {public_pdf} ({public_pdf.stat().st_size} bytes)")
    print(f"Copied presentation PDF -> {msc_pdf}")


if __name__ == "__main__":
    build_presentation()
