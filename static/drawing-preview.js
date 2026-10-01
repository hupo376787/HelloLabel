"use strict";

(() => {
  let context = null;

  function configure(nextContext) {
    context = nextContext || null;
    return api;
  }

  function currentShape() {
    if (!context) return null;

    const {
      state,
      makeShape,
      orientedRectFromEdge
    } = context;

    const drawing = state.drawing;
    if (!drawing) return null;

    if (drawing.type === "pen" || drawing.type === "polygon" || drawing.type === "linestrip") {
      const points = [...(drawing.points || [])];
      if (drawing.cursor && drawing.type !== "pen") points.push(drawing.cursor);

      // Polygon stays open while it is being drawn, so use a linestrip preview.
      return makeShape("", "linestrip", points);
    }

    if (drawing.type === "line") {
      const points = [...(drawing.points || [])];
      if (drawing.cursor) points.push(drawing.cursor);
      return makeShape("", "line", points.slice(0, 2));
    }

    if (drawing.type === "rectangle" && drawing.start && drawing.current) {
      return makeShape("", "rectangle", [drawing.start, drawing.current]);
    }

    if (drawing.type === "circle" && drawing.start && drawing.current) {
      return makeShape("", "circle", [drawing.start, drawing.current]);
    }

    if (drawing.type === "oriented_rectangle") {
      if (drawing.points?.length === 1 && drawing.cursor) {
        return makeShape("", "line", [drawing.points[0], drawing.cursor]);
      }

      if (drawing.points?.length >= 2 && drawing.cursor) {
        return makeShape(
          "",
          "oriented_rectangle",
          orientedRectFromEdge(drawing.points[0], drawing.points[1], drawing.cursor)
        );
      }
    }

    return null;
  }

  function hide() {
    if (!context) return;
    context.els.drawingPath.classList.add("hidden-svg");
    context.els.drawingStart.classList.add("hidden-svg");
  }

  function render() {
    if (!context) return null;

    const {
      state,
      els,
      shapeScreenPath,
      isClosedType,
      imageToViewport
    } = context;

    const shape = currentShape();

    if (!shape?.points?.length) {
      hide();
      window.helloLabelOrientedRectDirection?.render?.();
      return null;
    }

    els.drawingPath.setAttribute("d", shapeScreenPath(shape));
    els.drawingPath.style.fill = isClosedType(shape.shape_type) ? "" : "none";
    els.drawingPath.classList.remove("hidden-svg");

    const first = shape.points[0]
      ? imageToViewport(...shape.points[0])
      : null;

    const showStart = first && (
      state.drawing?.type === "pen" ||
      state.drawing?.type === "polygon" ||
      state.drawing?.type === "linestrip"
    );

    if (showStart) {
      els.drawingStart.setAttribute("cx", first[0]);
      els.drawingStart.setAttribute("cy", first[1]);
      els.drawingStart.classList.remove("hidden-svg");
    } else {
      els.drawingStart.classList.add("hidden-svg");
    }

    window.helloLabelOrientedRectDirection?.render?.();
    return shape;
  }

  const api = {
    configure,
    currentShape,
    render,
    hide
  };

  window.HelloLabelDrawingPreview = api;
})();
