console.log('D3 Version:', d3.version);

let originalData = [];
let yearSlider, ratingSlider;

const margin = { top: 30, right: 30, bottom: 30, left: 30 };
const width = window.innerWidth - margin.left - margin.right;
const height = window.innerHeight - margin.bottom - margin.top;
const radius = 3;
const verticalSpacing = radius * 2.5;

function applyDynamicFilters() {
    const [yearMin, yearMax] = yearSlider.value();
    const [ratingMin, ratingMax] = ratingSlider.value();
    const directorSearch = document.getElementById("directorSearch").value.toLowerCase();

    const filtered = originalData.filter(d =>
        d.startYear >= yearMin &&
        d.startYear <= yearMax &&
        d.weightedRating >= ratingMin &&
        d.weightedRating <= ratingMax &&
        (!directorSearch || (d.directorNames && d.directorNames.toLowerCase().includes(directorSearch)))
    );

    createVis(filtered);
}

function createVis(data) {
    const yearGroups = d3.group(data, d => d.startYear);
    const years = Array.from(yearGroups.keys()).sort(d3.ascending);
    const maxMoviesInYear = d3.max(Array.from(yearGroups.values(), g => g.length));
    const requiredHeight = maxMoviesInYear * verticalSpacing + margin.top + margin.bottom;

    d3.select("#vis").select("svg").remove();

    const svg = d3.select('#vis')
        .append('svg')
        .attr('viewBox', [30, 30, width-30, height-300])
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .append('g');

    const x = d3.scaleBand()
        .domain(years)
        .range([0, width])
        .padding(0.2);

    svg.append("g")
        .attr("transform", `translate(0, ${requiredHeight - margin.bottom - margin.top})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    years.forEach(year => {
        const movies = yearGroups.get(year);
        movies.forEach((d, i) => {
            svg.append("circle")
                .attr("cx", x(year) + x.bandwidth() / 2)
                .attr("cy", requiredHeight - margin.bottom - margin.top - i * verticalSpacing)
                .attr("r", radius)
                .attr("fill", "steelblue")
                .on("mouseover", (event) => {
                    tooltip
                        .style("display", "block")
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 20) + "px")
                        .html(`<strong>${d.primaryTitle}</strong><br/>
                              Year: ${d.startYear}<br/>
                              Rating: ${d.weightedRating}<br/>
                              Director: ${d.directorNames}`);
                })
                .on("mouseout", () => {
                    tooltip.style("display", "none");
                });
        });
    });
}


function init() {
    d3.csv("data/imdbMoviesCleaned.csv", d3.autoType).then(data => {
        console.log(data);
        originalData = data;
        createVis(data);

        const minYear = d3.min(data, d => d.startYear);
        const maxYear = d3.max(data, d => d.startYear);

        yearSlider = d3.sliderHorizontal()
            .min(minYear)
            .max(maxYear)
            .step(1)
            .width(width - 45)
            .default([minYear, maxYear])
            .on('onchange', applyDynamicFilters);

        d3.select("#yearSlider")
            .append("svg")
            .attr("width", width)
            .attr("height", 100)
            .append("g")
            .attr("transform", "translate(30,30)")
            .call(yearSlider);

        ratingSlider = d3.sliderHorizontal()
            .min(0)
            .max(10)
            .step(0.1)
            .width(width - 45)
            .default([0, 10])
            .on('onchange', applyDynamicFilters);

        d3.select("#ratingSlider")
            .append("svg")
            .attr("width", width)
            .attr("height", 100)
            .append("g")
            .attr("transform", "translate(30,30)")
            .call(ratingSlider);

        d3.select("#directorSearch").on("input", applyDynamicFilters);

        applyDynamicFilters();
    });
}

window.addEventListener('load', init);






















// function createVis(data) {

//     const x = d => d.startYear;
//     const y = d => d.weightedRating; 
//     const z = d => d.genres;

//     console.log(x);
//     console.log(y);
//     console.log(z);

//     const genres = Array.from(new Set(data.map(z)));

//     console.log(genres);

//     const nested = d3.rollup(
//         data,
//         v => d3.rollup(v, v => d3.sum(v, y), d => d.startYear),
//         d => d.genres
//     );

//     console.log(nested);

//     const years = Array.from(new Set(data.map(d => d.startYear))).sort(d3.ascending);

//     console.log(years);


//     const stackedData = genres.map(genre => {
//         const yearMap = nested.get(genre) || new Map();
//         return years.map(year => {
//             return {
//                 year,
//                 genre,
//                 value: yearMap.get(year) || 0
//             };
//         });
//     });

//     const xScale = d3.scaleLinear()
//         .domain(d3.extent(years))
//         .range([0, width]);

//     const yScale = d3.scaleLinear()
//         .range([height, 0]); 

//     const colorScale = d3.scaleOrdinal()
//         .domain(genres)
//         .range(d3.schemeSet3);

//     const stack = d3.stack()
//         .keys(genres)
//         .value((d, key) => {
//             const genreData = stackedData.find(g => g[0].genre === key);
//             const found = genreData.find(e => e.year === d.year);
//             return found ? found.value : 0;
//         })
//         .order(d3.stackOrderNone)
//         .offset(d3.stackOffsetWiggle);

//     const series = stack(years.map(year => ({ year })));

//     yScale.domain([
//         d3.min(series, s => d3.min(s, d => d[0])),
//         d3.max(series, s => d3.max(s, d => d[1]))
//     ]);

//     const area = d3.area()
//         .x((d, i) => xScale(d.data.year))
//         .y0(d => yScale(d[0]))
//         .y1(d => yScale(d[1]))
// //        .curve(d3.curveBasis);

//     svg.selectAll("path")
//         .data(series)
//         .join("path")
//         .attr("fill", ({key}) => colorScale(key))
//         .attr("d", area);
// }
    
// function init() {
//     d3.csv("data/imdbMoviesCleanedGenreSplit.csv", d3.autoType).then(data => {
//         console.log(data);
//         createVis(data);
//     });
// }

// window.addEventListener('load', init);