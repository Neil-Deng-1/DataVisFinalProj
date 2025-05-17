console.log('D3 Version:', d3.version);

const margin = { top: 30, right: 80, bottom: 60, left: 80 };
const width = window.innerWidth - margin.left - margin.right;
const svgHeight = 600;

let allData = [];
let dotPlotData = [];
let streamgraphData = [];
let yearRange = [0, 0];
let ratingRange = [0, 10];
let directorFilter = "";
let titleFilter = "";
let genreFilter = [];
let currentYAxisMode = "count"; // "count", "rating", "boxoffice"
let currentActiveVis = "dotPlot";

const genreColor = d3.scaleOrdinal(d3.schemeCategory10);

// Dotplot SVG setup
const svg = d3.select("#vis")
    .append("svg")
    .attr("width", width)
    .attr("height", svgHeight);

const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

g.append("text")
    .attr("id", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -((svgHeight - margin.top - margin.bottom) / 2))
    .attr("y", -margin.left + 15)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Y Axis");

// Streamgraph SVG setup
const streamgraphSvg = d3.select("#streamgraph-vis-container")
    .append("svg")
    .attr("id", "streamgraph-svg-element")
    .attr("width", width)
    .attr("height", svgHeight);

const streamgraphG = streamgraphSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);    

const tooltip = d3.select("#tooltip");

function init() {
    d3.select("#tab-dotplot").on("click", function() {
        if (currentActiveVis === "dotPlot") return;
        currentActiveVis = "dotPlot";
        d3.selectAll(".tab-button").classed("active", false);
        d3.select(this).classed("active", true);
        d3.select("#vis").classed("hidden", false);
        d3.select("#streamgraph-vis-container").classed("hidden", true);
        d3.select("#y-axis-control-wrapper").classed("hidden", false);
        updateVis();
    });

    d3.select("#tab-streamgraph").on("click", function() {
        if (currentActiveVis === "streamgraph") return;
        currentActiveVis = "streamgraph";
        d3.selectAll(".tab-button").classed("active", false);
        d3.select(this).classed("active", true);
        d3.select("#vis").classed("hidden", true);
        d3.select("#streamgraph-vis-container").classed("hidden", false);
        d3.select("#y-axis-control-wrapper").classed("hidden", true);
        updateVis();
    });

    d3.csv("./data/popularMoviesBoxOfficeAndPoster.csv", d => ({
        index: +d.index,
        id: d.tconst,
        title: d.primaryTitle,
        year: +d.startYear,
        genres: d.genres,
        director: d.directorNames,
        averageRating: +d.averageRating,
        numRatings: +d.numRatings,
        weightedRating: +d.weightedRating,
        boxOffice: + d.worldwideBoxOffice,
        releaseDate: d.releaseDate,
        poster: d.poster
    }))
    .then(data => {
        allData = data;
        setupSelector();
        updateVis();
    })
    .catch(error => console.error("Data load error:", error));
}

/* Change the legend colors */
function updateLegend(selectedGenres) {
    const legendContainer = d3.select("#legend");
    legendContainer.selectAll("*").remove(); 

    selectedGenres.forEach(genre => {
        const legendItem = legendContainer.append("div")
            .attr("class", "legend-item")
            .style("display", "flex")
            .style("align-items", "center")
            .style("margin", "4px 0");

        legendItem.append("span")
            .style("width", "15px")
            .style("height", "15px")
            .style("background-color", genreColor(genre))
            .style("display", "inline-block")
            .style("margin-right", "8px");

        legendItem.append("span").text(genre);
    });
}

function setupSelector() {
    const minYear = d3.min(allData, d => d.year);
    const maxYear = d3.max(allData, d => d.year);
    yearRange = [minYear, maxYear];
    const sliderWidth = Math.min(960, width-45);

    const yearSlider = d3.sliderHorizontal()
        .min(minYear)
        .max(maxYear)
        .step(1)
        .displayValue(true)
        .width(sliderWidth)
        .default([minYear, maxYear])
        .tickFormat(d3.format("d"))
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
        .width(sliderWidth)
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


    d3.select("#directorSearch").on("input", () => {
        directorFilter = d3.select("#directorSearch").property("value").toLowerCase();
        updateVis();
    });

    d3.select("#titleSearch").on("input", () => {
        titleFilter = d3.select("#titleSearch").property("value").toLowerCase();
        updateVis();
    });

    d3.select("#y-axis-select").on("change", function () {
        currentYAxisMode = this.value;
        updateVis();
    });

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
        .html(genre => `<input type="checkbox" value="${genre}" class="genre-checkbox"> ${genre}`);

    d3.select("#selectAllGenresBtn").on("click", () => {
        genreFilter = [];
        d3.selectAll(".genre-checkbox").property("checked", true);
        d3.selectAll(".genre-checkbox").each(function () {
            genreFilter.push(this.value);
        });
        updateLegend(genreFilter);
        updateVis();
    });

    d3.select("#clearGenresBtn").on("click", () => {
        d3.selectAll(".genre-checkbox").property("checked", false);
        genreFilter = [];
        updateLegend(genreFilter);
        updateVis();
    });

    // Event listener for checkboxes
    d3.selectAll(".genre-checkbox").on("change", () => {
        genreFilter = [];
        d3.selectAll(".genre-checkbox:checked").each(function() {
            genreFilter.push(this.value);
        });
        updateLegend(genreFilter);
        updateVis();
    });
}

