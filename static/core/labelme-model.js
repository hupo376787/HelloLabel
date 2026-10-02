"use strict";

(() => {
  let context = null;
  let labelColorResolver = null;

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

  function setLabelColorResolver(resolver) {
    labelColorResolver = typeof resolver === "function" ? resolver : null;
  }

  function labelColor(label) {
    const { state, stableColor } = context;
    const imageColor = state.data?.hellolabel?.labels?.[label]?.color;
    const fallback = imageColor || stableColor(label);
    if (!labelColorResolver) return fallback;
    const resolved = labelColorResolver(label, { state, imageColor, fallback, stableColor });
    return resolved || fallback;
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

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function validateFlags(value, fail) {
    if (value == null) return {};
    if (!isPlainObject(value) || Object.values(value).some(flag => typeof flag !== "boolean")) {
      fail("flags must be an object of boolean values");
    }
    return value;
  }

  function validateLabelme(data) {
    const { SHAPE_TYPES, t, state } = context;
    const failFile = detail => {
      throw new Error(`${t("invalidLabelme")} ${detail}`);
    };
    const failShape = (index, detail) => {
      throw new Error(`${t("unsupportedShape", { index:index + 1 })} ${detail}`);
    };

    if (!isPlainObject(data) || !Array.isArray(data.shapes)) {
      failFile("shapes must be an array.");
    }
    if (typeof data.imagePath !== "string" || !data.imagePath.trim()) {
      failFile("imagePath must be a non-empty string.");
    }
    if (!Object.prototype.hasOwnProperty.call(data, "imageData")
        || (data.imageData !== null && typeof data.imageData !== "string")) {
      failFile("imageData must be null or a base64 string.");
    }

    data.flags = validateFlags(data.flags, message => failFile(message));

    for (const key of ["imageHeight", "imageWidth"]) {
      const value = data[key];
      if (value == null) continue;
      if (!Number.isInteger(value) || value <= 0) {
        failFile(`${key} must be a positive integer.`);
      }
    }
    if (state?.height > 0 && data.imageHeight != null && data.imageHeight !== state.height) {
      failFile(`imageHeight mismatch: declared=${data.imageHeight}, actual=${state.height}.`);
    }
    if (state?.width > 0 && data.imageWidth != null && data.imageWidth !== state.width) {
      failFile(`imageWidth mismatch: declared=${data.imageWidth}, actual=${state.width}.`);
    }

    const exactPointCounts = {
      point:1,
      rectangle:2,
      line:2,
      circle:2,
      oriented_rectangle:4
    };

    for (const [index, shape] of data.shapes.entries()) {
      if (!isPlainObject(shape)) failShape(index, "shape must be an object.");
      if (!Object.prototype.hasOwnProperty.call(shape, "label") || typeof shape.label !== "string") {
        failShape(index, "label must be a string.");
      }
      if (!Object.prototype.hasOwnProperty.call(shape, "shape_type") || typeof shape.shape_type !== "string") {
        failShape(index, "shape_type must be a string.");
      }

      const shapeType = shape.shape_type;
      if (!SHAPE_TYPES.has(shapeType)) {
        failShape(index, `unsupported shape_type=${shapeType}.`);
      }

      if (!Array.isArray(shape.points) || shape.points.length === 0
          || !shape.points.every(point =>
            Array.isArray(point)
            && point.length === 2
            && point.every(value => typeof value === "number" && Number.isFinite(value))
          )) {
        failShape(index, "points must be a non-empty array of finite [x, y] numbers.");
      }

      const exactCount = exactPointCounts[shapeType];
      if (exactCount != null && shape.points.length !== exactCount) {
        failShape(index, `${shapeType} requires exactly ${exactCount} point${exactCount === 1 ? "" : "s"}.`);
      }
      if (shapeType === "polygon" && shape.points.length < 3) {
        failShape(index, "polygon requires at least 3 points.");
      }
      if (shapeType === "linestrip" && shape.points.length < 2) {
        failShape(index, "linestrip requires at least 2 points.");
      }

      shape.flags = validateFlags(shape.flags, message => failShape(index, message));

      if (shape.group_id == null) shape.group_id = null;
      else if (!Number.isInteger(shape.group_id)) failShape(index, "group_id must be an integer or null.");

      if (shape.description == null) shape.description = "";
      else if (typeof shape.description !== "string") failShape(index, "description must be a string or null.");

      if (shape.mask == null) shape.mask = null;
      else if (typeof shape.mask !== "string") failShape(index, "mask must be a base64 PNG string or null.");
    }

    if (data.version == null) data.version = "7.0.4";
    return data;
  }

  const api = {
    configure,
    ensureHelloLabel,
    shapeIds,
    shapeMeta,
    labelColor,
    setLabelColorResolver,
    shapeAtId,
    primaryShape,
    primaryIndex,
    createEmptyLabelme,
    validateLabelme,
    ensureDataImageFields
  };

  window.HelloLabelModel = api;
})();
