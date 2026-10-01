"use strict";

(() => {
  let c = null;

  function configure(context) {
    c = context || null;
    return api;
  }

  function reset() {
    const { state, els } = c;
    state.sam.points = [];
    state.sam.labels = [];
    state.sam.box = null;
    state.sam.history = [];
    state.sam.preview = null;
    state.sam.drag = null;
    state.sam.requestSeq++;
    els.aiPreviewPath.classList.add("hidden-svg");
    els.samPrompts.replaceChildren();
    els.samDragBox.classList.add("hidden-svg");
    els.samAcceptBtn.classList.add("hidden");
    els.samCancelBtn.classList.add("hidden");
  }

  function cancel(status = true) {
    const { state, setMode, setStatus, t } = c;
    reset();
    if (state.mode === "sam") setMode("pointer", { keepSam:true });
    if (status) setStatus(t("aiCancelled"));
  }

  function rebuildPrompts() {
    const { state } = c;
    state.sam.points = [];
    state.sam.labels = [];
    state.sam.box = null;

    for (const item of state.sam.history) {
      if (item.kind === "point") {
        state.sam.points.push(item.point);
        state.sam.labels.push(item.label);
      } else if (item.kind === "box") {
        state.sam.box = item.box;
      }
    }
    render();
  }

  function render() {
    const { state, els, imageToViewport, shapeScreenPath } = c;

    els.samPrompts.replaceChildren();

    for (let i = 0; i < state.sam.points.length; i++) {
      const p = imageToViewport(...state.sam.points[i]);
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", p[0]);
      circle.setAttribute("cy", p[1]);
      circle.setAttribute("r", 6);
      circle.classList.add(state.sam.labels[i] === 1 ? "sam-positive" : "sam-negative");
      group.appendChild(circle);

      const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line1.classList.add("sam-prompt-cross");
      line2.classList.add("sam-prompt-cross");

      if (state.sam.labels[i] === 1) {
        line1.setAttribute("x1", p[0]-3); line1.setAttribute("x2", p[0]+3);
        line1.setAttribute("y1", p[1]); line1.setAttribute("y2", p[1]);
        line2.setAttribute("x1", p[0]); line2.setAttribute("x2", p[0]);
        line2.setAttribute("y1", p[1]-3); line2.setAttribute("y2", p[1]+3);
      } else {
        line1.setAttribute("x1", p[0]-3); line1.setAttribute("x2", p[0]+3);
        line1.setAttribute("y1", p[1]-3); line1.setAttribute("y2", p[1]+3);
        line2.setAttribute("x1", p[0]-3); line2.setAttribute("x2", p[0]+3);
        line2.setAttribute("y1", p[1]+3); line2.setAttribute("y2", p[1]-3);
      }

      group.append(line1, line2);
      els.samPrompts.appendChild(group);
    }

    if (state.sam.box) {
      const [x1,y1,x2,y2] = state.sam.box;
      const a = imageToViewport(x1,y1), b = imageToViewport(x2,y2);
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", Math.min(a[0],b[0]));
      rect.setAttribute("y", Math.min(a[1],b[1]));
      rect.setAttribute("width", Math.abs(b[0]-a[0]));
      rect.setAttribute("height", Math.abs(b[1]-a[1]));
      rect.classList.add("sam-box");
      els.samPrompts.appendChild(rect);
    }

    if (state.sam.preview) {
      els.aiPreviewPath.setAttribute("d", shapeScreenPath(state.sam.preview));
      els.aiPreviewPath.classList.remove("hidden-svg");
      els.samAcceptBtn.classList.remove("hidden");
      els.samCancelBtn.classList.remove("hidden");
    } else {
      els.aiPreviewPath.classList.add("hidden-svg");
    }

    if (state.sam.drag) {
      const a = imageToViewport(...state.sam.drag.start);
      const b = imageToViewport(...state.sam.drag.current);
      els.samDragBox.setAttribute("x", Math.min(a[0],b[0]));
      els.samDragBox.setAttribute("y", Math.min(a[1],b[1]));
      els.samDragBox.setAttribute("width", Math.abs(b[0]-a[0]));
      els.samDragBox.setAttribute("height", Math.abs(b[1]-a[1]));
      els.samDragBox.classList.remove("hidden-svg");
    } else {
      els.samDragBox.classList.add("hidden-svg");
    }
  }

  async function predict() {
    const { state, els, setBusy, t, responseError, setStatus } = c;
    if (!state.imageFile || (state.sam.points.length === 0 && !state.sam.box)) {
      state.sam.preview = null;
      render();
      return;
    }

    const seq = ++state.sam.requestSeq;
    setBusy(true, t("inferencing", { model:els.samModelSelect.options[els.samModelSelect.selectedIndex].text }));

    try {
      const post = async forceFile => {
        const form = new FormData();
        if (!forceFile && state.aiImageToken) form.append("image_token", state.aiImageToken);
        else form.append("file", state.imageFile, state.imageName);
        form.append("model", els.samModelSelect.value);
        form.append("points", JSON.stringify(state.sam.points));
        form.append("point_labels", JSON.stringify(state.sam.labels));
        form.append("box", JSON.stringify(state.sam.box));
        form.append("output_shape", els.samOutputSelect.value);
        return fetch("/api/ai/sam", { method:"POST", body:form });
      };

      let response = await post(false);
      if (response.status === 410 && state.aiImageToken) {
        state.aiImageToken = null;
        response = await post(true);
      }
      if (!response.ok) throw new Error(await responseError(response));

      const json = await response.json();
      if (seq !== state.sam.requestSeq) return;
      if (json.image_token) state.aiImageToken = json.image_token;

      state.sam.preview = {
        label:"",
        points:json.shape.points,
        shape_type:json.shape.shape_type,
        group_id:null,
        description:"",
        flags:{},
        mask:null,
        _score:json.shape.score,
        _model:json.shape.model
      };
      render();
      setStatus(t("aiCandidate", {
        score:json.shape.score != null ? `, score ${Number(json.shape.score).toFixed(3)}` : ""
      }));
    } catch (error) {
      if (seq === state.sam.requestSeq) {
        state.sam.preview = null;
        render();
        setStatus(error.message, true);
        alert(t("aiSegFailed", { message:error.message }));
      }
    } finally {
      if (seq === state.sam.requestSeq) setBusy(false);
    }
  }

  function pointerDown(event) {
    const { state, clampImagePoint, screenToImage, els } = c;
    if (state.mode !== "sam") return false;

    if (event.button === 2) {
      event.preventDefault();
      const point = clampImagePoint(screenToImage(event.clientX,event.clientY));
      state.sam.history.push({ kind:"point", point, label:0 });
      rebuildPrompts();
      void predict();
      return true;
    }
    if (event.button !== 0) return false;

    const point = clampImagePoint(screenToImage(event.clientX,event.clientY));
    state.sam.drag = {
      start:point,
      current:point,
      startClient:[event.clientX,event.clientY],
      pointerId:event.pointerId
    };
    window.helloLabelPointerInput?.capture?.(event)
      ?? (els.viewport.setPointerCapture?.(event.pointerId), true);
    render();
    return true;
  }

  function pointerMove(event) {
    const { state, clampImagePoint, screenToImage } = c;
    if (state.mode !== "sam" || !state.sam.drag) return false;
    state.sam.drag.current = clampImagePoint(screenToImage(event.clientX,event.clientY));
    render();
    return true;
  }

  function pointerUp(event) {
    const { state, clampImagePoint, screenToImage } = c;
    if (state.mode !== "sam" || !state.sam.drag) return false;

    const drag = state.sam.drag;
    const point = clampImagePoint(screenToImage(event.clientX,event.clientY));
    const moved = Math.hypot(event.clientX-drag.startClient[0], event.clientY-drag.startClient[1]);
    state.sam.drag = null;

    if (moved >= 6) {
      state.sam.history.push({
        kind:"box",
        box:[
          Math.min(drag.start[0],point[0]),
          Math.min(drag.start[1],point[1]),
          Math.max(drag.start[0],point[0]),
          Math.max(drag.start[1],point[1])
        ]
      });
    } else {
      state.sam.history.push({ kind:"point", point, label:1 });
    }

    rebuildPrompts();
    void predict();
    return true;
  }

  function undoPrompt() {
    if (!c.state.sam.history.length) return;
    c.state.sam.history.pop();
    rebuildPrompts();
    void predict();
  }

  async function accept() {
    const { state, els, deepClone, commitGeometry, setStatus, t } = c;
    const shape = state.sam.preview;
    if (!shape) return;

    const meta = {
      source:shape._model || els.samModelSelect.value,
      score:shape._score ?? null
    };
    const type = shape.shape_type;
    const points = deepClone(shape.points);

    reset();
    await commitGeometry(type, points, meta);
    if (state.mode === "sam") setStatus(t("aiAccepted"));
  }

  const api = {
    configure,
    reset,
    cancel,
    rebuildPrompts,
    render,
    predict,
    pointerDown,
    pointerMove,
    pointerUp,
    undoPrompt,
    accept
  };

  window.HelloLabelSamController = api;
})();
