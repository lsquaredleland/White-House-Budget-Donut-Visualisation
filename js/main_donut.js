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
		analyze(budget, 'yr2020');
	}
}
function analyze(budget, target_year){
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

	//this is to generate aggregate information
	var current_agency = budget[0].agency;
	var number_of_agency = 1;
	var grand_total = 0;
	var grand_total_0 = 0; //number of agency with 0 budget
	var grand_total_abs10k = 0;
	var agency_budget = 0;//note this is an aggregate
	var refData = {};// d3 viz is bound with an id that can be used to reference this
	var transfer_information = [];// array of budgets within the agency

	for(i in budget){
		if(budget[i].agency == current_agency){
			number_of_agency += 1;
			agency_budget += budget[i][target_year];
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
			
			if(Math.abs(agency_budget) > 0){
				refData[i] = {
					details: transfer_information,
					budget: agency_budget,
					agency: current_agency,
					id: i,
					placeholderVal: 10
				}
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
	console.log(refData)
	generateDonut(refData)
}


//This is where the file is being loaded -> then parsed
d3.csv('data/budauth.csv', function(data) {
	process(data)
}, function(error, rows) {
	console.log(error);
	console.log(rows);
});


function generateDonut(refData){
	var divH = parseInt( d3.select("#chartArea").style("height") );
	var divW = parseInt( d3.select("#chartArea").style("width") );

	var margin = {top: 10, right: 10, bottom: 10, left: 10};
	var w = divW - margin.left - margin.right;
	h = divH - margin.top - margin.bottom;
	smallestDim = h < w ? h : w;

	//var budget = [for (key of refData) refData[key].budget];
	var budget = []
	for(key in refData){
		budget.push(refData[key].budget);
	}

	var max = d3.max(budget);
	console.log("max: " + max);

	var rad = d3.scale.pow()//log would be better
		.exponent(.25)
    .domain([0, max])
    .rangeRound([0, 200]);

	var outerRadius = smallestDim / 2.2 - 150,
	    innerRadius = outerRadius / 1;

	//because cannot access object literals through accessor functions
	//using arrays instead
	var temp_list = []
	for(key in refData){
		temp_list.push({ id: key });
	}
	var pie = d3.layout.pie()
		.value(function(d){ return 10; })// all of input is bound, with i set as 'val'
	  .padAngle(.010);

	var arc = d3.svg.arc()
	    .padRadius(outerRadius)
	    .innerRadius(innerRadius);

	//clear graph on load
	document.getElementById("chartArea").innerHTML = "";
	var svg = d3.select("#chartArea").append("svg")
	    .attr("width", w)
	    .attr("height", h)
	  .append("g")
	    .attr("transform", "translate(" + w / 2 + "," + (h) / 2 + ")");

	//text
	svg.append("text")
		.attr("id", "valueOutput")
		.attr("text-anchor", "middle")
		.attr("transform","translate(" + innerRadius/20 + "," + innerRadius/24 + ")");
	d3.select('#valueOutput').html("Hover to View");;
	svg.append("text")
		.attr("id", "valueSource")
		.attr("text-anchor", "middle")
		.attr("transform","translate(" + innerRadius/20 + "," + (innerRadius/24 + 24) + ")");
	d3.select('#valueSource').html("Total Budget: " + formatNumber(d3.sum(budget)));

	svg.selectAll("path")
	    .data(pie(temp_list))
	  .enter().append("path")
	    .each(function(d) { d.outerRadius = outerRadius + rad(ref(refData, d.data.id,'budget')); })
	    .attr("d", arc)
	    .style('fill', 'rgba(150, 255, 200, 0.74902)')
	    .style('stroke', '#333')
	    .style('stroke-width', '1.5px')
	    .on("mouseover", function(d) {
	    	if(d.value == 10){
	    		d3.select(this).style('fill', 'orange');
	    	}

	    	d3.select("#valueOutput").html(ref(refData, d.data.id,'agency'));
	      d3.select("#valueSource").html('$' + formatNumber(ref(refData, d.data.id,'budget')));

	      d3.selectAll('.distance-circle').remove();

	      //creating the comparison bands
	      var bands = [-10,0,10]
	      for(i in bands){
	      	createComparisonCircles(bands[i]);
	      }
	      function createComparisonCircles(modifier){
	      	d3.select('#chartArea').select('svg').append('circle')
		      	.attr('class', 'distance-circle')
		      	.attr("cx", w/2)
						.attr("cy", h/2)
						.attr("r", d.outerRadius + modifier);
	      }

	    	console.log(ref(refData, d.data.id,'agency') + " : " + ref(refData, d.data.id,'budget'));
	    })
	    .on("mouseout", function(d){
	    	if(d.value == 10)
	    		d3.select(this).style('fill', 'rgba(150, 255, 200, 0.74902)');
	    })
	    .on("click", function(d) {
	    	console.log(ref(refData, d.data.id,'details'))

	    	console.log(refData[d.data.id])

	    	//what is a better way to represent change rather than modifying d.value?
	    	if(d.value == 10){
	    		d3.select(this).style('fill', 'maroon');//being overridden by CSS...
		    	d3.select('#chartArea').select('svg').append('circle')
		      	.attr('class', 'distance-circle-comp')
		      	.attr("cx", w/2)
						.attr("cy", h/2)
						.attr("r", d.outerRadius);
					d.value = 11;
				}
				else{
					d3.select('.distance-circle-comp').remove();
					d.value = 10;
				}
	    })
}

//referencing a dataset rather than binding it to the DOM
//Is it more resource effective?
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
