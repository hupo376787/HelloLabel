"use strict";

(() => {
  function currentLanguage() {
    try {
      return localStorage.getItem("hellolabel-language")
        || localStorage.getItem("labelit-language")
        || "zh";
    } catch {
      return "zh";
    }
  }

  function t(key, vars = {}) {
    const messages = window.HelloLabelI18nMessages || {};
    const language = window.helloLabelState?.language || currentLanguage();
    let text = messages[language]?.[key] ?? messages.zh?.[key] ?? key;

    for (const [name, value] of Object.entries(vars || {})) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
    return text;
  }

  function shapeTypeText(type) {
    const key = {
      polygon: "polygon",
      rectangle: "rectangle",
      oriented_rectangle: "orientedRectangle",
      circle: "circle",
      point: "point",
      line: "line",
      linestrip: "linestrip"
    }[type];
    return key ? t(key) : String(type || "");
  }

  window.HelloLabelI18n = {
    currentLanguage,
    t,
    shapeTypeText
  };
})();
