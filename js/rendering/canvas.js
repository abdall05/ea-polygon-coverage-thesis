// js/rendering/canvas.js

export const CANVAS_THEME = {
    background: '#fcfdff',
    boundaryStroke: '#94a3b8',
    boundaryLabel: '#64748b',

    pointFill: '#475569',
    pointStroke: 'rgba(255,255,255,0.50)',

    polygonStroke: '#1d4ed8',
    polygonFill: 'rgba(37, 99, 235, 0.08)',

    polygonVertexFill: '#0f172a',
    polygonVertexStroke: '#ffffff'
};

export const CANVAS_STYLE = {
    margin: 20,
    labelOffsetY: 8,
    labelFont: '12px Inter, Segoe UI, sans-serif',

    pointRadius: 0.0044,
    pointStrokeWidthPx: 0.4,

    boundaryWidthPx: 1.2,

    polygonWidthPx: 2.4,
    polygonVertexRadius: 0.0064,
    polygonVertexStrokeWidthPx: 1.0,

    fittedViewportPadding: 22,
    fittedDomainMarginFactor: 0.10
};

export function clearCanvas(ctx, width, height, background = CANVAS_THEME.background) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
}

export function drawCanvasBoundary(ctx, width, height) {
    const margin = CANVAS_STYLE.margin;
    const squareSize = Math.min(width, height) - 2 * margin;
    const squareX = (width - squareSize) / 2;
    const squareY = (height - squareSize) / 2;

    ctx.save();
    ctx.strokeStyle = CANVAS_THEME.boundaryStroke;
    ctx.lineWidth = CANVAS_STYLE.boundaryWidthPx;
    ctx.strokeRect(squareX, squareY, squareSize, squareSize);

    ctx.fillStyle = CANVAS_THEME.boundaryLabel;
    ctx.font = CANVAS_STYLE.labelFont;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('(0, 0)', squareX, squareY + squareSize + CANVAS_STYLE.labelOffsetY);
    ctx.restore();

    return { squareX, squareY, squareSize };
}

export function withSquareViewport(ctx, squareX, squareY, squareSize, drawFn) {
    ctx.save();
    ctx.translate(squareX, squareY + squareSize);
    ctx.scale(squareSize, -squareSize);
    drawFn(ctx, squareSize);
    ctx.restore();
}

export function getFittedViewport(canvasWidth, canvasHeight, polygon, options = {}) {
    const padding = options.padding ?? CANVAS_STYLE.fittedViewportPadding;
    const marginFactor = options.marginFactor ?? CANVAS_STYLE.fittedDomainMarginFactor;

    let minX = 0;
    let maxX = 1;
    let minY = 0;
    let maxY = 1;

    if (Array.isArray(polygon) && polygon.length) {
        for (const p of polygon) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
    }

    const rangeX = Math.max(maxX - minX, 0.001);
    const rangeY = Math.max(maxY - minY, 0.001);
    const extra = Math.max(rangeX, rangeY) * marginFactor;

    const viewMinX = Math.max(0, minX - extra);
    const viewMaxX = Math.min(1, maxX + extra);
    const viewMinY = Math.max(0, minY - extra);
    const viewMaxY = Math.min(1, maxY + extra);

    const viewWidth = Math.max(viewMaxX - viewMinX, 0.001);
    const viewHeight = Math.max(viewMaxY - viewMinY, 0.001);

    const scale = Math.min(
        (canvasWidth - padding * 2) / viewWidth,
        (canvasHeight - padding * 2) / viewHeight
    );

    const offsetX = (canvasWidth - viewWidth * scale) / 2 - viewMinX * scale;
    const offsetY = (canvasHeight - viewHeight * scale) / 2 - viewMinY * scale;

    return {
        scale,
        offsetX,
        offsetY,
        viewMinX,
        viewMaxX,
        viewMinY,
        viewMaxY
    };
}