function updateVis() {
    dotPlotData = [];
    streamgraphData = [];
    allData.forEach(d => {
        if (
            d.year >= yearRange[0] &&
            d.year <= yearRange[1] &&
            d.averageRating >= ratingRange[0] &&
            d.averageRating <= ratingRange[1] &&
            (!directorFilter || (d.director && d.director.toLowerCase().includes(directorFilter))) &&
            (!titleFilter || (d.title && d.title.toLowerCase().includes(titleFilter)))
        ) {
            const genres = d.genres ? d.genres.split(',').map(g => g.trim()) : [];
            let addedToDotPlot = false;
            genres.forEach(genre => {
                if (genreFilter.includes(genre)) {
                    // For streamgraph: always push duplicate genres
                    streamgraphData.push({ ...d, genre });

                    // For dot plot: push only the first matching genre
                    if (!addedToDotPlot) {
                        dotPlotData.push({ ...d, genre });
                        addedToDotPlot = true;
                    }
                }
            });
        }
    });
    
    console.log("Genre Filter:", genreFilter);

    console.log("Dot Plot Data:", dotPlotData);
    console.log("Streamgraph Data:", streamgraphData);

    updateLegend(genreFilter);

    let yearGroups;

    if (currentYAxisMode === "boxoffice") {
        const boxOfficeData = dotPlotData.filter(d => d.boxOffice > 0);
        yearGroups = d3.group(boxOfficeData, d => d.year);
    } else {
        yearGroups = d3.group(dotPlotData, d => d.year);
    }
    const years = Array.from(yearGroups.keys()).sort(d3.ascending);

    g.selectAll("*:not(#y-axis-label)").remove(); // Keep y-axis label

    if (currentActiveVis === "dotPlot") {
        const x = d3.scaleBand()
            .domain(years)
            .range([0, width - 100])
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
            g.append("text")
            .attr("class", "x-axis-label")
            .attr("x", width / 2 - 40)
            .attr("y", svgHeight - 40)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Year");

            years.forEach(year => {
                const movies = yearGroups.get(year).slice().sort((a, b) =>
                    a.title.localeCompare(b.title)
                );
                movies.forEach((d, i) => {
                    g.append("circle")
                        .attr("cx", x(year) + x.bandwidth() / 2)
                        .attr("cy", y(i + 1))
                        .attr("r", 3)
                        .attr("fill", genreColor(d.genre))
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
                                    <img src=  "https://image.tmdb.org/t/p/original/${d.poster}" height="200" alt= "movie poster"><br>
                                    <strong>${d.title}</strong><br>
                                    Genre: ${d.genre}<br>
                                    Release Date: ${d.releaseDate}<br>
                                    Rating: ${d.averageRating}<br>
                                    Worldwide Earnings: ${d.boxOffice > 0 ? `$${d.boxOffice.toLocaleString()}` : "N/A"}<br>
                                    Director: ${d.director}<br><br>
                                    <em>click to go visit imdb page <br>in a new tab</em><br>
                                `)
                                .style("left", () => {
                                    const tooltipWidth = 200;
                                    return Math.min(event.pageX + 20, window.innerWidth - tooltipWidth - 20) + "px";
                                })
                                .style("top", () => {
                                    const tooltipHeight = 150;
                                    return Math.max(20, event.pageY - tooltipHeight) + "px";
                                });
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
            g.append("text")
            .attr("class", "x-axis-label")
            .attr("x", width / 2 - 40)
            .attr("y", svgHeight - 40)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Year");

            years.forEach(year => {
                const movies = yearGroups.get(year);
                movies.forEach(d => {
                    g.append("circle")
                        .attr("cx", x(year) + x.bandwidth() / 2)
                        .attr("cy", y(d.averageRating))
                        .attr("r", 4)
                        .attr("fill", genreColor(d.genre))
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
                                    <img src=  "https://image.tmdb.org/t/p/original/${d.poster}" height="200" alt= "movie poster"><br>
                                    <strong>${d.title}</strong><br>
                                    Genre: ${d.genre}<br>
                                    Release Date: ${d.releaseDate}<br>
                                    Rating: ${d.averageRating}<br>
                                    Worldwide Earnings: ${d.boxOffice > 0 ? `$${d.boxOffice.toLocaleString()}` : "N/A"}<br>
                                    Director: ${d.director}<br><br>
                                    <em>click to go visit imdb page <br>in a new tab</em><br>
                                `)
                                .style("left", () => {
                                    const tooltipWidth = 200;
                                    return Math.min(event.pageX + 20, window.innerWidth - tooltipWidth - 20) + "px";
                                })
                                .style("top", () => {
                                    const tooltipHeight = 150;
                                    return Math.max(20, event.pageY - tooltipHeight) + "px";
                                });
                        })
                        .on("mouseout", function() {
                            d3.select(this)
                                .transition()
                                .duration(100)
                                .attr("r", 4)
                                .attr("stroke", "none")
                                .attr("stroke-width", 1);

                            tooltip.style("display", "none");
                        }).on("click", () => {
                            link  = `https://www.imdb.com/title/${d.id}/`
                            window.open(link, '_blank')
                        });
                });
            });
        } else if (currentYAxisMode === "boxoffice") {
            const maxBox = d3.max(dotPlotData, d => d.boxOffice || 0);
            y = d3.scaleLinear()
                .domain([0, maxBox])
                .range([svgHeight - margin.top - margin.bottom, 0]);
        
            g.append("g").call(d3.axisLeft(y).tickFormat(d => d3.format("$.2s")(d).replace("G", "B")));
            d3.select("#y-axis-label").text("Worldwide Box Office");
            g.append("text")
            .attr("class", "x-axis-label")
            .attr("x", width / 2 - 40)
            .attr("y", svgHeight - 40)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Year");
        
            years.forEach(year => {
                const movies = yearGroups.get(year).filter(d => d.boxOffice > 0);
                movies.forEach(d => {
                    const cx = x(year) + x.bandwidth() / 2;
                    const cy = y(d.boxOffice);
        
                    g.append("circle")
                        .attr("cx", cx)
                        .attr("cy", cy)
                        .attr("r", 4)
                        .attr("fill", genreColor(d.genre))
                        .on("mouseover", function(event) {
                            d3.select(this)
                                .transition().duration(100)
                                .attr("r", 8)
                                .attr("stroke", "black");
        
                            tooltip
                                .style("display", "block")
                                .style("visibility", "visible")
                                .html(`
                                    <img src="https://image.tmdb.org/t/p/original/${d.poster}" height="200"><br>
                                    <strong>${d.title}</strong><br>
                                    Genre: ${d.genre}<br>
                                    Release Date: ${d.releaseDate}<br>
                                    Rating: ${d.averageRating}<br>
                                    Worldwide Earnings: ${d.boxOffice > 0 ? `$${d.boxOffice.toLocaleString()}` : "N/A"}<br>
                                    Director: ${d.director}<br><br>
                                    <em>Click to view IMDb</em>
                                `)
                                .style("left", () => {
                                    const tooltipWidth = 200;
                                    return Math.min(event.pageX + 20, window.innerWidth - tooltipWidth - 20) + "px";
                                })
                                .style("top", () => {
                                    const tooltipHeight = 150;
                                    return Math.max(20, event.pageY - tooltipHeight) + "px";
                                });
                        })
                        .on("mouseout", function() {
                            d3.select(this)
                                .transition().duration(100)
                                .attr("r", 4)
                                .attr("stroke", "none");
        
                            tooltip.style("display", "none");
                        })
                        .on("click", () => {
                            window.open(`https://www.imdb.com/title/${d.id}/`, "_blank");
                        });
                });
            });
        }
    } else if (currentActiveVis === "streamgraph") {
        drawStreamgraph(streamgraphData, genreFilter);
    }
}

