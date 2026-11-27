import concurrent.futures
import io
import json
import os
import platform
import sys
import urllib.request
import zipfile
from typing import Any, Dict, List, Optional

CORE_WHEELS = [
    'flask',
    'werkzeug',
    'jinja2',
    'markupsafe',
    'itsdangerous',
    'click',
    'blinker',
    'flask-sqlalchemy',
    'sqlalchemy',
    'typing-extensions',
    'flask-jwt-extended',
    'flask-cors',
    'pyjwt',
    'bcrypt',
    'python-dotenv',
]


def _pick_wheel_url(files: List[Dict[str, Any]], py_tag: str, arch_tag: str) -> Optional[str]:
    best_url: Optional[str] = None
    best_score = -1
    abi3_prefixes = ('cp38-abi3', 'cp39-abi3', 'cp310-abi3', 'cp311-abi3')

    for f in files:
        if f.get('packagetype') != 'bdist_wheel' or f.get('yanked'):
            continue
        fn = str(f.get('filename') or '')
        if not fn.endswith('.whl'):
            continue

        score = -1
        if 'none-any.whl' in fn:
            score = 100
        elif 'manylinux' in fn and arch_tag in fn:
            if f'{py_tag}-{py_tag}' in fn:
                score = 95
            elif any(tag in fn for tag in abi3_prefixes):
                score = 90

        if score > best_score:
            best_score = score
            best_url = str(f.get('url') or '')

    return best_url or None


def _install_package(pkg: str, site_packages: str, py_tag: str, arch_tag: str) -> str:
    meta_req = urllib.request.Request(
        f'https://pypi.org/pypi/{pkg}/json',
        headers={'User-Agent': 'borah-bootstrap/1.0'},
    )
    with urllib.request.urlopen(meta_req, timeout=12) as resp:
        data = json.loads(resp.read().decode('utf-8'))

    url = _pick_wheel_url(data.get('urls') or [], py_tag, arch_tag)
    if not url:
        raise RuntimeError(f'No compatible wheel found for {pkg} ({py_tag}, {arch_tag})')

    whl_req = urllib.request.Request(url, headers={'User-Agent': 'borah-bootstrap/1.0'})
    with urllib.request.urlopen(whl_req, timeout=25) as resp:
        raw = resp.read()

    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        zf.extractall(site_packages)

    return pkg


def main() -> int:
    if len(sys.argv) < 2:
        print('Usage: bootstrap_wheels.py <site_packages_dir>', file=sys.stderr)
        return 2

    site_packages = os.path.abspath(sys.argv[1])
    os.makedirs(site_packages, exist_ok=True)

    py_tag = f'cp{sys.version_info.major}{sys.version_info.minor}'
    machine = platform.machine().lower()
    arch_tag = 'aarch64' if machine in ('aarch64', 'arm64') else 'x86_64'

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures = [
            pool.submit(_install_package, pkg, site_packages, py_tag, arch_tag)
            for pkg in CORE_WHEELS
        ]
        for fut in concurrent.futures.as_completed(futures):
            fut.result()

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
