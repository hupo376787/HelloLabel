# Browser AI models

HelloLabel 1.5 does not install or store Python/PyTorch model files in this repository or on the HelloLabel web server.

The Web and Desktop editions use the same browser-local AI runtime:

- YOLO11 Detect / Seg models are downloaded by the user's Chromium browser when first used.
- SAM2.1 Tiny (`onnx-community/sam2.1-hiera-tiny-ONNX`) is downloaded by Transformers.js when first used.
- WebGPU is preferred when available; supported runtimes fall back to CPU/WASM.
- Browser/model caches are kept on the user's device and reused on later runs.
- Source images and annotation JSON are read locally and are never uploaded to a HelloLabel backend.

This directory is documentation-only in v1.5. Third-party model files and runtimes remain subject to their respective upstream licenses.
