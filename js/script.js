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

/* color palette for legends */
const legend_colors = [
    "#dc143c", //crimson - 1
    "#008000", //green - 2
    "#7f007f", //purple - 3
    "#ce0cff", //grape purple - 4
    "#ccd72e", //beige yellow - 5
    "#5f9ea0", //cadet blue - 6
    "#ffa500", //orange - 7
    "#556b2f", //dark olive green - 8
    "#8b4513", //brown - 9
    "#26b999", //dark lime - 10 
    "#d8bfd8", //thistle - 11
    "#6495ed", //cornflower - 12
    "#ffdd00", //yellow - 13 
    "#9acd32", //yellow green - 14
    "#db7093", //pale violet red - 15
    "#7b68ee", //medium slate blue - 16
    "#ff1493", //deep pink - 17
    "#00fa9a", //medium spring green - 18
    "#ee82ee", //violet - 19
    "#00ffff", //aqua - 20
    "#ff00ff", //fuchsia - 21
    "#0000ff", //blue - 22
    "#5e5e5e", //gray - 23 
];

//setting colors for genre colors on legend
const genreColor = d3.scaleOrdinal(legend_colors);

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

/* Change the legend colors as genres are clicked/unclicked */
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
    const sliderWidth = Math.min(1060, width-45);

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

    //checkbox container
    const checkboxContainer = d3.select("#genreCheckboxes");

    //get emoji
    function emoji(genre){
       switch (genre) {
        case 'Action':
            return '128074'
        case 'Adventure':
            return '127957'
        case 'Animation':
            return '127912'
        case 'Biography':
            return '128218'
        case 'Comedy':
            return '128514'
        case 'Crime':
            return '128110'
        case 'Documentary':
            return '127909'
        case 'Drama':
            return '127917'
        case 'Family':
            return '128106'
        case 'Fantasy':
            return '129412'
        case 'Film-Noir':
            return '127747'
        case 'History':
            return '128511'
        case 'Horror':
            return '128123'
        case 'Music':
            return '127929'
        case 'Musical':
            return '127908'
        case 'Mystery':
            return '10067'
        case 'News':
            return '128240'
        case 'Romance':
            return '128536'
        case 'Sci-Fi':
            return '128640'
        case 'Sport':
            return '127944'
        case 'Thriller':
            return '128561'
        case 'War':
            return '128299'
        case 'Western':
            return '129312'
        default:
            return '127957'        
       }
    }
    checkboxContainer.selectAll("label")
        .data(genres)
        .enter()
        .append("label")
        .style("display", "block")
        .html(genre => `<input type="checkbox" value="${genre}" class="genre-checkbox"> ${genre} &#${emoji(genre)};`);

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

    
    {
    //start stats table code

    //helper functions for stats
    function findMean(arr){
        return arr.reduce((a, b) => a + b) / arr.length
    }
    function standardDeviation(arr, usePopulation = false) {
        if (!Array.isArray(arr) || arr.length === 0) {
            return 0;
        }
        const n = arr.length;
        const mean = arr.reduce((a, b) => a + b) / n;
        const variance = arr.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / (n - (usePopulation ? 0 : 1));
        return Math.sqrt(variance);
    }
    function findMedian(arr) {
        const sortedArr = [...arr].sort((a, b) => a - b);
        const arrLength = sortedArr.length;
        const middleIndex = Math.floor(arrLength / 2);

        if (arrLength % 2 === 0) {
            return (sortedArr[middleIndex - 1] + sortedArr[middleIndex]) / 2;
        } else {
            return sortedArr[middleIndex];
        }
    }
    function countNullElements(arr) {
  let count = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === null) {
      count++;
    }
  }
  return count;
    }
    function countZeros(arr) {
        let count = 0;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] === 0) {
            count++;
            }
        }
        return count;
    }
    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    
    //ratings stats
    onlyRatings = dotPlotData.map(x => x.averageRating)
    meanRating = findMean(onlyRatings).toFixed(2)
    stdDevRating = standardDeviation(onlyRatings).toFixed(2)    
    medianRating = findMedian(onlyRatings).toFixed(2)
    minRating = Math.min(...onlyRatings)
    maxRating = Math.max(...onlyRatings)

    //boxOffice stats
    onlyBoxOffice = dotPlotData.map(x => x.boxOffice).filter(x => x > 0)    
    meanBoxOffice = findMean(onlyBoxOffice).toFixed(0)
    stdDevBoxOffice = standardDeviation(onlyBoxOffice).toFixed(0)    
    medianBoxOffice = findMedian(onlyBoxOffice).toFixed(0)
    minBoxOffice = Math.min(...onlyBoxOffice)
    maxBoxOffice = Math.max(...onlyBoxOffice)
    totalBoxOffice = onlyBoxOffice.reduce((sum, num) => sum + num, 0);

    //countPerYear
    numMoviesPerYear = years.map(y =>  yearGroups.get(y).length)    
    meanCountPerYear = findMean(numMoviesPerYear).toFixed(2)
    stdDevCountPerYear = standardDeviation(numMoviesPerYear).toFixed(2)
    medianCountPerYear = findMedian(numMoviesPerYear)
    minCountPerYear = Math.min(...numMoviesPerYear)
    maxCountPerYear = Math.max(...numMoviesPerYear)    
    countMovies = dotPlotData.length;
    
    //create table
    table = 
        `    
            <table>
                <tr>
                    <th><b>Statistic</b></th>
                    <th><b>Rating</b></th>
                    <th><b>Worldwide Earnings</b></th>
                    <th><b>Count per Year</b></th>
                </tr>
                <tr>
                    <td><b>Mean</b></td>
                    <td>${meanRating}</td>
                    <td>$${numberWithCommas(meanBoxOffice)}</td>
                    <td>${meanCountPerYear}</td>
                </tr>                
                <tr>
                    <td><b>Std Dev</b></td>
                    <td>${stdDevRating}</td>
                    <td>$${numberWithCommas(stdDevBoxOffice)}</td>
                    <td>${stdDevCountPerYear}</td>
                </tr>
                <tr>
                    <td><b>Median</b></td>
                    <td>${medianRating}</td>
                    <td>$${numberWithCommas(medianBoxOffice)}</td>
                    <td>${medianCountPerYear}</td>
                </tr>
                <tr>
                    <td><b>Min</b></td>
                    <td>${minRating}</td>
                    <td>$${numberWithCommas(minBoxOffice)}</td>
                    <td>${minCountPerYear}</td>
                </tr>
                <tr>
                    <td><b>Max</b></td>
                    <td>${maxRating}</td>
                    <td>$${numberWithCommas(maxBoxOffice)}</td>
                    <td>${maxCountPerYear}</td>
                </tr>
                <tr>
                    <td><b>Total</b></td>
                    <td>N/A</td>
                    <td>$${numberWithCommas(totalBoxOffice)}</td>
                    <td>${countMovies}</td>
                </tr>
            </table>
        `
    //append table
    document.getElementById("stats").innerHTML= table
    d3.selectAll("#invisible-centering-thing").style("width","400px")

    //end stats table code
    }

    // dot plot visualization is selected in Movie Hub
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
        function determinePointSizeByYAxis(maxCount){
            if(maxCount < 10){
                return 15
            }
            if(maxCount < 20){
                return 10
            }
            return ((svgHeight/2)-100)/maxCount
        }
        if (currentYAxisMode === "count") {   
            const maxCount = d3.max(years, year => yearGroups.get(year).length);
            biggestSizeByXAxis = (1/(yearRange[1]-yearRange[0]+1))*(width - 300)
            biggestSizeByYAxis = Math.max(3,determinePointSizeByYAxis(maxCount))
            pointSize = Math.min(biggestSizeByYAxis,biggestSizeByXAxis);
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
                        .attr("r", pointSize)
                        .attr("fill", genreColor(d.genre))
                        .on('mouseover', function(event) {
                            d3.select(this)
                                .transition()
                                .duration(100)
                                .attr("r", Math.max(6,pointSize*1.5))
                                .attr("stroke", "black")
                                .attr("stroke-width", 1);
            
                            tooltip
                                .style("display", 'block')
                                .style("visibility", "visible")
                                .html(`
                                    <img src=  "https://image.tmdb.org/t/p/original/${d.poster}" height="300" alt= "movie poster"><br>
                                    <strong>${d.title}</strong><br>
                                    Genres: ${d.genres}<br>
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
                                .attr("r", pointSize)
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
                                    <img src=  "https://image.tmdb.org/t/p/original/${d.poster}" height="300" alt= "movie poster"><br>
                                    <strong>${d.title}</strong><br>
                                    Genres: ${d.genres}<br>
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
                                    <img src="https://image.tmdb.org/t/p/original/${d.poster}" height="300"><br>
                                    <strong>${d.title}</strong><br>
                                    Genres: ${d.genres}<br>
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
        // stream graph visualization is selected in Movie Hub
    } else if (currentActiveVis === "streamgraph") {
        drawStreamgraph(streamgraphData, genreFilter);
    }
}

// code to create stream graph
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
        .style("fill", d => genreColor(d.key))
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
    
}

window.addEventListener("load", init);