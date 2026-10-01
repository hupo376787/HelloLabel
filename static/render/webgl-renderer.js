"use strict";

(() => {
  let c = null;

  function configure(context) {
    c = context || null;
    return api;
  }

  function resizeOverlay() {
    const {state,els,CANVAS_MAX_DPR}=c;
    const rect=els.viewport.getBoundingClientRect();
    const cssW=Math.max(1,Math.round(rect.width||1));
    const cssH=Math.max(1,Math.round(rect.height||1));
    const dpr=Math.min(CANVAS_MAX_DPR,window.devicePixelRatio||1);
    const bufferW=Math.max(1,Math.round(cssW*dpr));
    const bufferH=Math.max(1,Math.round(cssH*dpr));

    if (els.shapeCanvas.width!==bufferW) els.shapeCanvas.width=bufferW;
    if (els.shapeCanvas.height!==bufferH) els.shapeCanvas.height=bufferH;
    els.shapeCanvas.style.width=`${cssW}px`;
    els.shapeCanvas.style.height=`${cssH}px`;
    els.interactionSvg.setAttribute("viewBox",`0 0 ${cssW} ${cssH}`);
    state.glRenderer?.resize?.(cssW,cssH,dpr);
    return {cssW,cssH,dpr};
  }

  function compileShader(gl,type,source) {
    const shader=gl.createShader(type);
    gl.shaderSource(shader,source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
      const log=gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(log);
    }
    return shader;
  }

  function makeProgram(gl,vertexSource,fragmentSource) {
    const vertex=compileShader(gl,gl.VERTEX_SHADER,vertexSource);
    const fragment=compileShader(gl,gl.FRAGMENT_SHADER,fragmentSource);
    const program=gl.createProgram();
    gl.attachShader(program,vertex);
    gl.attachShader(program,fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) {
      const log=gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(log);
    }
    return program;
  }

  function createRenderer(canvas) {
    const {OUTLINE_PX,POINT_PX}=c;
    const gl=canvas.getContext("webgl2",{
      alpha:true,
      antialias:true,
      premultipliedAlpha:true,
      desynchronized:true,
      powerPreference:"high-performance"
    });
    if (!gl) return {available:false};

    const lineVs=`#version 300 es
precision highp float; layout(location=0) in vec2 aCorner; layout(location=1) in vec4 aSeg; layout(location=2) in vec4 aColor;
uniform vec2 uPan; uniform float uScale; uniform vec2 uViewport; uniform float uHalfWidth; out float vAlong; out float vSide; out float vLen; out vec4 vColor;
void main(){vec2 s1=uPan+aSeg.xy*uScale, s2=uPan+aSeg.zw*uScale;vec2 d=s2-s1;float len=max(length(d),.001);vec2 dir=d/len, perp=vec2(-dir.y,dir.x);float along=mix(-uHalfWidth,len+uHalfWidth,aCorner.x);float side=aCorner.y*uHalfWidth;vec2 p=s1+dir*along+perp*side;gl_Position=vec4(p.x/uViewport.x*2.-1.,1.-p.y/uViewport.y*2.,0,1);vAlong=along;vSide=side;vLen=len;vColor=aColor;}`;
    const lineFs=`#version 300 es
precision highp float; uniform float uHalfWidth; in float vAlong; in float vSide; in float vLen; in vec4 vColor; out vec4 outColor;
void main(){float e=0.;if(vAlong<0.)e=-vAlong;else if(vAlong>vLen)e=vAlong-vLen;float d=length(vec2(e,vSide));float aa=max(fwidth(d),.65);float a=1.-smoothstep(uHalfWidth-aa,uHalfWidth+aa,d);if(a<=.001)discard;outColor=vec4(vColor.rgb,vColor.a*a);}`;
    const pointVs=`#version 300 es
precision highp float; layout(location=0) in vec2 aCorner; layout(location=1) in vec2 aCenter; layout(location=2) in vec4 aColor;
uniform vec2 uPan; uniform float uScale; uniform vec2 uViewport; uniform float uRadius; out vec2 vCorner; out vec4 vColor;
void main(){vec2 c=uPan+aCenter*uScale;vec2 p=c+aCorner*uRadius;gl_Position=vec4(p.x/uViewport.x*2.-1.,1.-p.y/uViewport.y*2.,0,1);vCorner=aCorner;vColor=aColor;}`;
    const pointFs=`#version 300 es
precision mediump float; in vec2 vCorner; in vec4 vColor; out vec4 outColor; void main(){float r=length(vCorner);float a=1.-smoothstep(.78,1.,r);if(a<=0.)discard;outColor=vec4(vColor.rgb,vColor.a*a);}`;
    const labelVs=`#version 300 es
precision highp float; layout(location=0) in vec4 aQuad; layout(location=1) in vec2 aCenter; layout(location=2) in vec4 aUv; layout(location=3) in vec2 aSize;
uniform vec2 uPan; uniform float uScale; uniform vec2 uViewport; uniform float uDpr; out vec2 vUv;
void main(){vec2 p=uPan+aCenter*uScale+aQuad.xy*aSize*uDpr;gl_Position=vec4(p.x/uViewport.x*2.-1.,1.-p.y/uViewport.y*2.,0,1);vUv=mix(aUv.xy,aUv.zw,aQuad.zw);}`;
    const labelFs=`#version 300 es
precision mediump float; uniform sampler2D uAtlas; in vec2 vUv; out vec4 outColor; void main(){vec4 c=texture(uAtlas,vUv);if(c.a<.01)discard;outColor=c;}`;

    const lineProgram=makeProgram(gl,lineVs,lineFs);
    const pointProgram=makeProgram(gl,pointVs,pointFs);
    const labelProgram=makeProgram(gl,labelVs,labelFs);

    const lineQuad=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,lineQuad);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,-1,1,-1,0,1,1,1]),gl.STATIC_DRAW);

    const pointQuad=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,pointQuad);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);

    const labelQuad=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,labelQuad);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-.5,-.5,0,0,.5,-.5,1,0,-.5,.5,0,1,.5,.5,1,1]),gl.STATIC_DRAW);

    const lineBuffer=gl.createBuffer();
    const pointBuffer=gl.createBuffer();
    const labelBuffer=gl.createBuffer();
    const texture=gl.createTexture();

    let lineCount=0,pointCount=0,labelCount=0,dpr=1;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);

    function setGeometry(segments,points) {
      lineCount=Math.floor((segments?.length||0)/8);
      pointCount=Math.floor((points?.length||0)/6);
      gl.bindBuffer(gl.ARRAY_BUFFER,lineBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,segments||new Float32Array(),gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,points||new Float32Array(),gl.STATIC_DRAW);
    }

    function setLabels(atlas,instances) {
      labelCount=Math.floor((instances?.length||0)/8);
      gl.bindBuffer(gl.ARRAY_BUFFER,labelBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,instances||new Float32Array(),gl.STATIC_DRAW);
      if (!atlas) return;

      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);
    }

    function resize(_width,_height,nextDpr) {
      dpr=Math.max(1,nextDpr||1);
      gl.viewport(0,0,canvas.width,canvas.height);
    }

    function common(program,panX,panY,scale) {
      gl.uniform2f(gl.getUniformLocation(program,"uPan"),panX*dpr,panY*dpr);
      gl.uniform1f(gl.getUniformLocation(program,"uScale"),scale*dpr);
      gl.uniform2f(gl.getUniformLocation(program,"uViewport"),canvas.width,canvas.height);
    }

    function draw({panX,panY,scale,showLabels}) {
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (lineCount) {
        gl.useProgram(lineProgram);
        common(lineProgram,panX,panY,scale);
        gl.uniform1f(gl.getUniformLocation(lineProgram,"uHalfWidth"),OUTLINE_PX*dpr*.5);
        gl.bindBuffer(gl.ARRAY_BUFFER,lineQuad);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
        gl.vertexAttribDivisor(0,0);
        gl.bindBuffer(gl.ARRAY_BUFFER,lineBuffer);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1,4,gl.FLOAT,false,32,0);
        gl.vertexAttribDivisor(1,1);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2,4,gl.FLOAT,false,32,16);
        gl.vertexAttribDivisor(2,1);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,lineCount);
      }

      if (pointCount) {
        gl.useProgram(pointProgram);
        common(pointProgram,panX,panY,scale);
        gl.uniform1f(gl.getUniformLocation(pointProgram,"uRadius"),POINT_PX*dpr);
        gl.bindBuffer(gl.ARRAY_BUFFER,pointQuad);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
        gl.vertexAttribDivisor(0,0);
        gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1,2,gl.FLOAT,false,24,0);
        gl.vertexAttribDivisor(1,1);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2,4,gl.FLOAT,false,24,8);
        gl.vertexAttribDivisor(2,1);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,pointCount);
      }

      if (showLabels && labelCount) {
        gl.useProgram(labelProgram);
        common(labelProgram,panX,panY,scale);
        gl.uniform1f(gl.getUniformLocation(labelProgram,"uDpr"),dpr);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.uniform1i(gl.getUniformLocation(labelProgram,"uAtlas"),0);

        gl.bindBuffer(gl.ARRAY_BUFFER,labelQuad);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0,4,gl.FLOAT,false,16,0);
        gl.vertexAttribDivisor(0,0);

        gl.bindBuffer(gl.ARRAY_BUFFER,labelBuffer);
        const stride=32;
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1,2,gl.FLOAT,false,stride,0);
        gl.vertexAttribDivisor(1,1);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2,4,gl.FLOAT,false,stride,8);
        gl.vertexAttribDivisor(2,1);
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3,2,gl.FLOAT,false,stride,24);
        gl.vertexAttribDivisor(3,1);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,labelCount);
      }
    }

    function clear() {
      setGeometry(new Float32Array(),new Float32Array());
      setLabels(null,new Float32Array());
      draw({panX:0,panY:0,scale:1,showLabels:false});
    }

    return {available:true,setGeometry,setLabels,resize,draw,clear};
  }

  function initRenderer() {
    const {state,els,setStatus,t}=c;
    if (state.glRenderer?.available) return true;

    try {
      state.glRenderer=createRenderer(els.shapeCanvas);
      state.webglReady=!!state.glRenderer.available;
    } catch (error) {
      console.error(error);
      state.glRenderer={available:false};
      state.webglReady=false;
    }

    if (!state.webglReady) setStatus(t("webglFallback"),true);
    return state.webglReady;
  }

  const api={configure,resizeOverlay,createRenderer,initRenderer};
  window.HelloLabelWebGL=api;
})();
