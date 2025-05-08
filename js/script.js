console.log('D3 Version:', d3.version);

const margin = { top: 30, right: 30, bottom: 60, left: 60 };
const width = window.innerWidth - margin.left - margin.right;
const svgHeight = 600;

let allData = [];
let filteredData = [];
let yearRange = [0, 0];
let ratingRange = [0, 10];
let directorFilter = "";
let titleFilter = "";
let genreFilter = [];
let currentYAxisMode = "count"; // "count" or "rating"

const svg = d3.select("#vis")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", svgHeight)
    .attr("preserveAspectRatio", "xMidYMid meet");

const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

g.append("text")
    .attr("id", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -svgHeight / 2)
    .attr("y", -45)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Y Axis");

const tooltip = d3.select("#tooltip");

function init() {
    d3.csv("./data/imdbPopularMovies.csv", d => ({
        index: +d.index,
        id: d.tconst,
        title: d.primaryTitle,
        year: +d.startYear,
        genres: d.genres,
        director: d.directorNames,
        averageRating: +d.averageRating,
        numRatings: +d.numRatings,
        weightedRating: +d.weightedRating,
        boxOffice: + d.worldwideBoxOffice
    }))
    .then(data => {
        allData = data;
        setupSelector();
        updateVis();
    })
    .catch(error => console.error("Data load error:", error));
}

function setupSelector() {
    const minYear = d3.min(allData, d => d.year);
    const maxYear = d3.max(allData, d => d.year);
    yearRange = [minYear, maxYear];

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

    d3.select("#yearSlider")
        .append("svg")
        .attr("width", width)
        .attr("height", 70)
        .append("g")
        .attr("transform", "translate(30,20)")
        .call(yearSlider);

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
    d3.select("#titleSearch")
        .on("input", () => {
            titleFilter = d3.select("#titleSearch").property("value").toLowerCase();
            updateVis();
        });
    

    d3.select("#adultCheck").on("change", updateVis);

    const genreSet = new Set();
    allData.forEach(d => {
        if (d.genres) {
            d.genres.split(',').forEach(g => genreSet.add(g.trim()));
        }
    });
    const genres = Array.from(genreSet).sort();

   // Replace dropdown with checkbox container
    const checkboxContainer = d3.select("#genreCheckboxes");


    checkboxContainer.selectAll("label")
        .data(genres)
        .enter()
        .append("label")
        .style("display", "block")
        .html(genre => `
            <input type="checkbox" value="${genre}" class="genre-checkbox"> ${genre}
        `);
    d3.select("#selectAllGenresBtn").on("click", () => {
        genreFilter = [];
        d3.selectAll(".genre-checkbox").property("checked", true);
        d3.selectAll(".genre-checkbox").each(function () {
            genreFilter.push(this.value);
        });
        updateVis();
    });
    d3.select("#clearGenresBtn").on("click", () => {
        d3.selectAll(".genre-checkbox").property("checked", false);
        genreFilter = [];
        updateVis();
    });
    // Event listener for checkboxes
    d3.selectAll(".genre-checkbox").on("change", () => {
        genreFilter = [];
        d3.selectAll(".genre-checkbox:checked").each(function() {
            genreFilter.push(this.value);
        });
        updateVis();
    });

    d3.select("#y-axis-select").on("change", function () {
        currentYAxisMode = this.value;
        updateVis();
    });
}

