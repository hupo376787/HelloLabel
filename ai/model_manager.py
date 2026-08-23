from __future__ import annotations

import contextlib
import hashlib
import json
import os
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image

from .geometry import box_to_shape, mask_to_shape


@dataclass
class ModelStatus:
    id: str
    name: str
    family: str
    installed: bool
    loaded: bool
    detail: str = ""


class ModelManager:
    """Lazy AI model loader for HelloLabel.

    The editor is useful without AI dependencies. Model packages and weights are
    intentionally imported lazily, so the base editor can start without AI packages.
    """

    def __init__(self, base_dir: Path, config: dict[str, Any], model_dir: Path | None = None):
        self.base_dir = base_dir
        self.model_dir = (model_dir or (base_dir / "models")).resolve()
        self.config = config
        self.models_cfg = config.get("models", {})
        self._models: dict[str, Any] = {}
        self._image_digest: dict[str, str] = {}
        self._locks: dict[str, threading.RLock] = {}

    def _lock(self, model_id: str) -> threading.RLock:
        return self._locks.setdefault(model_id, threading.RLock())

    @staticmethod
    def _device() -> str:
        try:
            import torch

            return "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            return "cpu"

    def statuses(self) -> list[dict[str, Any]]:
        result: list[ModelStatus] = []
        specs = [
            ("sam", "SAM", "sam"),
            ("sam2", "SAM2", "sam"),
            ("sam3", "SAM3", "sam"),
            ("yolo11-detect", "YOLO11 Detect", "yolo"),
            ("yolo11-seg", "YOLO11 Seg", "yolo"),
            ("yolo-world", "YOLO-World", "yolo"),
        ]
        for model_id, name, family in specs:
            installed, detail = self._probe_install(model_id)
            result.append(
                ModelStatus(
                    id=model_id,
                    name=name,
                    family=family,
                    installed=installed,
                    loaded=model_id in self._models,
                    detail=detail,
                )
            )
        return [x.__dict__ for x in result]

    def _probe_install(self, model_id: str) -> tuple[bool, str]:
        try:
            if model_id == "sam":
                import segment_anything  # noqa: F401

                ckpt = self._resolve_path(self.models_cfg.get("sam", {}).get("checkpoint", ""))
                if not ckpt or not ckpt.exists():
                    return False, "segment-anything installed, but SAM checkpoint is missing"
                return True, str(ckpt)
            if model_id == "sam2":
                import sam2  # noqa: F401

                return True, self.models_cfg.get("sam2", {}).get("model_id", "facebook/sam2.1-hiera-small")
            if model_id == "sam3":
                import sam3  # noqa: F401

                return True, "SAM3 package available; Hugging Face authentication may still be required"
            if model_id.startswith("yolo"):
                import ultralytics  # noqa: F401

                return True, self.models_cfg.get(model_id.replace("-", "_"), {}).get("weights", "")
        except Exception as exc:
            return False, f"{type(exc).__name__}: {exc}"
        return False, "Unknown model"

    def _resolve_path(self, value: str | None) -> Path | None:
        if not value:
            return None
        path = Path(value)
        if path.is_absolute():
            return path

        # Desktop packages live under Program Files / an app bundle and are not a
        # suitable place for downloaded model weights. Resolve model-relative
        # paths into HELLOLABEL_MODEL_DIR while source mode keeps the historical
        # project-relative behavior.
        desktop_model_dir = os.environ.get("HELLOLABEL_MODEL_DIR", "").strip()
        if desktop_model_dir:
            parts = path.parts
            if parts and parts[0].lower() == "models":
                return self.model_dir.joinpath(*parts[1:])
            if len(parts) == 1:
                return self.model_dir / path
        return self.base_dir / path

    @staticmethod
    def decode_image(data: bytes) -> tuple[np.ndarray, np.ndarray]:
        arr = np.frombuffer(data, np.uint8)
        bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if bgr is None:
            # Pillow gives better TIFF compatibility than cv2 on some builds.
            image = Image.open(__import__("io").BytesIO(data)).convert("RGB")
            rgb = np.asarray(image)
            bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        else:
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        return bgr, rgb

    def _ensure_sam_image(self, model_id: str, predictor: Any, rgb: np.ndarray, image_bytes: bytes) -> None:
        digest = hashlib.sha1(image_bytes).hexdigest()
        if self._image_digest.get(model_id) == digest:
            return
        predictor.set_image(rgb)
        self._image_digest[model_id] = digest

    def _load_sam(self):
        cfg = self.models_cfg.get("sam", {})
        checkpoint = self._resolve_path(cfg.get("checkpoint", "models/sam_vit_b_01ec64.pth"))
        if not checkpoint or not checkpoint.exists():
            raise RuntimeError(
                "SAM checkpoint not found. Put a checkpoint in models/ and set models.sam.checkpoint in config.json."
            )
        model_type = cfg.get("model_type", "vit_b")
        from segment_anything import SamPredictor, sam_model_registry

        sam = sam_model_registry[model_type](checkpoint=str(checkpoint))
        sam.to(device=self._device())
        return SamPredictor(sam)

    def _load_sam2(self):
        cfg = self.models_cfg.get("sam2", {})
        from sam2.sam2_image_predictor import SAM2ImagePredictor

        checkpoint = self._resolve_path(cfg.get("checkpoint", ""))
        model_cfg = cfg.get("config", "")
        if checkpoint and checkpoint.exists() and model_cfg:
            from sam2.build_sam import build_sam2

            model = build_sam2(model_cfg, str(checkpoint), device=self._device())
            return SAM2ImagePredictor(model)
        model_id = cfg.get("model_id", "facebook/sam2.1-hiera-small")
        return SAM2ImagePredictor.from_pretrained(model_id, device=self._device())

    def _load_sam3(self):
        cfg = self.models_cfg.get("sam3", {})
        from sam3.model_builder import build_sam3_image_model

        checkpoint = self._resolve_path(cfg.get("checkpoint", ""))
        kwargs: dict[str, Any] = {
            "device": self._device(),
            "eval_mode": True,
            "enable_segmentation": True,
            "enable_inst_interactivity": True,
        }
        if checkpoint and checkpoint.exists():
            kwargs.update(checkpoint_path=str(checkpoint), load_from_HF=False)
        else:
            kwargs.update(load_from_HF=True)
        model = build_sam3_image_model(**kwargs)
        predictor = model.inst_interactive_predictor
        if predictor is None:
            raise RuntimeError("SAM3 interactive predictor was not built")
        return predictor

    def _get_sam_predictor(self, model_id: str):
        if model_id not in {"sam", "sam2", "sam3"}:
            raise ValueError(f"Unsupported SAM model: {model_id}")
        if model_id not in self._models:
            loader = {"sam": self._load_sam, "sam2": self._load_sam2, "sam3": self._load_sam3}[model_id]
            self._models[model_id] = loader()
        return self._models[model_id]

    def predict_sam(
        self,
        model_id: str,
        image_bytes: bytes,
        points: list[list[float]],
        point_labels: list[int],
        box: list[float] | None,
        output_shape: str,
    ) -> dict[str, Any]:
        with self._lock(model_id):
            _bgr, rgb = self.decode_image(image_bytes)
            predictor = self._get_sam_predictor(model_id)

            # SAM3 recommends BF16 autocast on CUDA. It is harmless to omit on CPU.
            autocast_ctx = contextlib.nullcontext()
            if model_id == "sam3" and self._device() == "cuda":
                try:
                    import torch

                    autocast_ctx = torch.autocast(device_type="cuda", dtype=torch.bfloat16)
                except Exception:
                    pass

            with autocast_ctx:
                self._ensure_sam_image(model_id, predictor, rgb, image_bytes)
                pcoords = np.asarray(points, dtype=np.float32) if points else None
                plabels = np.asarray(point_labels, dtype=np.int32) if points else None
                bbox = np.asarray(box, dtype=np.float32) if box else None
                masks, scores, _ = predictor.predict(
                    point_coords=pcoords,
                    point_labels=plabels,
                    box=bbox,
                    multimask_output=True,
                )

            masks = np.asarray(masks)
            scores = np.asarray(scores).reshape(-1)
            if masks.ndim == 2:
                masks = masks[None, ...]
            if len(scores) and len(scores) == len(masks):
                idx = int(np.argmax(scores))
                score = float(scores[idx])
            else:
                idx = 0
                score = float(scores[0]) if len(scores) else 0.0
            shape = mask_to_shape(masks[idx], output_shape)
            shape["score"] = round(score, 6)
            shape["model"] = model_id
            return shape

    def _load_yolo(self, model_id: str):
        from ultralytics import YOLO

        cfg_key = model_id.replace("-", "_")
        cfg = self.models_cfg.get(cfg_key, {})
        defaults = {
            "yolo11-detect": "yolo11n.pt",
            "yolo11-seg": "yolo11n-seg.pt",
            "yolo-world": "yolov8s-world.pt",
        }
        weights = cfg.get("weights", defaults[model_id])
        local = self._resolve_path(weights)
        source = str(local) if local and local.exists() else weights
        return YOLO(source)

    def _get_yolo(self, model_id: str):
        if model_id not in {"yolo11-detect", "yolo11-seg", "yolo-world"}:
            raise ValueError(f"Unsupported YOLO model: {model_id}")
        if model_id not in self._models:
            self._models[model_id] = self._load_yolo(model_id)
        return self._models[model_id]

    def predict_yolo(
        self,
        model_id: str,
        image_bytes: bytes,
        text_classes: list[str],
        conf: float,
        iou: float,
        output_shape: str,
    ) -> list[dict[str, Any]]:
        with self._lock(model_id):
            _bgr, rgb = self.decode_image(image_bytes)
            model = self._get_yolo(model_id)
            if model_id == "yolo-world":
                if not text_classes:
                    raise ValueError("YOLO-World requires at least one text class")
                model.set_classes(text_classes)

            results = model.predict(source=rgb, conf=float(conf), iou=float(iou), verbose=False)
            if not results:
                return []
            result = results[0]
            names = result.names or {}
            boxes = result.boxes
            masks = result.masks
            mask_polys = list(masks.xy) if masks is not None and getattr(masks, "xy", None) is not None else []

            out: list[dict[str, Any]] = []
            if boxes is None:
                return out
            xyxy = boxes.xyxy.detach().cpu().numpy()
            classes = boxes.cls.detach().cpu().numpy().astype(int)
            scores = boxes.conf.detach().cpu().numpy()

            requested_labels = {x.strip().casefold() for x in text_classes if x.strip()}

            for idx, box in enumerate(xyxy):
                cls_id = int(classes[idx])
                label = str(names.get(cls_id, cls_id) if isinstance(names, dict) else names[cls_id])
                # YOLO11 Detect/Seg have a fixed class vocabulary. When the text box
                # is non-empty, treat it as an optional exact class-name filter.
                # YOLO-World instead uses text_classes above to define the classes.
                if model_id != "yolo-world" and requested_labels and label.casefold() not in requested_labels:
                    continue
                if model_id == "yolo11-seg" and idx < len(mask_polys) and len(mask_polys[idx]) >= 3:
                    poly = np.asarray(mask_polys[idx], dtype=np.float32)
                    if output_shape == "polygon":
                        shape = {
                            "shape_type": "polygon",
                            "points": [[round(float(x), 3), round(float(y), 3)] for x, y in poly],
                        }
                    else:
                        canvas = np.zeros(rgb.shape[:2], dtype=np.uint8)
                        cv2.fillPoly(canvas, [np.round(poly).astype(np.int32)], 1)
                        shape = mask_to_shape(canvas, output_shape)
                else:
                    shape = box_to_shape(box)
                shape.update(label=label, score=round(float(scores[idx]), 6), model=model_id)
                out.append(shape)
            return out
