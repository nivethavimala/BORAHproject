#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_ROOT"

ARCH="$(uname -m)"
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  PY_STANDALONE_URL="https://github.com/astral-sh/python-build-standalone/releases/download/20261123/cpython-3.11.18%2B20261123-aarch64-unknown-linux-gnu-install_only_stripped.tar.gz"
else
  PY_STANDALONE_URL="https://github.com/astral-sh/python-build-standalone/releases/download/20261123/cpython-3.11.18%2B20261123-x86_64-unknown-linux-gnu-install_only_stripped.tar.gz"
fi

CORE_IMPORT_CHECK="import flask, flask_sqlalchemy, flask_jwt_extended, flask_cors, sqlalchemy, jwt, bcrypt, dotenv"
CORE_PKGS=(
  flask
  flask-sqlalchemy
  flask-jwt-extended
  flask-cors
  pyjwt
  bcrypt
  python-dotenv
)
EXTRAS_IMPORT_CHECK="import reportlab, openpyxl, PIL, google.genai, docx"

download_file() {
  local url="$1"
  local dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 2 --connect-timeout 15 --max-time 120 "$url" -o "$dest"
  else
    node -e "
      const fs = require('fs');
      (async () => {
        const res = await fetch(process.argv[1]);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(process.argv[2], buf);
      })().catch((e) => { console.error(e); process.exit(1); });
    " "$url" "$dest"
  fi
}

unpack_vendor_wheels() {
  local py_bin="$1"
  local site_packages="$2"
  "$py_bin" - "$APP_ROOT/backend/vendor_wheels" "$site_packages" << 'PY'
import glob, os, sys, zipfile
wheel_dir, site_packages = sys.argv[1], sys.argv[2]
os.makedirs(site_packages, exist_ok=True)
for whl in sorted(glob.glob(os.path.join(wheel_dir, "*.whl"))):
    with zipfile.ZipFile(whl, "r") as zf:
        zf.extractall(site_packages)
PY
}

ensure_pip() {
  local py_bin="$1"
  if "$py_bin" -m pip --version >/dev/null 2>&1; then
    return 0
  fi
  local tmp_get_pip="/tmp/get-pip-$$.py"
  download_file "https://bootstrap.pypa.io/get-pip.py" "$tmp_get_pip"
  "$py_bin" "$tmp_get_pip" --no-warn-script-location -q
  rm -f "$tmp_get_pip"
}

ensure_core_packages() {
  local py_bin="$1"
  local site_pkg="$2"
  if "$py_bin" -c "$CORE_IMPORT_CHECK" 2>/dev/null; then
    return 0
  fi

  if [ -d "$APP_ROOT/backend/vendor_wheels" ] && \
     [ "$(uname -s)" = "Linux" ] && [ "$ARCH" = "x86_64" ] && \
     "$py_bin" -c "import sys; assert sys.version_info[:2] == (3, 11)" 2>/dev/null; then
    unpack_vendor_wheels "$py_bin" "$site_pkg" || true
  fi

  if ! "$py_bin" -c "$CORE_IMPORT_CHECK" 2>/dev/null; then
    echo "Installing required Python packages..."
    if [ -f "$APP_ROOT/scripts/bootstrap_wheels.py" ] && [ "$(uname -s)" = "Linux" ]; then
      "$py_bin" "$APP_ROOT/scripts/bootstrap_wheels.py" "$site_pkg" || true
    fi
  fi

  if ! "$py_bin" -c "$CORE_IMPORT_CHECK" 2>/dev/null; then
    ensure_pip "$py_bin"
    "$py_bin" -m pip install --root-user-action=ignore --no-cache-dir -q "${CORE_PKGS[@]}"
  fi

  "$py_bin" -c "$CORE_IMPORT_CHECK"
}

