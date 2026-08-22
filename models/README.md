# HelloLabel models

Model files are intentionally not bundled in the source archive.

Default configuration (`../config.json`):

- SAM: `models/sam_vit_b_01ec64.pth`
- SAM2: Hugging Face model `facebook/sam2.1-hiera-small`
- SAM3: official Hugging Face checkpoint, downloaded by the SAM3 package
- YOLO11 Detect: `yolo11n.pt`
- YOLO11 Seg: `yolo11n-seg.pt`
- YOLO-World: `yolov8s-world.pt`

Ultralytics/Hugging Face models may download on first use. You can replace any
entry in `config.json` with a local path/model ID without changing the frontend.
