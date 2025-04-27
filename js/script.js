// https://observablehq.com/@d3/streamgraph

// DOM reference
const container = d3.select("#container");

//const margin = { top: 20, right: 30, bottom: 30, left: 20 };
const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    //.attr("viewBox", [0, 0, width, height])
    .append('g')

function createVis(data) {

    const x = d => d.startYear;
    const y = d => d.weightedRating; 
    const z = d => d.genres;

    console.log(x);
    console.log(y);
    console.log(z);

    const genres = Array.from(new Set(data.map(z)));

    console.log(genres);

    const nested = d3.rollup(
        data,
        v => d3.rollup(v, v => d3.sum(v, y), d => d.startYear),
        d => d.genres
    );

    console.log(nested);

    const years = Array.from(new Set(data.map(d => d.startYear))).sort(d3.ascending);

    console.log(years);


    const stackedData = genres.map(genre => {
        const yearMap = nested.get(genre) || new Map();
        return years.map(year => {
            return {
                year,
                genre,
                value: yearMap.get(year) || 0
            };
        });
    });

    const xScale = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .range([height, 0]); 

    const colorScale = d3.scaleOrdinal()
        .domain(genres)
        .range(d3.schemeSet3);

    const stack = d3.stack()
        .keys(genres)
        .value((d, key) => {
            const genreData = stackedData.find(g => g[0].genre === key);
            const found = genreData.find(e => e.year === d.year);
            return found ? found.value : 0;
        })
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetWiggle);

    const series = stack(years.map(year => ({ year })));

    yScale.domain([
        d3.min(series, s => d3.min(s, d => d[0])),
        d3.max(series, s => d3.max(s, d => d[1]))
    ]);

    const area = d3.area()
        .x((d, i) => xScale(d.data.year))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
//        .curve(d3.curveBasis);

    svg.selectAll("path")
        .data(series)
        .join("path")
        .attr("fill", ({key}) => colorScale(key))
        .attr("d", area);
}
    
function init() {
    d3.csv("data/imdbMoviesCleanedGenreSplit.csv", d3.autoType).then(data => {
        console.log(data);
        createVis(data);
    });
}

window.addEventListener('load', init);