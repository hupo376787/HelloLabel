# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path
import sys

ROOT = Path(SPECPATH).resolve().parent

# Desktop release builds intentionally contain only the base editor/runtime.
# AI frameworks and model weights are NOT bundled. This keeps Windows/macOS/
# Linux installers predictable and much smaller. AI remains available in the
# source/web environment through install_ai.bat / install_ai.sh.
datas = [
    (str(ROOT / 'static'), 'static'),
    (str(ROOT / 'config.json'), '.'),
]

hiddenimports = [
    'uvicorn.logging',
    'uvicorn.loops.auto',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan.on',
    'multipart',
]

excluded_ai = [
    'torch',
    'torchvision',
    'ultralytics',
    'segment_anything',
    'sam2',
    'sam3',
    'huggingface_hub',
]

backend_icon = None
if sys.platform.startswith('win'):
    backend_icon = str(ROOT / 'desktop' / 'build' / 'icon.ico')
elif sys.platform == 'darwin':
    backend_icon = str(ROOT / 'desktop' / 'build' / 'icon.icns')

a = Analysis(
    [str(ROOT / 'run.py')],
    pathex=[str(ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excluded_ai,
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='HelloLabelServer',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    icon=backend_icon,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='HelloLabelServer',
)
