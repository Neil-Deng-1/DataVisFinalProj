// https://observablehq.com/@d3/streamgraph

// DOM reference
const container = d3.select("#container");

const margin = { top: 20, right: 30, bottom: 30, left: 20 };
const width = window.innerWidth;
const height = window.innerHeight;

const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .style("max-width", "100%")
    .style("height", "auto");