function drawStreamgraph(sourceData, streamKeys) {
    const streamgraph_chart_height = 500
    streamgraphG.selectAll("*").remove();

    if (streamKeys.length === 0 || sourceData.length === 0) {
        streamgraphG.append("text")
            .attr("x", width / 2)
            .attr("y", svgHeight / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text(streamKeys.length === 0 ? "Select genre(s) to see trends." : "No data matches filters for Streamgraph.");
        return;
    }

    let minStreamYear = yearRange[0];
    let maxStreamYear = yearRange[1];
    const dataMinYear = d3.min(sourceData, d => d.year);
    const dataMaxYear = d3.max(sourceData, d => d.year);
    if (dataMinYear !== undefined) minStreamYear = Math.max(minStreamYear, dataMinYear);
    if (dataMaxYear !== undefined) maxStreamYear = Math.min(maxStreamYear, dataMaxYear);
    
    if (minStreamYear > maxStreamYear) {
        streamgraphG.append("text").attr("x", width / 2).attr("y", svgHeight / 2)
            .attr("text-anchor", "middle").text("No valid year range after filtering.");
        return;
    }

    const streamYears = d3.range(minStreamYear, maxStreamYear + 1);
    if (streamYears.length === 0) {
        streamgraphG.append("text").attr("x", width / 2).attr("y", streamgraph_chart_height / 2)
            .attr("text-anchor", "middle").text("Not enough year range to display trend.");
        return;
    }

    const streamFormattedData = streamYears.map(year => {
        const yearEntry = { year: year };
        streamKeys.forEach(genreKey => { yearEntry[genreKey] = 0; });
        sourceData.forEach(movie => {
            if (movie.year === year) {
                const movieGenres = movie.genres.split(',').map(g => g.trim());
                streamKeys.forEach(genreKey => {
                    if (movieGenres.includes(genreKey)) { yearEntry[genreKey]++; }
                });
            }
        });
        return yearEntry;
    });

    const xStream = d3.scaleLinear()
        .domain(d3.extent(streamFormattedData, d => d.year))
        .range([0, width - 100]);

    streamgraphG.append("g")
        .attr("transform", `translate(0,${streamgraph_chart_height})`)

        .call(d3.axisBottom(xStream).tickValues(streamYears).tickFormat(d3.format("d")))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    streamgraphG.append("text")
        .attr("class", "x-axis-label")
        .attr("x", width / 2 - 40)
        .attr("y", streamgraph_chart_height + 50)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Year");

    const colorStream = d3.scaleOrdinal(d3.schemeCategory10).domain(streamKeys);

    const stack = d3.stack()
        .keys(streamKeys)
        .offset(d3.stackOffsetWiggle)
        .order(d3.stackOrderNone);
    const series = stack(streamFormattedData);

    const yStream = d3.scaleLinear()
        .domain([
            d3.min(series, s => d3.min(s, d => d[0])) || 0,
            d3.max(series, s => d3.max(s, d => d[1])) || 1 
        ])
        .range([streamgraph_chart_height, 0]);

    const areaStream = d3.area()
        .x(d => xStream(d.data.year))
        .y0(d => yStream(d[0]))
        .y1(d => yStream(d[1]))
        .curve(d3.curveBasis);

    streamgraphG.append("g")
        .selectAll(".stream-layer")
        .data(series)
        .join("path")
        .attr("class", "stream-layer")
        .style("fill", d => colorStream(d.key))
        .attr("d", areaStream)
        .on('mouseover', function(event, d_layer) {
            tooltip.style("visibility", "visible").style("display", "block");
            streamgraphG.selectAll(".stream-layer").style("opacity", 0.3);
            d3.select(this).style("opacity", 1).style("stroke", "black").style("stroke-width", "0.5px");
        })
        .on('mousemove', function(event, d_layer) {
            const [mx] = d3.pointer(event, streamgraphG.node());
            const hoveredYear = Math.round(xStream.invert(mx));
            const yearDataPoint = streamFormattedData.find(d => d.year === hoveredYear);
            const value = yearDataPoint ? (yearDataPoint[d_layer.key] || 0) : 0;
            tooltip.html(`<b>${d_layer.key}</b><br>Year: ${hoveredYear}<br>Movies: ${value}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 15) + "px");
        })
        .on('mouseout', function() {
            tooltip.style("visibility", "hidden").style("display", "none");
            streamgraphG.selectAll(".stream-layer").style("opacity", 1).style("stroke", "none");
        });

    const legend = streamgraphG.append("g")
        .attr("class", "streamgraph-legend")
        .attr("transform", `translate(${width + 15}, 0)`);
    streamKeys.forEach((key, i) => {
        const legendItem = legend.append("g").attr("class", "streamgraph-legend-item").attr("transform", `translate(0, ${i * 20})`);
        legendItem.append("rect").attr("x", 0).attr("y", -5).attr("width", 10).attr("height", 10).style("fill", colorStream(key));
        legendItem.append("text").attr("x", 15).attr("y", 0).text(key);
    });
    
}

window.addEventListener("load", init);