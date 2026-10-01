"use strict";

window.HelloLabelEvents = window.HelloLabelEvents || {
  init() {
    const els = window.HelloLabelDOM?.createElements();
    if (!els) return;

    window.HelloLabelMode?.init({
      pointer: els.pointerBtn,
      pen: els.penBtn,
      polygon: els.polygonBtn,
      rectangle: els.rectBtn,
      oriented_rectangle: els.obbBtn,
      circle: els.circleBtn,
      point: els.pointBtn,
      line: els.lineBtn,
      linestrip: els.linestripBtn
    });
  }
};
