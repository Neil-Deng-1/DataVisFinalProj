console.log('D3 Version:', d3.version);

const margin = { top: 30, right: 30, bottom: 30, left: 30 };
const width = window.innerWidth - margin.left - margin.right;
const height = window.innerHeight - margin.top - margin.bottom;
const radius = 3;
const verticalSpacing = radius * 2.5;

let allData = [];
let filteredData = [];
let yearRange = [0, 0];
let ratingRange = [0, 10];
let directorFilter = "";

const svg = d3.select("#vis")
    .append("svg")
    .attr('width', width)
    .attr('height', height - 350)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("#tooltip");

// const tooltip = d3.select("body").append("div")
//     .attr("class", "tooltip")
//     .style("position", "absolute")
//     .style("visibility", "hidden")
//     .style("padding", "10px")
//     .style("background", "rgba(0,0,0,0.7)")
//     .style("color", "#fff")
//     .style("border-radius", "3px");

function init() {
    d3.csv("./data/imdbMoviesCleaned.csv", d => ({
        index: +d.index,
        title: d.primaryTitle,
        year: +d.startYear,
        genres: d.genres,
        adult: +d.isAdult,
        director: d.directorNames,
        averageRating: +d.averageRating,
        numRatings: +d.numRatings,
        weightedRating: +d.weightedRating
    }))
    .then(data => {
        allData = data;
        setupSelector();
        updateVis();
    })
    .catch(error => console.error("Data load error:", error));
}

// SETUP FILTERS
function setupSelector() {
    const minYear = d3.min(allData, d => d.year);
    const maxYear = d3.max(allData, d => d.year);
    yearRange = [minYear, maxYear];

    const minRating = d3.min(allData, d => d.averageRating);
    const maxRating = d3.max(allData, d => d.averageRating);
    ratingRange = [minRating, maxRating];

    const yearSlider = d3.sliderHorizontal()
        .min(minYear)
        .max(maxYear)
        .step(1)
        .displayValue(true)
        .width(width - 60)
        .default([minYear, maxYear])
        .on('onchange', val => {
            yearRange = val;
            updateVis();
        });

    const ratingSlider = d3.sliderHorizontal()
        .min(0)
        .max(10)
        .step(0.1)
        .displayValue(true)
        .width(width - 60)
        .default([0, 10])
        .on('onchange', val => {
            ratingRange = val;
            updateVis();
        });

    d3.select("#yearSlider")
        .append("svg")
        .attr("width", width)
        .attr("height", 70)
        .append("g")
        .attr("transform", "translate(30,20)")
        .call(yearSlider);

    d3.select("#ratingSlider")
        .append("svg")
        .attr("width", width)
        .attr("height", 70)
        .append("g")
        .attr("transform", "translate(30,20)")
        .call(ratingSlider);

    d3.select("#directorSearch")
        .on("input", () => {
            directorFilter = d3.select("#directorSearch").property("value").toLowerCase();
            updateVis();
        });
    
    d3.select("#adultCheck").on("change", updateVis);

}

// UPDATE VISUALIZATION
function updateVis() {
    const showAdult = d3.select("#adultCheck").property("checked");
    console.log("adult:", showAdult);

    filteredData = allData.filter(d =>
        d.year >= yearRange[0] &&
        d.year <= yearRange[1] &&
        d.averageRating >= ratingRange[0] &&
        d.averageRating <= ratingRange[1] &&
        (!directorFilter || (d.director && d.director.toLowerCase().includes(directorFilter))) &&
        (+d.adult == showAdult)
    );

    const yearGroups = d3.group(filteredData, d => d.year);
    const years = Array.from(yearGroups.keys()).sort(d3.ascending);
    //const maxMoviesInYear = d3.max(Array.from(yearGroups.values(), g => g.length));
    const requiredHeight = height - 350;
    //const requiredHeight = maxMoviesInYear * verticalSpacing + margin.top + margin.bottom;

    svg.selectAll("*").remove(); // Clear previous

    const x = d3.scaleBand()
        .domain(years)
        .range([0, width - margin.left - margin.right])
        .padding(0.2);

    svg.append("g")
        .attr("transform", `translate(0,${requiredHeight - margin.bottom - margin.top})`)
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
                .on('mouseover', function (event) {
                    d3.select('#tooltip')
                        .style("display", 'block') 
                        .style("visibility", "visible")
                        .html(`
                            <strong>${d.title}</strong><br>
                            Year: ${d.year}<br>
                            Rating: ${d.averageRating}<br>
                            Adult: ${d.adult}<br>
                            Director: ${d.director || "N/A"}
                        `)
                        .style("left", (event.pageX + 20) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function (event) {
                    d3.select('#tooltip')
                        .style('display', 'none')
                    d3.select(this) 
                        .style('stroke', 'none')
                })
        });
    });
}

window.addEventListener("load", init);