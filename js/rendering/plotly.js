// js/rendering/plotly.js

export function getDefaultLayout(title, xTitle, yTitle, expanded = false) {
    return {
        title,
        xaxis: {
            title: xTitle,
            rangeslider: expanded ? { visible: false } : { visible: true }
        },
        yaxis: { title: yTitle },
        hovermode: 'closest',
        dragmode: 'zoom',
        font: { size: expanded ? 16 : 12 },
        margin: expanded
            ? { l: 70, r: 30, t: 60, b: 70 }
            : { l: 50, r: 20, t: 40, b: 50 }
    };
}

export function makeLineTrace(x, y, name, color, extra = {}) {
    return {
        x,
        y,
        name,
        type: 'scatter',
        mode: 'lines',
        line: {
            color,
            width: 2,
            ...(extra.line || {})
        },
        ...extra
    };
}

export function getGenerationAxis(history) {
    return history.map((entry, i) => entry.generation ?? i);
}