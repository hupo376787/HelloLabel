"use strict";

(() => {
  let context = null;

  function configure(nextContext) {
    context = nextContext || null;
    return api;
  }

  function roundCoord(value) {
    return Math.round(Number(value) * 1000) / 1000;
  }

  function makeShape(label, type, points) {
    return {
      label,
      points:points.map(point => [roundCoord(point[0]), roundCoord(point[1])]),
      group_id:null,
      description:"",
      shape_type:type,
      flags:{},
      mask:null
    };
  }

  async function commitGeometry(type, points, meta = { source:"manual" }) {
    const {
      state, resolveNewShapeLabel, setStatus, t,
      pushHistory, stableColor, uid,
      markDirty, shapeTypeText, renderAll, selectId
    } = context;

    if (!state.data || !points?.length) return;

    const label = await resolveNewShapeLabel();
    if (!label) {
      setStatus(t("newAnnotationCancelled"));
      return;
    }

    pushHistory();
    if (!state.data.hellolabel.labels[label]) {
      state.data.hellolabel.labels[label] = { color:stableColor(label) };
    }

    state.activeLabel = label;
    const id = uid();
    const shape = makeShape(label, type, points);
    state.data.shapes.push(shape);
    state.runtimeIds.push(id);
    state.runtimeMeta[id] = { ...meta };

    markDirty(t("annotationAdded", { type:shapeTypeText(type) }));
    renderAll();
    selectId(id, { scroll:true });
  }

  function cancelDrawing(status = true) {
    const { state, renderDrawingOverlay, setStatus, t } = context;
    state.drawing = null;
    renderDrawingOverlay();
    window.HelloLabelDrawingState?.idle?.();
    if (status) setStatus(t("drawingCancelled"));
  }

  async function finishSequenceDrawing() {
    const { state, setStatus, t, renderDrawingOverlay } = context;
    const drawing = state.drawing;
    if (!drawing) return;

    const sourceType = drawing.type;
    let type = drawing.type;
    let points = drawing.points || [];

    if (type === "pen") {
      points = window.HelloLabelBrushTool.finalize(points, state.scale);
      type = "polygon";
    }
    if (type === "polygon" && points.length < 3) {
      setStatus(t("polygonMin"), true);
      return;
    }
    if (type === "linestrip" && points.length < 2) {
      setStatus(t("linestripMin"), true);
      return;
    }
    if (type === "line" && points.length < 2) return;
    if (type === "oriented_rectangle" && points.length < 4) return;

    state.drawing = null;
    renderDrawingOverlay();

    if (sourceType === "pen") window.HelloLabelBrushTool.completed();
    else if (sourceType === "polygon" || sourceType === "linestrip") {
      window.HelloLabelPolygonTool.completed(sourceType, points.length);
    } else if (sourceType === "oriented_rectangle") {
      window.HelloLabelObbTool.completed();
    }

    await commitGeometry(type, points);
  }

  const api = {
    configure,
    roundCoord,
    makeShape,
    commitGeometry,
    cancelDrawing,
    finishSequenceDrawing
  };

  window.HelloLabelAnnotationCommit = api;
})();