install_extras_async() {
  local py_bin="$1"
  local app_root="$2"
  if ! "$py_bin" -c "$EXTRAS_IMPORT_CHECK" 2>/dev/null; then
    setsid bash -c '
      PY_BIN="$1"
      APP_ROOT="$2"
      if ! "$PY_BIN" -m pip --version >/dev/null 2>&1; then
        if command -v curl >/dev/null 2>&1; then
          curl -fsSL --connect-timeout 10 --max-time 30 https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py
        else
          node -e "
            const fs = require(\"fs\");
            fetch(\"https://bootstrap.pypa.io/get-pip.py\").then(async r => {
              if (!r.ok) throw new Error(\"HTTP \" + r.status);
              fs.writeFileSync(\"/tmp/get-pip.py\", Buffer.from(await r.arrayBuffer()));
            });
          "
        fi
        "$PY_BIN" /tmp/get-pip.py --no-warn-script-location -q && rm -f /tmp/get-pip.py
      fi
      if "$PY_BIN" -m pip --version >/dev/null 2>&1; then
        "$PY_BIN" -m pip install --root-user-action=ignore --no-cache-dir -q -r "$APP_ROOT/requirements.txt"
      fi
    ' _ "$py_bin" "$app_root" </dev/null >/tmp/borah_pip_extras.log 2>&1 &
  fi
}

mkdir -p "$APP_ROOT/database/uploads" 2>/dev/null || true

# 1. Fast path: self-contained portable Python baked into .py311 (Cloud Run production & warmed dev)
if [ -x "$APP_ROOT/.py311/bin/python3" ] && "$APP_ROOT/.py311/bin/python3" -c "$CORE_IMPORT_CHECK" 2>/dev/null; then
  PY_BIN="$APP_ROOT/.py311/bin/python3"
  install_extras_async "$PY_BIN" "$APP_ROOT"
  exec "$PY_BIN" app.py
fi

# 2. Fast path: existing .venv (warmed dev container)
if [ -x "$APP_ROOT/.venv/bin/python" ] && "$APP_ROOT/.venv/bin/python" -c "$CORE_IMPORT_CHECK" 2>/dev/null; then
  PY_BIN="$APP_ROOT/.venv/bin/python"
  install_extras_async "$PY_BIN" "$APP_ROOT"
  exec "$PY_BIN" app.py
fi

# 3. Dev container path: host python3 is available -> bootstrap .venv and install all required packages
SYS_PY=""
for cand in "$(command -v python3 2>/dev/null || true)" /usr/bin/python3.11 /usr/bin/python3 /usr/local/bin/python3; do
  if [ -n "$cand" ] && [ -x "$cand" ]; then
    SYS_PY="$cand"
    break
  fi
done

if [ -n "$SYS_PY" ]; then
  if [ -w "$APP_ROOT" ]; then
    VENV_DIR="$APP_ROOT/.venv"
  else
    VENV_DIR="/tmp/borah_venv"
  fi

  if [ ! -x "$VENV_DIR/bin/python" ]; then
    echo "Bootstrapping core Python runtime for BORAH in $VENV_DIR..."
    rm -rf "$VENV_DIR"
    "$SYS_PY" -m venv --without-pip "$VENV_DIR"
  fi

  PY_BIN="$VENV_DIR/bin/python"
  SITE_PKG="$("$PY_BIN" -c 'import site; print(site.getsitepackages()[0])')"
  ensure_core_packages "$PY_BIN" "$SITE_PKG"
  install_extras_async "$PY_BIN" "$APP_ROOT"
  exec "$PY_BIN" app.py
fi

# 4. Minimal container fallback (e.g., Cloud Run Node.js image with no system python3):
#    Install portable self-contained Python 3.11 + ensure all synchronous runtime dependencies.
if [ -x "$APP_ROOT/.py311/bin/python3" ] && [ -w "$APP_ROOT/.py311" ]; then
  PY_DIR="$APP_ROOT/.py311"
elif [ -w "$APP_ROOT" ]; then
  PY_DIR="$APP_ROOT/.py311"
else
  PY_DIR="/tmp/borah_py311"
fi

if [ ! -x "$PY_DIR/bin/python3" ]; then
  echo "System python3 not found; bootstrapping portable Python 3.11 in $PY_DIR..."
  TMP_DIR="${PY_DIR}.tmp.$$"
  TMP_TGZ="/tmp/borah_py311_$$.tar.gz"
  rm -rf "$TMP_DIR" "$PY_DIR"
  mkdir -p "$TMP_DIR"
  download_file "$PY_STANDALONE_URL" "$TMP_TGZ"
  tar -xzf "$TMP_TGZ" --strip-components=1 -C "$TMP_DIR"
  rm -f "$TMP_TGZ"
  mv "$TMP_DIR" "$PY_DIR"
fi

PY_BIN="$PY_DIR/bin/python3"
SITE_PKG="$("$PY_BIN" -c 'import site; print(site.getsitepackages()[0])')"
ensure_core_packages "$PY_BIN" "$SITE_PKG"
install_extras_async "$PY_BIN" "$APP_ROOT"
exec "$PY_BIN" app.py
