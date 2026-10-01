"use strict";

window.HelloLabelWebGL.configure({
  state,els,setStatus,t,CANVAS_MAX_DPR,OUTLINE_PX,POINT_PX
});

window.HelloLabelRenderCache.configure({
  state,HIT_GRID,LABEL_FONT_PX,LABEL_ATLAS_W,shapeIds,shapeBounds,initRenderer,
  hexToRgba,labelColor,renderVertices,isClosedType,shapeAnchor,els
});

window.HelloLabelViewportRenderer.configure({
  state,els,clamp,OUTLINE_PX,POINT_PX,LABEL_FONT_PX,resizeOverlay,labelColor,
  renderVertices,isClosedType,shapeAnchor,shouldWebglShowLabels,
  renderSelectedOverlay,renderDrawingOverlay,renderSamOverlay
});

window.HelloLabelSelectionOverlay.configure({
  state,els,imageToViewport,circleInfo,renderVertices,isClosedType,primaryShape,
  controlPointsForShape,shouldWebglShowLabels,shapeAnchor,labelColor
});

window.HelloLabelHitTest.configure({
  state,HIT_GRID,pointerProfile,shapeAtId,shapeHit
});
