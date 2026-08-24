"use strict";

(() => {
  const logo = document.querySelector(".empty-state .empty-logo");
  const openFolderButton = document.getElementById("openFolderBtn");
  if (!logo || !openFolderButton) return;

  const syncLabel = () => {
    const label = openFolderButton.getAttribute("title") || openFolderButton.getAttribute("aria-label") || "Open folder";
    logo.setAttribute("aria-label", label);
    logo.setAttribute("title", label);
  };

  const openFolder = () => {
    if (openFolderButton.disabled) return;
    openFolderButton.click();
  };

  logo.setAttribute("role", "button");
  logo.setAttribute("tabindex", "0");
  syncLabel();

  logo.addEventListener("click", openFolder);
  logo.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFolder();
    }
  });

  new MutationObserver(syncLabel).observe(openFolderButton, {
    attributes: true,
    attributeFilter: ["title", "aria-label"]
  });
})();
