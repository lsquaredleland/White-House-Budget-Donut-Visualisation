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
	var current_agency = budget[0].agency;
	var number_of_agency = 1;
	var grand_total = 0;
	var grand_total_0 = 0; //number of agency with 0 budget
	var grand_total_abs10k = 0;
	var agency_budget = 0;//note this is an aggregate
	var donutData = [];
	var transfer_information = [];
	var target_year = 'yr2020';

	for(i in budget){
		if(budget[i].agency == current_agency){//how to make the data more consistant...
			number_of_agency += 1;
			agency_budget += budget[i][target_year];
			transfer_information.push(budget[i])
		}
		else{//if the agencies are not matching
			grand_total += 1;
			console.log(current_agency + " : " + number_of_agency + " : " + agency_budget);
			if(agency_budget == 0)
				grand_total_0 += 1;

			//if an agency spends > 10K -> will be on graph
			if(Math.abs(agency_budget) > 10000){
				grand_total_abs10k += 1
				donutData.push({
					//could push an array/object that contains all the children
					//-> can be accessed later when chart is manipulated
					details: transfer_information,
					budget: agency_budget,
					agency: current_agency, //this is where fixed mismatched
					placeholderVal: 10
				});
			}

			agency_budget = budget[i][target_year];
			sum_agency = 1;
			current_agency = budget[i].agency;
			transfer_information = [];
		}
	}
	console.log('num of Agencies: ' + grand_total);
	console.log('num of Agencies with funding: ' + (grand_total - grand_total_0));
	console.log('num of Agencies with abs funding > 10k: ' + (grand_total_abs10k));
	generateDonut(donutData)
}


//This is where the file is being loaded -> then parsed
d3.csv('data/budauth.csv', function(data) {
	process(data)
}, function(error, rows) {
	console.log(error);
	console.log(rows);
});


function generateDonut(donutData){
	var divH = parseInt( d3.select("#chartArea").style("height") );
	var divW = parseInt( d3.select("#chartArea").style("width") );

	var margin = {top: 10, right: 10, bottom: 10, left: 10};
	var w = divW - margin.left - margin.right;
	h = divH - margin.top - margin.bottom;
	smallestDim = h < w ? h : w;

	var max = d3.max(donutData, function(d){ return +d.budget; });

	var rad = d3.scale.pow()//log would be better
		.exponent(.25)
    .domain([0, max])
    .rangeRound([0, 200]);

	var outerRadius = smallestDim / 2.2 - 140,
	    innerRadius = outerRadius / 1;

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
	    .data(pie(donutData))
	  .enter().append("path")
	    .each(function(d) { d.outerRadius = outerRadius + rad(d.data.budget); })//need log scale
	    .attr("d", arc)
	    .on("mouseover", function(d) {
	    	d3.select("#valueOutput").html(d.data.agency);
	      d3.select("#valueSource").html('$' + formatNumber(d.data.budget));

	    	console.log(d.data.agency + " : " + d.data.budget);
	    })
	    .on("click", function(d) {
	    	console.log(d.data.details)
	    })
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
	