function updateVis() {

    filteredData = allData.filter(d =>
        d.year >= yearRange[0] &&
        d.year <= yearRange[1] &&
        d.averageRating >= ratingRange[0] &&
        d.averageRating <= ratingRange[1] &&
        genreFilter.some(g => d.genres.split(',').map(x => x.trim()).includes(g)) &&
        (!directorFilter || (d.director && d.director.toLowerCase().includes(directorFilter))) &&
        (!titleFilter || (d.title && d.title.toLowerCase().includes(titleFilter)))
    );

    const yearGroups = d3.group(filteredData, d => d.year);
    const years = Array.from(yearGroups.keys()).sort(d3.ascending);

    g.selectAll("*:not(#y-axis-label)").remove(); // Keep y-axis label

    const x = d3.scaleBand()
        .domain(years)
        .range([0, width])
        .padding(0.2);

    g.append("g")
        .attr("transform", `translate(0,${svgHeight - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    let y;

    if (currentYAxisMode === "count") {
        const maxCount = d3.max(years, year => yearGroups.get(year).length);
        y = d3.scaleLinear()
            .domain([0, maxCount])
            .range([svgHeight - margin.top - margin.bottom, 0]);

        g.append("g").call(d3.axisLeft(y));
        d3.select("#y-axis-label").text("Movie Count");

        years.forEach(year => {
            const movies = yearGroups.get(year).slice().sort((a, b) =>
                a.title.localeCompare(b.title)
            );
            movies.forEach((d, i) => {
                g.append("circle")
                    .attr("cx", x(year) + x.bandwidth() / 2)
                    .attr("cy", y(i + 1))
                    .attr("r", 3)
                    .attr("fill", "steelblue")
                    .on('mouseover', function(event) {
                        d3.select(this)
                            .transition()
                            .duration(100)
                            .attr("r", 6)
                            .attr("stroke", "black")
                            .attr("stroke-width", 1);
        
                        tooltip
                            .style("display", 'block')
                            .style("visibility", "visible")
                            .html(`
                                <strong>${d.title}</strong><br>
                                <em>click to go visit imdb page in new tab</em>
                                Year: ${d.year}<br>
                                Rating: ${d.averageRating}<br>
                                Worldwide Earnings: $${d.boxOffice.toLocaleString()}<br>
                                Director: ${d.director} <br>
                            `)
                            .style("left", (event.pageX + 20) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function() {
                        d3.select(this)
                            .transition()
                            .duration(100)
                            .attr("r", 3)
                            .attr("stroke", "none");
        
                        tooltip.style("display", "none");
                    }).on("click", () => {
                        link  = `https://www.imdb.com/title/${d.id}/`
                        window.open(link, '_blank')
                    });
            });
        });
        
    } else if (currentYAxisMode === "rating") {
        y = d3.scaleLinear()
            .domain([0, 10])
            .range([svgHeight - margin.top - margin.bottom, 0]);

        g.append("g").call(d3.axisLeft(y));
        d3.select("#y-axis-label").text("Rating");

        years.forEach(year => {
            const movies = yearGroups.get(year);
            movies.forEach(d => {
                g.append("circle")
                    .attr("cx", x(year) + x.bandwidth() / 2)
                    .attr("cy", y(d.averageRating))
                    .attr("r", 4)
                    .attr("fill", "darkorange")
                    .on('mouseover', function(event) {
                        d3.select(this)
                            .transition()
                            .duration(100)
                            .attr("r", 8)
                            .attr("stroke", "black")
                            .attr("stroke-width", 1);

                        tooltip
                            .style("display", 'block')
                            .style("visibility", "visible")
                            .html(`
                                <strong>${d.title}</strong><br>
                                <em>click to go visit imdb page in new tab</em>
                                Year: ${d.year}<br>
                                Rating: ${d.averageRating}<br>
                                Worldwide Earnings: $${d.boxOffice.toLocaleString()}<br>
                                Director: ${d.director}
                            `)
                            .style("left", (event.pageX + 20) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function() {
                        d3.select(this)
                            .transition()
                            .duration(100)
                            .attr("r", 4)
                            .attr("stroke", "none");

                        tooltip.style("display", "none");
                    }).on("click", () => {
                        link  = `https://www.imdb.com/title/${d.id}/`
                        window.open(link, '_blank')
                    });
            });
        });
    }
}

window.addEventListener("load", init);
