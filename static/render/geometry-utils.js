"use strict";

(() => {
  function rectCorners(points) {
    if (!points?.length) return [];
    const a = points[0] || [0,0], b = points[1] || a;
    const x1 = Number(a[0]), y1 = Number(a[1]), x2 = Number(b[0]), y2 = Number(b[1]);
    return [[x1,y1],[x2,y1],[x2,y2],[x1,y2]];
  }

  function circleInfo(shape) {
    const a = shape.points?.[0] || [0,0];
    const b = shape.points?.[1] || a;
    return {
      cx:Number(a[0]),
      cy:Number(a[1]),
      r:Math.hypot(Number(b[0])-Number(a[0]), Number(b[1])-Number(a[1]))
    };
  }

  function renderVertices(shape) {
    const type = shape.shape_type;
    const points = shape.points || [];

    if (type === "rectangle") return rectCorners(points);
    if (type === "circle") {
      const {cx,cy,r} = circleInfo(shape);
      const count = 64;
      const out = [];
      for (let i=0; i<count; i++) {
        const angle = i / count * Math.PI * 2;
        out.push([cx + Math.cos(angle)*r, cy + Math.sin(angle)*r]);
      }
      return out;
    }

    return points.map(point => [Number(point[0]), Number(point[1])]);
  }

  function isClosedType(type) {
    return type === "polygon"
      || type === "rectangle"
      || type === "oriented_rectangle"
      || type === "circle";
  }

  function shapeBounds(shape) {
    if (shape.shape_type === "circle") {
      const {cx,cy,r} = circleInfo(shape);
      return [cx-r,cy-r,cx+r,cy+r];
    }

    const points = renderVertices(shape);
    if (!points.length) return [0,0,0,0];

    let x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
    for (const point of points) {
      x1 = Math.min(x1,point[0]);
      y1 = Math.min(y1,point[1]);
      x2 = Math.max(x2,point[0]);
      y2 = Math.max(y2,point[1]);
    }
    return [x1,y1,x2,y2];
  }

  function shapeAnchor(shape) {
    const bounds = shapeBounds(shape);
    return [(bounds[0]+bounds[2])/2, (bounds[1]+bounds[3])/2];
  }

  function controlPointsForShape(shape) {
    if (!shape) return [];
    if (shape.shape_type === "rectangle") {
      return rectCorners(shape.points).map((point,index) => ({
        p:point,
        index,
        kind:"rect-corner"
      }));
    }

    return (shape.points || []).map((point,index) => ({
      p:[Number(point[0]),Number(point[1])],
      index,
      kind:"point"
    }));
  }

  function pointInPolygon(x,y,points) {
    let inside = false;
    for (let i=0,j=points.length-1; i<points.length; j=i++) {
      const xi=points[i][0], yi=points[i][1];
      const xj=points[j][0], yj=points[j][1];
      if (((yi>y)!==(yj>y)) && (x<(xj-xi)*(y-yi)/((yj-yi)||1e-12)+xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  function pointSegDistance(point,a,b) {
    const vx=b[0]-a[0], vy=b[1]-a[1];
    const wx=point[0]-a[0], wy=point[1]-a[1];
    const length=vx*vx+vy*vy;
    if (length < 1e-12) return Math.hypot(wx,wy);

    let t=(wx*vx+wy*vy)/length;
    t=Math.max(0,Math.min(1,t));
    return Math.hypot(
      point[0]-(a[0]+t*vx),
      point[1]-(a[1]+t*vy)
    );
  }

  function shapeHit(shape,x,y,tolerance) {
    const type=shape.shape_type;

    if (type === "circle") {
      const {cx,cy,r}=circleInfo(shape);
      return Math.hypot(x-cx,y-cy) <= r+tolerance;
    }

    if (type === "point") {
      return Math.hypot(x-shape.points[0][0],y-shape.points[0][1]) <= tolerance*1.5;
    }

    const vertices=renderVertices(shape);
    if (isClosedType(type) && pointInPolygon(x,y,vertices)) return true;

    const end=isClosedType(type) ? vertices.length : vertices.length-1;
    for (let i=0; i<end; i++) {
      const next=(i+1)%vertices.length;
      if (pointSegDistance([x,y],vertices[i],vertices[next]) <= tolerance) return true;
    }
    return false;
  }

  window.HelloLabelGeometry = {
    rectCorners,
    circleInfo,
    renderVertices,
    isClosedType,
    shapeBounds,
    shapeAnchor,
    controlPointsForShape,
    pointInPolygon,
    pointSegDistance,
    shapeHit
  };
})();
