var budget = []; //only modified once

//crossData = crossfilter()
//This is where the file is being loaded -> then parsed
d3.csv('data/budauth.csv', function(data) {
	crossData.add([data])
	process(data)
}, function(error, rows) {
	console.log(error);
	console.log(rows);
});


function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}
function process(d){
	budget.push({
		agency: d['Agency Name'],
		bureau: d['Bureau Name'],
		account: d['Account Name'],
		bea_category: d['BEA Category'],
		//does ternary operator makes it moderately faster-> no need to parse if '0'
		yr2010: d['2010'] == '0' ? 0 : +replaceAll(',', '', d['2010']),
		yr2012: d['2012'] == '0' ? 0 : +replaceAll(',', '', d['2012']),
		yr2014: d['2014'] == '0' ? 0 : +replaceAll(',', '', d['2014']),
		yr2016: d['2016'] == '0' ? 0 : +replaceAll(',', '', d['2016']),
		yr2018: d['2018'] == '0' ? 0 : +replaceAll(',', '', d['2018']),
		yr2020: d['2020'] == '0' ? 0 : +replaceAll(',', '', d['2020'])
	});
	if(budget.length == 4442){
		analyze(budget, 'yr2020');
	}
}
function overview(budget){
	function yearTotalBudget(budget, input){
		var sum = 0;
		for(val in budget){
			sum += budget[val][input];
		}
		console.log('sum for ' + input + ': ' + sum)
	}

	yearTotalBudget(budget, "yr2010");
	yearTotalBudget(budget, "yr2012");
	yearTotalBudget(budget, "yr2014");
	yearTotalBudget(budget, "yr2016");
	yearTotalBudget(budget, "yr2018");
	yearTotalBudget(budget, "yr2020");
}
crossData = crossfilter()
function analyze(budget, target_year){
	//this is to generate aggregate information
	var current_agency = budget[0].agency;
	var number_of_agency = 1;
	var grand_total = 0;
	var grand_total_0 = 0; //number of agency with 0 budget
	var grand_total_abs10k = 0;
	var agency_budget = 0;//note this is an aggregate
	var agency_budget_pos = 0;
	var agency_budget_neg = 0;
	var refData = {};// d3 viz is bound with an id that can be used to reference this
	var transfer_information = [];// array of budgets within the agency
	var total_budgets = 0;
	var total_budgets_abs = 0;

	for(i in budget){
		if(budget[i].agency == current_agency){
			number_of_agency += 1;
			agency_budget += budget[i][target_year]; //should probably be taking the abs....

			if(budget[i][target_year] > 0)
				agency_budget_pos += budget[i][target_year];
			if(budget[i][target_year] < 0)
				agency_budget_neg += budget[i][target_year];

			total_budgets += budget[i][target_year];
			total_budgets_abs += Math.abs(budget[i][target_year]); 
			//Need to take account for negative numbers, can't do a raw sum..need to have 2 sets of value -> neg + positive..
			transfer_information.push(budget[i])
		}
		else{//if the agencies are not matching
			grand_total += 1;
			console.log(current_agency + " : " + number_of_agency + " : " + agency_budget);
			if(agency_budget == 0){
				grand_total_0 += 1;
			}

			if(Math.abs(agency_budget) > 10000){
				grand_total_abs10k += 1
			}
			
			var rangeLimit = 0;
			if(Math.abs(agency_budget) > rangeLimit){
				refData[i] = {
					details: transfer_information,
					budget: agency_budget,
					budget_positive: agency_budget_pos,
					budget_negative: agency_budget_neg,
					agency: current_agency,
					id: i,
					placeholderVal: 10
				}
			}

			agency_budget = budget[i][target_year];
			agency_budget_pos = budget[i][target_year] >= 0 ? budget[i][target_year] : 0;
			agency_budget_neg = budget[i][target_year] <= 0 ? budget[i][target_year] : 0;
			sum_agency = 1;
			current_agency = budget[i].agency;
			transfer_information = [];
		}
	}
	console.log('num of Agencies: ' + grand_total);
	console.log('num of Agencies with funding: ' + (grand_total - grand_total_0));
	console.log('num of Agencies with abs funding > 10k: ' + (grand_total_abs10k));
	console.log('total budget: ' + total_budgets.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
	console.log('total budget abs: ' + total_budgets_abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
	console.log(refData)
	console.log(Object.keys(refData).length)
	generateDonut(refData)
	//crossData.dimension(function(d){console.log(d)});
	//agency = crossData.dimension(function(d){return['Agency Name']});
	//agency_filtered = agency.filter('Undistributed Offsetting Receipts')

	//what works
	//crossData.groupAll().reduceSum(function(d) { return replaceAll(',', '', d['2020']) }).value()
	//crossData.dimension(function(d){ return d['Agency Name'] }).filter('Social Security Administration').groupAll().reduceSum(function(d) { return replaceAll(',', '', d['2020']) }).value()

}

function generateDonut(refData){
	var divH = parseInt( d3.select("#chartArea").style("height") );
	var divW = parseInt( d3.select("#chartArea").style("width") );

	var margin = {top: 10, right: 10, bottom: 10, left: 10};
	var w = divW - margin.left - margin.right;
	h = divH - margin.top - margin.bottom;
	smallestDim = h < w ? h : w;

	//finding the max, via method similar to array.prototype.map
	var max = d3.max(Object.keys(refData).map(function(value, index) {
		return refData[value].budget_positive
	}));
	console.log("max: " + max);

	var rad = d3.scale.pow()//log would be better
		.exponent(.25)
    .domain([0, max])
    .rangeRound([0, smallestDim / 3.5]);

	var outerRadius = smallestDim / 4.5,
	    innerRadius = outerRadius / 1;

	var id_list = []
	for(key in refData){
		id_list.push({ id: key });
	}
	var pie = d3.layout.pie()
		.value(function(d){ return 10; })// all of input is bound, with i set as 'val'
	  .padAngle(.010);

	var arc = d3.svg.arc()
	    .padRadius(outerRadius)
	    //.innerRadius(innerRadius);

	var lines = [[],[],[],[]];

	var valueline = d3.svg.line()
		.interpolate("cardinal-closed")  //step-after looks cool
	  .x(function(d) { return d[0]; })
	  .y(function(d) { return d[1]; });

	//clear graph on load
	document.getElementById("chartArea").innerHTML = "";


	//Attempted Canvas Integration
	d3.ns.prefix.custom = "http://github.com/mbostock/d3/examples/dom";
	var sketch = d3.select('#chartArea').append('canvas')
			.attr("width", w)
	    .attr("height", h)
	    .classed('top-layer', true)
	    .style('position', 'absolute')
	    .style('z-index', -1)
	    .call(custom)
	  //.append("g") //this breaks code
	    //.attr("transform", "translate(" + w / 2 + "," + (h) / 2 + ")");
	//How to select the item below for redrawing?

	function custom(selection) {
	  selection.each(function() {
	    var root = this;
      var canvas = root.parentNode.appendChild(document.createElement("canvas"));
      var context = canvas.getContext("2d");

	    canvas.style.position = "absolute";
	    canvas.style.top = root.offsetTop + "px";
	    canvas.style.left = root.offsetLeft + "px";
	    canvas.style['z-index'] = -1;

	    d3.timer(redraw);

	    // Clear the canvas and then iterate over child elements.
	    function redraw() {
	      canvas.width = root.getAttribute("width");
	      canvas.height = root.getAttribute("height");
	      for (var child = root.firstChild; child; child = child.nextSibling) draw(child);
	    }

	    function draw(element) { //how to assign a class attribute to this???
	      switch (element.tagName.split("-")[0]) { //sketched way to assign classes....
	        case "circle": {
	          context.strokeStyle = element.getAttribute("strokeStyle");
	          context.beginPath();
	          context.arc(element.getAttribute("x"), element.getAttribute("y"), element.getAttribute("radius"), 0, 2 * Math.PI);
					  context.lineWidth = 1;
	          context.stroke();
	          break;
	        }
	      }
	    }
	  });
	};

	var svg = d3.select("#chartArea").append("svg")
	    .attr("width", w)
	    .attr("height", h)
	  .append("g")
	    .attr("transform", "translate(" + w / 2 + "," + (h) / 2 + ")");

	//text: svg, canvas, foreignObject
	/*svg.append("text")
		.attr("id", "valueOutput")
		.attr("text-anchor", "middle")
		.attr("transform","translate(" + innerRadius/20 + "," + (innerRadius/24 - 12) + ")");
	d3.select('#valueOutput').html("Hover to View");
	svg.append("text")
		.attr("id", "valueSource")
		.attr("text-anchor", "middle")
		.attr("transform","translate(" + innerRadius/20 + "," + (innerRadius/24 + 12) + ")");
	d3.select('#valueSource').html("Total Budget: " + formatNumber(d3.sum(budget)));*/

	var valueText = {h: 200, w: 400};
	svg.append("foreignObject")
		.attr("x", -valueText.w/2)
		//.attr("y", -valueText.h/2)
		.attr("width", valueText.w)
		.attr("height", valueText.w)
		.classed("valueText", true)
		.append("xhtml:body").append("xhtml:p")
		.html("Hover To View <br/>" + "Total Budget: " + formatNumber(d3.sum(budget)));


	//onhover comparison circle
	d3.select('#chartArea').select('svg').append('circle')
  	.classed('distance-circle', true)
  	.attr("cx", w/2)
		.attr("cy", h/2)
		.attr("r", 0);
	sketch.append("custom:circle")
    .attr("x", w/2)
    .attr("y", h/2)
    .attr("radius", 0)
    .attr("strokeStyle", "orange")


	//drawing main chart
	svg.selectAll("path")
			//use to take in id_list...but below doesn't require it...
	    .data(pie(Object.keys(refData).map(function(value, index) {
				return {id: value};
			})))
	  .enter().append("path")
	    .each(function(d) { 
	    	d.outerRadius = innerRadius + rad(refData[d.data.id]['budget_positive']);
	    	d.innerRadius = innerRadius + rad(refData[d.data.id]['budget_negative']);

	    	//How to change the inner radius?? without going negative????
	    	//So that can go in + out... relative to baseline...

	    	//for the lines
	    	var alpha = (d.startAngle + d.endAngle)/2;
	    	var l = d.outerRadius > outerRadius ? d.outerRadius + 20 : d.outerRadius - 20

	    	lines[0].push([alpha, l])
	    	lines[1].push([alpha, l - 5])
	    	lines[2].push([alpha, l - 10])
	    	lines[3].push([alpha, l - 2])
	    })
	    .attr("d", arc)
	    .classed('arcs', true)
	    .style('fill', 'rgb(250, 255, 200)')
	    .on("mouseover", function(d) {
	    	if(typeof d.data.circle == 'undefined' || d.data.circle == false){
	    		//to check to not override selected bars
	    		d3.select(this).style('fill', 'orange');
	    	}

	    	if(d.data.circle == true){
	    		//d3.select(this).style('fill', 'orange');
	    		var alpha = (d.startAngle + d.endAngle)/2;
	    		//stripes
	    		for(var l = d.innerRadius; l < d.outerRadius; l+=5){
		    		var x0 = l * Math.sin(alpha);
						var y0 = l * Math.cos(alpha);

						//find tangental line
						var newAngle = alpha + Math.PI/2;
						var newl = l * Math.PI / Object.keys(refData).length;
						var x2 = x0 + newl * Math.sin(newAngle)
						var y2 = y0 + newl * Math.cos(newAngle)
						var x1 = x0 - newl * Math.sin(newAngle)
						var y1 = y0 - newl * Math.cos(newAngle)

						svg.append("line")
					    .style("stroke-width", "2.5px")
					    .style("stroke", 'orange')
					    .attr("class", 'a' + d.data.id)
					    .attr("x1", x1)
					    .attr("x2", x2)
					    .attr("y1", -y1)
					    .attr("y2", -y2)
					}
	    	}

	    	//How to have a mix colour if arc is highlighted (by maroon) and mouseover?
	    	//Dashed lines or zebra stripes

	    	/*d3.select("#valueOutput").html(refData[d.data.id]['agency']);
	      d3.select("#valueSource").html(
	      	'<tspan x="1">Budget Positive: $' + formatNumber(refData[d.data.id]['budget_positive']) + '</tspan>' + 
	      	'<tspan x="1" dy="15">Budget Negative: $' + formatNumber(refData[d.data.id]['budget_negative']) + '</tspan>' + 
	      	'<tspan x="1" dy="15">Budget: $' + formatNumber(refData[d.data.id]['budget']) + '</tspan>'
	      	);*/
	      d3.select(".valueText").html( //turn this into a table
	      	refData[d.data.id]['agency'] + '<br>' + 
	      	'Budget Positive: $' + formatNumber(refData[d.data.id]['budget_positive']) + '<br>' + 
	      	'Budget Negative: $' + formatNumber(refData[d.data.id]['budget_negative']) + '<br>' + 
	      	'Budget: $' + formatNumber(refData[d.data.id]['budget']) + '<br>'
	      )

	      //animation for .distance-circle to change position over time
	     	 /*d3.selectAll('.distance-circle')
	      	.transition()
	      	.delay(100)
	      	.duration(500)
	      	//.ease('bounce')
	      	.attr('r', d.outerRadius)*/


	      d3.select("circle") //canvas element
		    	.transition()
		    	.delay(100)
		      .duration(500)
		      .attr("radius", d.outerRadius)
	    })
	    .on("mouseout", function(d){
	    	if(d.data.circle == true){
	    		/*d3.select(this)
	    			.transition()
	    			.delay(125)
	    			.duration(250)
	    			.style('fill', 'maroon');*/

	    		svg.selectAll(".a" + d.data.id)
				    .transition()
				    .duration(500)
				    .style('stroke', 'maroon')
				    .remove()
	    	}
	    	if(typeof d.data.circle == 'undefined' || d.data.circle == false){
	    		d3.select(this)
	    			.transition()
	    			.delay(125)
	    			.duration(250)
	    			.style('fill', 'rgb(250, 255, 200)');
	    	}
	    })
	    .on("click", function(d) {
	    	console.log(refData[d.data.id]['details'])

	    	console.log(refData[d.data.id])

	    	//unique identifier for each arc
	    	//what are other ways to associate a comparison circle with the arc?
	    	var id = 'a' + d.data.id 

	    	//Benefit of id reference -> can access central data from anything (as long have it)
	    	//want to have arc come in at a constant rate (pixels/milli)
	    	var time = Math.abs(1/(rad(refData[d.data.id]['budget']) + innerRadius)*1000 * 500);

	    	if(typeof d.data.circle == 'undefined' || d.data.circle == false){
	    		d.data.circle = true; //this creates a new item in the object
	    		d3.select(this).style('fill', 'maroon');

	    		//note there is no data associated with this. [lack of enter()]
		    	/*d3.select('#chartArea').select('svg').append('circle')
		      	.classed('distance-circle-comp', true) //should make this canvas instead
		      	.attr("r", smallestDim)
		      	.attr('id', id)
		      	.attr("cx", w/2)
						.attr("cy", h/2)
						.transition()
						.duration(time) //why does frame rate drop more on fly in than flyout
						.attr("r", d.outerRadius);*/

					sketch.append("custom:circle-" + id) //canvas comparison circle
				    .attr("x", w/2)
				    .attr("y", h/2)
				    .attr("radius", smallestDim)
				    .attr("strokeStyle", "maroon")
				    .transition()
				    .duration(time)
				    .attr("radius", d.outerRadius)

					console.log(d)
					console.log(d3.select('#' + id))
				}
				else{
					/*d3.select('#' + id)
						.transition()
						.delay(100)
						.duration(time*2)
						.attr("r", smallestDim)
						.remove(); 	*/
					d3.select('circle-' + id) //canvas comparison circle
						.transition()
						.delay(100)
						.duration(time*2)
						.attr("radius", smallestDim)
						.remove(); 

					d3.select(this).style('fill', 'orange');
					d.data.circle = false;
				}
	    })

	for(l in lines){
		drawTrace(lines[l]);
	}

	function drawTrace(lines){
		//drawing the lines
		//need to sort..due to d3 intracasies
		//note only one of the value jumps
		lines = lines.slice().sort(function(a, b){
			return a[0] - b[0];
		})
		
		for(i in lines){
			var alpha = lines[i][0];
			var l = lines[i][1];
			var x = l * Math.sin(alpha)
			var y = l * Math.cos(alpha)
			lines[i] = [x,-y]
		}
		svg.append("path")
	    .classed("line", true)
	    .style("fill", "none")
	    .style("stroke-width", "1px")
	    .style("stroke", "black")
	    .attr("d", valueline(lines));
	}

	drawCircle(lines[0])
	function drawCircle(lines){
		var coordinates = []
		for(i in lines){
			var alpha = lines[i][0];
			var l = lines[i][1];
			var x = l * Math.sin(alpha)
			var y = l * Math.cos(alpha)
			coordinates.push([x,-y])
		}
		for(i in coordinates){
			svg.append("circle")
				.classed('circles', function(){
					if(i%2 == 0){ //i references the items in coordinatess
						return true;
					} else return false;
				})
		    .attr('cx', coordinates[i][0])
		    .attr('cy', coordinates[i][1])
		    .attr('r', 4)
		}

		//pulsing of circles
		setInterval(function(){
			d3.selectAll('.circles')
				.transition()
				.attr('r', function() {
          return ((d3.selectAll('.circles').attr('r') != 4) ? 4 : 2);
      	});
		}, 1000)
	}
}

//referencing a dataset rather than binding it to the DOM
//Is it more resource effective?
//Should probably set the refData so do not always have to pass it in -> pass only id + param
function setRef(refData){
	this.refData = refData; // <-how to actually impliment? As do not want to use a global
}
//placing this function outside makes it faster than when place inside generateDonut()
//Why when not reference at all it is faster?
function ref(refData, id, param){ 
	return refData[id][param];
}

//add commas to numbers to make readable
function formatNumber(num) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")
}

//returns a function
function arcTween(outerRadius, delay) {
  return function() {
    d3.select(this).transition().delay(delay).attrTween("d", function(d) {
      var i = d3.interpolate(d.outerRadius, outerRadius);
      return function(t) { d.outerRadius = i(t); return arc(d); };
    });
  };
}
	
setTimeout(function(){
	document.getElementById("btn-1").addEventListener('click', function(){
		console.log('btn-1');
		analyze(budget, 'yr2020');
	})
	document.getElementById("btn-2").addEventListener('click', function(){
		console.log('btn-2');
		analyze(budget, 'yr2018');
	})
	document.getElementById("btn-3").addEventListener('click', function(){
		console.log('btn-3');
		analyze(budget, 'yr2016');
	})
	document.getElementById("btn-4").addEventListener('click', function(){
		console.log('btn-4');
		analyze(budget, 'yr2014');
	})
	document.getElementById("btn-5").addEventListener('click', function(){
		console.log('btn-5');
		analyze(budget, 'yr2012');
	})
	document.getElementById("btn-6").addEventListener('click', function(){
		console.log('btn-6');
		analyze(budget, 'yr2010');
	})
},1000)
