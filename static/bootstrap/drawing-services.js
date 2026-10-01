"use strict";

window.HelloLabelAnnotationCommit.configure({
  state,
  resolveNewShapeLabel,
  setStatus,
  t,
  pushHistory,
  stableColor,
  uid,
  markDirty,
  shapeTypeText,
  renderAll,
  selectId,
  renderDrawingOverlay
});

window.HelloLabelDrawingPreview.configure({
  state,
  els,
  makeShape,
  orientedRectFromEdge,
  shapeScreenPath,
  isClosedType,
  imageToViewport
});

window.HelloLabelPolygonTool.configure({state,renderDrawingOverlay,setStatus,t,shapeTypeText});

window.HelloLabelRectangleTool.configure({state,renderDrawingOverlay,setStatus,t,dist2,shapeTypeText,commitGeometry});

window.HelloLabelBrushTool.configure({state,setStatus,t,renderDrawingOverlay,finishSequenceDrawing});

window.HelloLabelObbTool.configure({state,setStatus,t,renderDrawingOverlay,finishSequenceDrawing});

window.HelloLabelCircleTool.configure({state,renderDrawingOverlay,setStatus,t,dist2,shapeTypeText,commitGeometry});

window.HelloLabelLineTool.configure({state,setStatus,t,renderDrawingOverlay,finishSequenceDrawing});

window.HelloLabelPointTool.configure({commitGeometry});

window.HelloLabelDrawingDispatcher.configure({
  state,
  clampImagePoint,
  screenToImage,
  tools:{
    pen:window.HelloLabelBrushTool,
    polygon:window.HelloLabelPolygonTool,
    linestrip:window.HelloLabelPolygonTool,
    rectangle:window.HelloLabelRectangleTool,
    oriented_rectangle:window.HelloLabelObbTool,
    circle:window.HelloLabelCircleTool,
    line:window.HelloLabelLineTool,
    point:window.HelloLabelPointTool
  }
});

window.HelloLabelPointerTool.configure({
  state,els,clampImagePoint,screenToImage,rectCorners,primaryShape,pointerProfile,controlPointsForShape,
  selectId,deepClone,shapeAtId,findShapeAt,clearSelection,pushHistory,buildRenderCache,buildLabelAtlas,
  renderSelectedOverlay,scheduleViewportRender,markDirty,t,renderAll
});

window.HelloLabelEditCommands.configure({
  state,primaryShape,pointSegDistance,pointerProfile,clampImagePoint,screenToImage,
  pushHistory,markDirty,t,renderAll,selectId,shapeIds,clearSelection
});
