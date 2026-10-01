"use strict";

window.HelloLabelConstants = {
  IMAGE_EXTS: [".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"],
  SHAPE_TYPES: new Set([
    "polygon",
    "rectangle",
    "oriented_rectangle",
    "circle",
    "point",
    "line",
    "linestrip"
  ]),
  HIT_GRID: 256,
  INSTANCE_ROW_H: 34,
  INSTANCE_OVERSCAN: 8,
  CANVAS_MAX_DPR: 2,
  LABEL_ATLAS_W: 2048,
  OUTLINE_PX: 2.4,
  POINT_PX: 4.2,
  LABEL_FONT_PX: 13
};
