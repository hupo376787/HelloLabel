"use strict";

(() => {
  const APP_VERSION = "1.4.2";
  const modalCard = document.getElementById("modalCard");
  if (!modalCard) return;

  function patchAboutVersion() {
    if (!modalCard.classList.contains("about-modal-card")) return;

    const badge = modalCard.querySelector(".about-version-badge");
    if (badge) badge.textContent = `v${APP_VERSION}`;

    const cells = [...modalCard.querySelectorAll(".about-meta-grid > div")];
    for (let i = 0; i + 1 < cells.length; i += 2) {
      const label = String(cells[i].textContent || "").trim().toLowerCase();
      if (label === "版本" || label === "version") {
        cells[i + 1].textContent = APP_VERSION;
        break;
      }
    }
  }

  const observer = new MutationObserver(() => patchAboutVersion());
  observer.observe(modalCard, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
  patchAboutVersion();
})();
