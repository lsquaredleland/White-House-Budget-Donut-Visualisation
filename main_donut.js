var dataset;
var budget = [];
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
		analyze(budget);//similar to a callback in a sense
	}
}
function analyze(budget){
	function addingCallback(budget, input){
		var sum = 0;
		for(val in budget){
			sum += budget[val][input];
		}
		console.log('sum for ' + input + ': ' + sum)
	}
	addingCallback(budget, "yr2010");
	addingCallback(budget, "yr2012");
	addingCallback(budget, "yr2014");
	addingCallback(budget, "yr2016");
	addingCallback(budget, "yr2018");
	addingCallback(budget, "yr2020");

	//this is to generate aggregate information
	var previous = budget[0].agency;
	var sum_ageny = 1;
	var grand_total = 0;
	var grand_total_0 = 0;
	var grand_total_abs10k = 0;
	var agency_budget = 0;//note this is an aggregate
	var donutData = [];
	for(i in budget){
		if(budget[i].agency != previous){
			grand_total += 1;
			console.log(previous + " : " + sum_ageny + " : " + agency_budget);
			if(agency_budget == 0)
				grand_total_0 += 1;

			//if an agency spends > 10K -> will be on graph
			if(Math.abs(agency_budget) > 10000){
				grand_total_abs10k += 1
				donutData.push({
					budget: agency_budget,
					agency: budget[i].agency,
					placeholderVal: 10
				});
			}

			agency_budget = budget[i].yr2020;
			sum_ageny = 1;
			previous = budget[i].agency;
		}
		else{
			sum_ageny += 1;
			agency_budget += budget[i].yr2020;
		}
	}
	console.log('num of Agencies: ' + grand_total);
	console.log('num of Agencies with funding: ' + (grand_total - grand_total_0));
	console.log('num of Agencies with abs funding > 10k: ' + (grand_total_abs10k));
	generateDonut(donutData)
}


//This is where the file is being loaded -> then parsed
d3.csv('budauth.csv', function(data) {
	process(data)
}, function(error, rows) {
	console.log(error);
	console.log(rows);
});


function generateDonut(donutData){
	//turn this into a dict -> thus when mouse over -> can present more info
	//note must also pass in a key to access
	//need to setup a scale -> log is best

	//var sum = d3.sum(donutData);  

	var divH = parseInt( d3.select("#chartArea").style("height") );
	var divW = parseInt( d3.select("#chartArea").style("width") );

	var margin = {top: 10, right: 10, bottom: 10, left: 10};
	var w = divW - margin.left - margin.right;
	h = divH - margin.top - margin.bottom;
	smallestDim = h < w ? h : w;

	var max = d3.max(donutData, function(d){ return +d.budget; });

	var rad = d3.scale.pow().exponent(.25)
    .domain([0, max])
    .rangeRound([0, 200]);

  console.log(max + " : " + rad(1000000));


	var outerRadius = smallestDim / 2.2 - 140,
	    innerRadius = outerRadius / .9;

	var pie = d3.layout.pie()
		.value(function(d) { return d.placeholderVal; })
	  .padAngle(.015);

	var arc = d3.svg.arc()
	    .padRadius(outerRadius)
	    .innerRadius(innerRadius);

	var svg = d3.select("#chartArea").append("svg")
	    .attr("width", w)
	    .attr("height", h + 50)//to prevent cut off when gets larger
	  .append("g")
	    .attr("transform", "translate(" + w / 2 + "," + (h) / 2 + ")");

	//text
	svg.append("text")
		.attr("id", "title_pie2")
		.attr("text-anchor", "middle")
		.attr("transform","translate(" + innerRadius/6 + "," + (-innerRadius/6) + ")");
	// d3.select('#title_pie2').html("Sources of Links");
	svg.append("text")
		.attr("id", "valueOutput")
		.attr("text-anchor", "middle")
		.attr("transform","translate(" + innerRadius/20 + "," + innerRadius/24 + ")");
	d3.select('#valueOutput').html("");
	svg.append("text")
		.attr("id", "valueSource")
		.attr("text-anchor", "middle")
		.attr("transform","translate(" + innerRadius/20 + "," + (innerRadius/24 + 24) + ")");
	d3.select('#valueSource').html("Hover to View");

	svg.selectAll("path")
	    //.data(pie(donutData, function(d){ d.placeholderVal; }))
	    .data(pie(donutData))
	  .enter().append("path")
	    .each(function(d) { d.outerRadius = outerRadius + rad(d.data.budget); })//need log scale
	    .attr("d", arc)
	    .on("mouseover", function(d) {
	    	d3.select("#valueOutput").html(d.data.agency);
	      d3.select("#valueSource").html('$' + formatNumber(d.data.budget));

	    	console.log(d.data.agency + " : " + d.data.budget);
	      arcTween(outerRadius + 50, 0);
	    })
	    //.on("mouseover.lol", arcTween(outerRadius + 50, 0))
	    //.on("mouseout", arcTween(outerRadius - 20, 150));
}

//add commas to numbers to make them more readable
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
	