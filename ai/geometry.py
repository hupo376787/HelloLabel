from __future__ import annotations

import math
from typing import Any

import cv2
import numpy as np


def largest_contour(mask: np.ndarray) -> np.ndarray:
    """Return the largest external contour from a boolean/0-1/0-255 mask."""
    arr = np.asarray(mask)
    if arr.ndim > 2:
        arr = np.squeeze(arr)
    if arr.ndim != 2:
        raise ValueError(f"mask must be 2D, got {arr.shape}")
    bin_mask = (arr > 0).astype(np.uint8) * 255
    contours, _ = cv2.findContours(bin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        raise ValueError("AI did not produce a usable mask")
    contour = max(contours, key=cv2.contourArea)
    if cv2.contourArea(contour) <= 0:
        raise ValueError("AI mask area is zero")
    return contour


def _round_points(points: np.ndarray | list[list[float]]) -> list[list[float]]:
    arr = np.asarray(points, dtype=np.float64).reshape(-1, 2)
    return [[round(float(x), 3), round(float(y), 3)] for x, y in arr]


def contour_to_shape(contour: np.ndarray, output_shape: str) -> dict[str, Any]:
    output_shape = (output_shape or "polygon").strip().lower()

    if output_shape == "polygon":
        perimeter = cv2.arcLength(contour, True)
        # Retain detail without exploding Labelme JSON size for dense masks.
        epsilon = max(0.45, perimeter * 0.0012)
        approx = cv2.approxPolyDP(contour, epsilon, True).reshape(-1, 2)
        if len(approx) < 3:
            approx = contour.reshape(-1, 2)
        # Hard cap for pathological masks while preserving shape fidelity.
        if len(approx) > 1600:
            stride = int(math.ceil(len(approx) / 1600))
            approx = approx[::stride]
        return {"shape_type": "polygon", "points": _round_points(approx)}

    if output_shape == "rectangle":
        x, y, w, h = cv2.boundingRect(contour)
        return {
            "shape_type": "rectangle",
            "points": [[float(x), float(y)], [float(x + w), float(y + h)]],
        }

    if output_shape in {"oriented_rectangle", "obb", "oriented-rectangle"}:
        rect = cv2.minAreaRect(contour)
        pts = cv2.boxPoints(rect)
        return {"shape_type": "oriented_rectangle", "points": _round_points(pts)}

    if output_shape == "circle":
        (cx, cy), radius = cv2.minEnclosingCircle(contour)
        return {
            "shape_type": "circle",
            "points": [
                [round(float(cx), 3), round(float(cy), 3)],
                [round(float(cx + radius), 3), round(float(cy), 3)],
            ],
        }

    raise ValueError(f"Unsupported output shape: {output_shape}")


def mask_to_shape(mask: np.ndarray, output_shape: str) -> dict[str, Any]:
    return contour_to_shape(largest_contour(mask), output_shape)


def box_to_shape(xyxy: list[float] | np.ndarray) -> dict[str, Any]:
    x1, y1, x2, y2 = [float(v) for v in np.asarray(xyxy).reshape(-1)[:4]]
    return {
        "shape_type": "rectangle",
        "points": [[round(x1, 3), round(y1, 3)], [round(x2, 3), round(y2, 3)]],
    }
