"use strict";

(() => {
  const logo = document.querySelector(".empty-state .empty-logo");
  const openFolderButton = document.getElementById("openFolderBtn");
  if (!logo || !openFolderButton) return;

  const openFolder = () => {
    if (openFolderButton.disabled) return;
    openFolderButton.click();
  };

  logo.setAttribute("role", "button");
  logo.setAttribute("tabindex", "0");
  logo.setAttribute("aria-label", "Open image folder");
  logo.setAttribute("title", "Open image folder");

  logo.addEventListener("click", openFolder);
  logo.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFolder();
    }
  });
})();
