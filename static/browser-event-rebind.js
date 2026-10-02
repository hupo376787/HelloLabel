"use strict";

// Compatibility shim retained in the load graph.
// Browser AI is now reached through the modular controllers, so no extra
// button listeners or global-function rebinding is required here.
(() => {
  delete window.__helloLabelLegacyFunctions;
})();
