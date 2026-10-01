import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("static/pointer-input.js", "utf8");
const listeners = new Map();
const classes = new Set();

const viewport = {
  classList: {
    add(name) { classes.add(name); },
    remove(name) { classes.delete(name); },
  },
  addEventListener(type, fn, options = {}) {
    const list = listeners.get(type) || [];
    list.push({ fn, capture: !!options.capture });
    listeners.set(type, list);
  },
  appendChild() {},
  setPointerCapture() {},
  releasePointerCapture() {},
  hasPointerCapture() { return true; },
  getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 800 }; },
};

const documentStub = {
  head: { appendChild() {} },
  getElementById(id) { return id === "viewport" ? viewport : null; },
  createElement(tag) {
    return {
      tagName: String(tag).toUpperCase(),
      className: "",
      classList: { add() {}, remove() {}, toggle() {} },
      dataset: {},
      style: {},
      setAttribute() {},
      appendChild() {},
      addEventListener() {},
      replaceChildren() {},
      closest() { return null; },
    };
  },
  addEventListener() {},
};

const calls = [];
const state = {
  data: {},
  mode: "point",
  drawing: null,
  panX: 0,
  panY: 0,
  scale: 1,
  panning: false,
  panStart: null,
  sam: { drag: null },
  language: "en",
  primaryId: null,
};

const context = {
  console,
  document: documentStub,
  state,
  requestAnimationFrame(fn) { fn(); return 1; },
  cancelAnimationFrame() {},
  deepClone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); },
  clamp(value, min, max) { return Math.max(min, Math.min(max, value)); },
  closeAppMenu() {},
  handleDrawPointerDown(event) {
    calls.push(["down", state.mode, event.clientX, event.clientY]);
    if (state.mode === "rectangle") {
      if (!state.drawing) state.drawing = { type: "rectangle", start: [event.clientX, event.clientY], current: [event.clientX, event.clientY] };
      else state.drawing = null;
    }
    return true;
  },
  handleDrawPointerMove(event) {
    calls.push(["move", state.mode, event.clientX, event.clientY]);
    if (state.drawing?.type === "rectangle") state.drawing.current = [event.clientX, event.clientY];
    return true;
  },
  handleDrawPointerUp() { calls.push(["up", state.mode]); return false; },
  beginPointerEdit() { calls.push(["pointer-down"]); return true; },
  movePointerEdit() { calls.push(["pointer-move"]); return true; },
  endPointerEdit() { calls.push(["pointer-up"]); return true; },
  cancelPointerEdit() { calls.push(["pointer-cancel"]); return true; },
  samPointerDown(event) { calls.push(["sam-down", event.button]); return true; },
  samPointerMove() { calls.push(["sam-move"]); return true; },
  samPointerUp() { calls.push(["sam-up"]); return true; },
  renderDrawingOverlay() {},
  renderSamOverlay() {},
  scheduleViewportRender() { calls.push(["render", state.scale, state.panX, state.panY]); },
  screenToImage(x, y) { return [x, y]; },
  clampImagePoint(point) { return point; },
  finishSequenceDrawing() {},
  cancelSam() {},
  cancelDrawing() {},
  orientedRectFromEdge(a, b) { return [a, b, b, a]; },
  primaryShape() { return null; },
};
context.window = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: "pointer-input.js" });

const input = context.window.helloLabelPointerInput;
if (!input) throw new Error("pointer input layer did not initialize");

for (const type of ["mouse", "pen", "touch"]) {
  if (input.profileFor(type).pointerType !== type) throw new Error(`profile missing for ${type}`);
}
for (const tool of ["pen", "polygon", "rectangle", "circle", "oriented_rectangle", "point", "line", "linestrip"]) {
  if (!input.touchToolPolicy[tool]) throw new Error(`touch tool policy missing: ${tool}`);
}

function pointer(type, id, x, y, extras = {}) {
  return {
    type,
    pointerId: id,
    pointerType: "touch",
    clientX: x,
    clientY: y,
    button: 0,
    buttons: type === "pointerup" ? 0 : 1,
    isPrimary: id === 1,
    target: { closest() { return null; } },
    preventDefault() {},
    stopPropagation() {},
    stopImmediatePropagation() {},
    ...extras,
  };
}
function emit(type, event) {
  for (const listener of listeners.get(type) || []) listener.fn(event);
}

emit("pointerdown", pointer("pointerdown", 1, 100, 100));
emit("pointerup", pointer("pointerup", 1, 100, 100));
if (!calls.some(call => call[0] === "down" && call[1] === "point")) throw new Error("touch tap did not reach Point tool");

calls.length = 0;
state.mode = "rectangle";
state.drawing = null;
emit("pointerdown", pointer("pointerdown", 1, 20, 20));
emit("pointermove", pointer("pointermove", 1, 80, 70));
emit("pointerup", pointer("pointerup", 1, 80, 70));
if (calls.filter(call => call[0] === "down" && call[1] === "rectangle").length !== 2) throw new Error("touch rectangle drag did not produce start/end stages");

calls.length = 0;
state.mode = "polygon";
state.drawing = null;
state.panX = 0;
state.panY = 0;
state.scale = 1;
emit("pointerdown", pointer("pointerdown", 1, 100, 100));
emit("pointerdown", pointer("pointerdown", 2, 200, 100));
if (!input.navigationActive || input.touchPointerCount !== 2) throw new Error("two-finger navigation did not start");
emit("pointermove", pointer("pointermove", 2, 300, 100));
if (!(state.scale > 1.9 && state.scale < 2.1)) throw new Error(`pinch zoom scale incorrect: ${state.scale}`);
if (Math.abs(state.panX + 100) > 0.001) throw new Error(`pinch anchor/pan incorrect: ${state.panX}`);
emit("pointerup", pointer("pointerup", 2, 300, 100));
emit("pointerup", pointer("pointerup", 1, 100, 100));
if (input.navigationActive || input.touchPointerCount !== 0) throw new Error("two-finger navigation did not finish cleanly");

console.log("HelloLabel pointer/touch input tests passed.");