export function withFittedViewport(ctx, canvasWidth, canvasHeight, polygon, drawFn, options = {}) {
    const viewport = getFittedViewport(canvasWidth, canvasHeight, polygon, options);

    ctx.save();
    ctx.translate(viewport.offsetX, canvasHeight - viewport.offsetY);
    ctx.scale(viewport.scale, -viewport.scale);
    drawFn(ctx, viewport.scale, viewport);
    ctx.restore();

    return viewport;
}

export function drawUnitBoundary(ctx, scale) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 1, 1);
    ctx.strokeStyle = CANVAS_THEME.boundaryStroke;
    ctx.lineWidth = CANVAS_STYLE.boundaryWidthPx / scale;
    ctx.stroke();
    ctx.restore();
}

export function drawPoints(ctx, points, _squareX, _squareY, squareSize) {
    if (!points || points.length === 0) return;

    ctx.save();
    ctx.translate(_squareX, _squareY + squareSize);
    ctx.scale(squareSize, -squareSize);
    drawPointsNormalized(ctx, points, squareSize);
    ctx.restore();
}

export function drawPointsNormalized(ctx, points, scale) {
    if (!points || points.length === 0) return;

    ctx.save();
    ctx.fillStyle = CANVAS_THEME.pointFill;
    ctx.strokeStyle = CANVAS_THEME.pointStroke;
    ctx.lineWidth = CANVAS_STYLE.pointStrokeWidthPx / scale;
    ctx.globalAlpha = 0.9;

    for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, CANVAS_STYLE.pointRadius, 0, 2 * Math.PI);
        ctx.fill();

        if (CANVAS_STYLE.pointStrokeWidthPx > 0) {
            ctx.stroke();
        }
    }

    ctx.restore();
}

export function drawPolygon(ctx, polygon, _squareX, _squareY, squareSize) {
    if (!polygon || polygon.length < 3) return;

    ctx.save();
    ctx.translate(_squareX, _squareY + squareSize);
    ctx.scale(squareSize, -squareSize);
    drawPolygonNormalized(ctx, polygon, squareSize);
    ctx.restore();
}

export function drawPolygonNormalized(ctx, polygon, scale) {
    if (!polygon || polygon.length < 3) return;

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++) {
        ctx.lineTo(polygon[i].x, polygon[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = CANVAS_THEME.polygonFill;
    ctx.strokeStyle = CANVAS_THEME.polygonStroke;
    ctx.lineWidth = CANVAS_STYLE.polygonWidthPx / scale;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.fill();
    ctx.stroke();

    drawPolygonVerticesNormalized(ctx, polygon, scale);

    ctx.restore();
}

export function drawPolygonVerticesNormalized(ctx, polygon, scale) {
    if (!polygon || polygon.length === 0) return;

    ctx.save();
    for (const v of polygon) {
        ctx.beginPath();
        ctx.arc(v.x, v.y, CANVAS_STYLE.polygonVertexRadius, 0, 2 * Math.PI);
        ctx.fillStyle = CANVAS_THEME.polygonVertexFill;
        ctx.fill();

        ctx.strokeStyle = CANVAS_THEME.polygonVertexStroke;
        ctx.lineWidth = CANVAS_STYLE.polygonVertexStrokeWidthPx / scale;
        ctx.stroke();
    }
    ctx.restore();
}

export function drawStandardScene(ctx, canvas, points, polygon = null) {
    clearCanvas(ctx, canvas.width, canvas.height);
    const { squareX, squareY, squareSize } = drawCanvasBoundary(ctx, canvas.width, canvas.height);
    drawPoints(ctx, points, squareX, squareY, squareSize);

    if (polygon) {
        drawPolygon(ctx, polygon, squareX, squareY, squareSize);
    }
}

export function drawFittedScene(ctx, canvas, points, polygon = null) {
    clearCanvas(ctx, canvas.width, canvas.height);

    withFittedViewport(ctx, canvas.width, canvas.height, polygon, (localCtx, scale) => {
        drawUnitBoundary(localCtx, scale);

        if (points) {
            drawPointsNormalized(localCtx, points, scale);
        }

        if (polygon) {
            drawPolygonNormalized(localCtx, polygon, scale);
        }
    });
}