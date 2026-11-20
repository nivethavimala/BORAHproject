#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_ROOT"

if [ ! -x ".venv/bin/python" ] || ! .venv/bin/python -c "import flask, jwt, bcrypt, dotenv, google.genai, reportlab, docx" 2>/dev/null; then
  echo "Setting up Python virtual environment and dependencies..."
  rm -rf .venv
  python3 -m venv --without-pip .venv
  curl -fsSL https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py
  .venv/bin/python /tmp/get-pip.py
  rm -f /tmp/get-pip.py
  .venv/bin/pip install --no-cache-dir -r requirements.txt
fi

exec .venv/bin/python app.py
