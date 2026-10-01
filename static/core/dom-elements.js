"use strict";

window.HelloLabelDOM = window.HelloLabelDOM || {};

window.HelloLabelDOM.$ = function(id){
  return document.getElementById(id);
};

// Kept as a lazy getter to avoid changing existing app-core globals in this step.
window.HelloLabelDOM.createElements = function(){
  const $ = window.HelloLabelDOM.$;
  return {
    viewport: $("viewport"),
    stage: $("stage"),
    imageView: $("imageView"),
    shapeCanvas: $("shapeCanvas"),
    interactionSvg: $("interactionSvg"),
    pointerBtn: $("pointerBtn"),
    penBtn: $("penBtn"),
    polygonBtn: $("polygonBtn"),
    rectBtn: $("rectBtn"),
    obbBtn: $("obbBtn"),
    circleBtn: $("circleBtn"),
    pointBtn: $("pointBtn"),
    lineBtn: $("lineBtn"),
    linestripBtn: $("linestripBtn")
  };
};
