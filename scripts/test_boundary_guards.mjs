import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("static/browser-file-guard.js", "utf8");

function makeContext() {
  const deleteJsonBtn = {
    addEventListener() {},
    removeEventListener() {},
  };
  const context = vm.createContext({
    console,
    clearTimeout,
    alert() {},
    els: { deleteJsonBtn },
    state: {
      language: "en",
      entries: [],
      dirHandle: null,
      data: null,
      imageName: "",
      jsonHandle: null,
      selectedIds: new Set(),
    },
    stemOf(name) {
      const i = String(name).lastIndexOf(".");
      return i > 0 ? String(name).slice(0, i) : String(name);
    },
    siblingJsonHandle: async () => null,
    deleteCurrentJson() {},
    setStatus() {},
    t(key) { return key; },
    confirmModal: async () => true,
    escapeHtml(value) { return String(value); },
    createEmptyLabelme() { return { shapes: [], hellolabel: { labels: {} } }; },
    ensureDataImageFields() {},
    ensureHelloLabel() {},
    renderFileList() {},
    renderAll() {},
    setSaveState() {},
    updateActionButtons() {},
  });
  vm.runInContext(source, context, { filename: "browser-file-guard.js" });
  return context;
}

{
  const context = makeContext();
  context.state.entries = [
    { name: "sample.jpg" },
    { name: "sample.png" },
  ];
  context.state.dirHandle = {
    async *entries() {},
    async getFileHandle() { throw new Error("must not create a shared JSON"); },
  };
  await assert.rejects(
    () => context.siblingJsonHandle("sample.jpg", false),
    /Multiple images share the same Labelme JSON stem/
  );
}

{
  const context = makeContext();
  const actualHandle = { kind: "file", name: "foo.json" };
  context.state.entries = [{ name: "Foo.JPG" }];
  context.state.dirHandle = {
    async *entries() { yield ["foo.json", actualHandle]; },
    async getFileHandle() { throw new Error("existing case-insensitive JSON should be reused"); },
  };
  const result = await context.siblingJsonHandle("Foo.JPG", false);
  assert.equal(result, actualHandle);
  assert.equal(context.state.__helloLabelJsonActualName, "foo.json");
}

{
  const context = makeContext();
  context.state.entries = [{ name: "Foo.JPG" }];
  context.state.dirHandle = {
    async *entries() {
      yield ["Foo.json", { kind: "file", name: "Foo.json" }];
      yield ["foo.json", { kind: "file", name: "foo.json" }];
    },
  };
  await assert.rejects(
    () => context.siblingJsonHandle("Foo.JPG", false),
    /Ambiguous case-colliding JSON files/
  );
}

console.log("HelloLabel boundary file guards passed.");
