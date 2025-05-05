// Set dimensions
const margin = {top: 20, right: 20, bottom: 30, left: 50};
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const svg = d3
  .select("#chart")
  .append("svg")
  .attr(
    "viewBox",
    `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`
  )
  .attr("preserveAspectRatio", "xMidYMid meet");

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

// Parse the date
const parseDate = d3.timeParse("%m/%d/%y");

// Load Data
d3.csv("data.csv").then((data) => {
  // Clean the data
  let lastValidCavco = null;
  let lastValidRGUSDHB = null;

  data.forEach((d) => {
    d.date = parseDate(d.date);

    d["Cavco US Equity"] = d["Cavco US Equity"] === "" ? NaN : +d["Cavco US Equity"];
    d["RGUSDHB Index"] = d["RGUSDHB Index"] === "" ? NaN : +d["RGUSDHB Index"];

    if (!isNaN(d["Cavco US Equity"])) {
      lastValidCavco = d["Cavco US Equity"];
    } else if (lastValidCavco !== null) {
      d["Cavco US Equity"] = lastValidCavco; // 补成上一个有效值
    }

    if (!isNaN(d["RGUSDHB Index"])) {
      lastValidRGUSDHB = d["RGUSDHB Index"];
    } else if (lastValidRGUSDHB !== null) {
      d["RGUSDHB Index"] = lastValidRGUSDHB; // 补成上一个有效值
    }
  });

  // Sort data by date
  data.sort((a, b) => d3.ascending(a.date, b.date));

  // Set scales
  const x = d3
    .scaleTime()
    .domain([
      d3.timeDay.offset(
        d3.min(data, (d) => d.date),
        -5
      ), // 左边往前推5天
      d3.timeDay.offset(
        d3.max(data, (d) => d.date),
        5
      ), // 右边往后推5天
    ])
    .range([0, width]);

  const y = d3
    .scaleLinear()
    .domain([
      d3.min(data, (d) => Math.min(d["Cavco US Equity"], d["RGUSDHB Index"])) - 5,
      d3.max(data, (d) => Math.max(d["Cavco US Equity"], d["RGUSDHB Index"])) + 5,
    ])
    .range([height, 0]);

  // Define the two lines with defined()
  const line1 = d3
    .line()
    .defined((d) => !isNaN(d["Cavco US Equity"]))
    .x((d) => x(d.date))
    .y((d) => y(d["Cavco US Equity"]))
    .curve(d3.curveMonotoneX);

  const line2 = d3
    .line()
    .defined((d) => !isNaN(d["RGUSDHB Index"]))
    .x((d) => x(d.date))
    .y((d) => y(d["RGUSDHB Index"]))
    .curve(d3.curveMonotoneX);

  // Draw lines
  svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#0072ce")
    .attr("stroke-width", 2)
    .attr("d", line1);

  svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", 2)
    .attr("d", line2);

  // Add Y Axis on right side
  svg
    .append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${width + 10}, 0)`)
    .call(
      d3
        .axisRight(y)
        .ticks(8)
        .tickFormat((d) => d)
    )
    .selectAll("path, line")
    .remove();

  svg
    .select(".y-axis .tick:first-of-type")
    .append("text")
    .attr("x", 15)
    .attr("dy", "0.32em")
    .style("font-size", "12px")
    .text("%");

  svg.selectAll(".y-axis .tick text").each(function (d) {
    const text = d3.select(this);
    if (text.text() === "50") {
      // 👈
      text.text("50%"); // 👈
    }
  });

  // Draw 0 horizontal line

  svg
    .append("line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", y(0))
    .attr("y2", y(0))
    .attr("stroke", "black")
    .attr("stroke-width", 1);

  // Add X Axis without domain line
  svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(d3.timeMonth.every(2)))
    .call((g) => g.select(".domain").remove());

  // Add Legends
  // Legend group
  // 先删除旧的 legend，避免窗口变化重复叠加
  svg.selectAll(".legend").remove();

  // 重新添加 legend
  const legend = svg.append("g").attr("class", "legend").attr("transform", `translate(10, 10)`); // 左上角一点，10px 10px

  const legendData = [
    {name: "Cavco US Equity", color: "steelblue"},
    {name: "RGUSDHB Index", color: "black"},
  ];

  // 一行一个legend item
  legend
    .selectAll("g")
    .data(legendData)
    .enter()
    .append("g")
    .attr("transform", (d, i) => `translate(0, ${i * 20})`) // 每行间隔20px
    .each(function (d) {
      d3.select(this)
        .append("line")
        .attr("x1", 0)
        .attr("y1", 5)
        .attr("x2", 20)
        .attr("y2", 5)
        .attr("stroke", d.color)
        .attr("stroke-width", 3);

      d3.select(this)
        .append("text")
        .attr("x", 25)
        .attr("y", 5)
        .style("font-size", "12px")
        .style("alignment-baseline", "middle")
        .text(d.name);
    });

  // Create group for focus elements
  const focus = svg.append("g").style("display", "none");

  // 竖线
  focus
    .append("line")
    .attr("class", "focusLine")
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .attr("y1", 0)
    .attr("y2", height);

  // 小圆圈 for each line
  const focusCircle1 = focus
    .append("circle")
    .attr("r", 4)
    .attr("stroke", "#0072ce")
    .attr("fill", "white")
    .attr("stroke-width", 2);

  const focusCircle2 = focus
    .append("circle")
    .attr("r", 4)
    .attr("stroke", "black")
    .attr("fill", "white")
    .attr("stroke-width", 2);

  // Tooltip div
  const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

  // 创建一个透明的矩形，接管鼠标事件
  svg
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all")
    .on("mouseover", () => {
      focus.style("display", null);
      tooltip.style("opacity", 1);
    })
    .on("mouseout", () => {
      focus.style("display", "none");
      tooltip.style("opacity", 0);
    })
    .on("mousemove", mousemove);

  function mousemove(event) {
    const bisectDate = d3.bisector((d) => d.date).left;
    const x0 = x.invert(d3.pointer(event)[0]);
    const i = bisectDate(data, x0, 1);
    const d0 = data[i - 1];
    const d1 = data[i];
    const d = x0 - d0.date > d1.date - x0 ? d1 : d0;

    const focusX = x(d.date);

    focus.select(".focusLine").attr("x1", focusX).attr("x2", focusX);

    focusCircle1.attr("cx", focusX).attr("cy", y(d["Cavco US Equity"]));

    focusCircle2.attr("cx", focusX).attr("cy", y(d["RGUSDHB Index"]));

    tooltip
      .html(
        `
    <div><strong>${d3.timeFormat("%Y/%m/%d")(d.date)}</strong></div>
    <div style="margin-top: 4px;">
        <span style="color:#0072ce;">&#9632;</span> ${d["Cavco US Equity"].toFixed(1)}%
    </div>
    <div>
        <span style="color:black;">&#9632;</span> ${d["RGUSDHB Index"].toFixed(1)}%
    </div>
`
      )

      .style("left", event.pageX - 100 + "px") // -160是为了让tooltip在竖线左边一点
      .style("top", event.pageY - 80 + "px"); // -80让tooltip不要挡住线
  }
});
