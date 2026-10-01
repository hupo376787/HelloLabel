"use strict";

(() => {
  let context = null;

  function configure(nextContext) {
    context = nextContext || null;
    return api;
  }

  function ensureHelloLabel() {
    const { state, deepClone, uid, stableColor } = context;
    if (!state.data) return;

    if ((!state.data.hellolabel || typeof state.data.hellolabel !== "object" || Array.isArray(state.data.hellolabel))
        && state.data.labelit && typeof state.data.labelit === "object" && !Array.isArray(state.data.labelit)) {
      state.data.hellolabel = deepClone(state.data.labelit);
    }

    delete state.data.labelit;
    if (!state.data.hellolabel || typeof state.data.hellolabel !== "object" || Array.isArray(state.data.hellolabel)) {
      state.data.hellolabel = {};
    }

    const helloLabel = state.data.hellolabel;
    if (!helloLabel.labels || typeof helloLabel.labels !== "object" || Array.isArray(helloLabel.labels)) {
      helloLabel.labels = {};
    }

    if (Array.isArray(helloLabel.shapeIds) && state.runtimeIds.length === 0) {
      state.runtimeIds = helloLabel.shapeIds.map(value => String(value || ""));
    }
    if (helloLabel.shapeMeta && typeof helloLabel.shapeMeta === "object"
        && !Array.isArray(helloLabel.shapeMeta) && Object.keys(state.runtimeMeta).length === 0) {
      state.runtimeMeta = deepClone(helloLabel.shapeMeta);
    }

    delete helloLabel.shapeIds;
    delete helloLabel.shapeMeta;
    delete helloLabel.version;

    const shapes = state.data.shapes || [];
    while (state.runtimeIds.length < shapes.length) state.runtimeIds.push(uid());
    if (state.runtimeIds.length > shapes.length) state.runtimeIds.length = shapes.length;

    const seen = new Set();
    for (let i = 0; i < state.runtimeIds.length; i++) {
      let id = String(state.runtimeIds[i] || "");
      if (!id || seen.has(id)) {
        id = uid();
        state.runtimeIds[i] = id;
      }
      seen.add(id);
    }

    for (const shape of shapes) {
      const label = String(shape.label || "").trim() || "unlabeled";
      shape.label = label;
      if (!helloLabel.labels[label]) helloLabel.labels[label] = { color: stableColor(label) };
      if (!/^#[0-9a-f]{6}$/i.test(helloLabel.labels[label]?.color || "")) {
        helloLabel.labels[label].color = stableColor(label);
      }
    }
  }

  function shapeIds() {
    return context.state.runtimeIds;
  }

  function shapeMeta(id) {
    return context.state.runtimeMeta?.[id] || {};
  }

  function labelColor(label) {
    const { state, stableColor } = context;
    return state.data?.hellolabel?.labels?.[label]?.color || stableColor(label);
  }

  function shapeAtId(id) {
    const { state } = context;
    const index = state.indexById.get(id);
    return index == null ? null : state.data?.shapes?.[index] || null;
  }

  function primaryShape() {
    const { state } = context;
    return state.primaryId ? shapeAtId(state.primaryId) : null;
  }

  function primaryIndex() {
    const { state } = context;
    return state.primaryId ? state.indexById.get(state.primaryId) : -1;
  }

  function createEmptyLabelme() {
    const { state } = context;
    return {
      version:"7.0.4",
      flags:{},
      shapes:[],
      imagePath:state.imageName,
      imageData:null,
      imageHeight:state.height,
      imageWidth:state.width,
      hellolabel:{labels:{}}
    };
  }

  function ensureDataImageFields(data = context.state.data) {
    const { state } = context;
    if (!data) return;
    data.imagePath = state.imageName;
    data.imageData = null;
    data.imageHeight = state.height;
    data.imageWidth = state.width;
  }

  function validateLabelme(data) {
    const { SHAPE_TYPES, t } = context;
    if (!data || !Array.isArray(data.shapes)) throw new Error(t("invalidLabelme"));

    for (const [index, shape] of data.shapes.entries()) {
      if (!shape || !Array.isArray(shape.points) || !SHAPE_TYPES.has(String(shape.shape_type || "polygon"))) {
        throw new Error(t("unsupportedShape", { index:index + 1 }));
      }

      shape.shape_type = String(shape.shape_type || "polygon");
      shape.label = String(shape.label || "unlabeled");
      if (shape.group_id === undefined) shape.group_id = null;
      if (shape.description === undefined) shape.description = "";
      if (!shape.flags) shape.flags = {};
      if (shape.mask === undefined) shape.mask = null;
    }

    if (data.version == null) data.version = "7.0.4";
    if (!data.flags) data.flags = {};
    ensureDataImageFields(data);
    return data;
  }

  const api = {
    configure,
    ensureHelloLabel,
    shapeIds,
    shapeMeta,
    labelColor,
    shapeAtId,
    primaryShape,
    primaryIndex,
    createEmptyLabelme,
    validateLabelme,
    ensureDataImageFields
  };

  window.HelloLabelModel = api;
})();
