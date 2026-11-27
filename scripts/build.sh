#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_ROOT"

PY_STANDALONE_DIR="$APP_ROOT/.py311"
PY_STANDALONE_URL="https://github.com/astral-sh/python-build-standalone/releases/download/20261123/cpython-3.11.18%2B20261123-x86_64-unknown-linux-gnu-install_only_stripped.tar.gz"

ensure_portable_python() {
  if [ -x "$PY_STANDALONE_DIR/bin/python3" ]; then
    return 0
  fi

  echo "Installing self-contained Python 3.11 runtime into .py311..."
  rm -rf "$PY_STANDALONE_DIR"
  mkdir -p "$PY_STANDALONE_DIR"
  local tmp_tgz="/tmp/borah_py311.tar.gz"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --connect-timeout 15 --max-time 120 "$PY_STANDALONE_URL" -o "$tmp_tgz"
  else
    node -e "
      const fs = require('fs');
      (async () => {
        const res = await fetch(process.argv[1]);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(process.argv[2], buf);
      })().catch((e) => { console.error(e); process.exit(1); });
    " "$PY_STANDALONE_URL" "$tmp_tgz"
  fi
  tar -xzf "$tmp_tgz" --strip-components=1 -C "$PY_STANDALONE_DIR"
  rm -f "$tmp_tgz"
}

if [ "$(uname -s)" = "Linux" ] && [ "$(uname -m)" = "x86_64" ]; then
  ensure_portable_python
  PY_BIN="$PY_STANDALONE_DIR/bin/python3"

  if ! "$PY_BIN" -c "import flask, flask_sqlalchemy, flask_jwt_extended, flask_cors, sqlalchemy, jwt, bcrypt, dotenv, google.genai, reportlab, openpyxl, PIL, docx" 2>/dev/null; then
    echo "Installing Python dependencies into .py311 during build..."
    "$PY_BIN" -m pip install --root-user-action=ignore --no-cache-dir -q -r requirements.txt
  fi

  chmod -R a+rX "$PY_STANDALONE_DIR" 2>/dev/null || true
else
  # Non-x86_64 local fallback
  if [ ! -x ".venv/bin/python" ] || ! .venv/bin/python -c "import flask, flask_sqlalchemy, flask_jwt_extended, flask_cors, sqlalchemy, jwt, bcrypt, dotenv, google.genai, reportlab, openpyxl, PIL, docx" 2>/dev/null; then
    echo "Installing Python dependencies into .venv during build..."
    rm -rf .venv
    python3 -m venv --without-pip .venv
    curl -fsSL --connect-timeout 10 --max-time 30 https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py
    .venv/bin/python /tmp/get-pip.py --no-warn-script-location -q
    rm -f /tmp/get-pip.py
    .venv/bin/pip install --no-cache-dir -q -r requirements.txt
  fi
  PY_BIN=".venv/bin/python"
  chmod -R a+rX .venv 2>/dev/null || true
fi

mkdir -p database/uploads 2>/dev/null || true
chmod -R a+rwX database 2>/dev/null || true
"$PY_BIN" -m py_compile app.py backend/*.py backend/routes/*.py backend/exports/*.py scripts/*.py
