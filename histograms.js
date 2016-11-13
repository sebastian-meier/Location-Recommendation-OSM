/*jshint -W004 */

var	pg = require('pg'),
    fs = require('fs');

var db = {
	db:"foursquare",
	user: "sebastianmeier",
	pass: ""
};

var client,
	statement,
	pg_conf = {
		database:db.db,
		user:db.user,
		password:db.pass,
		port:5432,
		host:"localhost",
		ssl:false
	};

client = new pg.Client(pg_conf);

client.connect(function(err) {
	if(err) {
		console.error('could not connect to postgres', err);
	}else{
		console.error('good', err);

        init();
    }
});

var histograms = {},
    categories = [],
    bins = 20,
    limits = 1000,
    offset = 0,
    count = 0;

function init(){
    client.query("SELECT * FROM neighborhoods LIMIT 1", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            console.log("categories");

            for(var key in result.rows[0]){
                if(key !== "venues_id"){
                    categories.push(parseInt((key.split("_"))[1]));
                }
            }

            var maxies = "";
            for(var c = 0; c<categories.length; c++){
                if(maxies !== ""){ maxies += ","; }
                maxies += "MAX(cat_"+categories[c]+") AS max_"+categories[c];
            }

            client.query("SELECT "+maxies+" FROM neighborhoods, venues WHERE venues_id = id AND bb = 1", [], function(err, result) {
                if(err){console.log((new Date()), 'error running query', err);}else{

                    console.log("maxies");

                    for(var key in result.rows[0]){
                        var id = (key.split("_"))[1];

                        histograms[id] = {
                            nulls:0,
                            min:0,
                            max:result.rows[0][key],
                            binsize:parseFloat(result.rows[0][key])/bins,
                            bins:[]
                        };

                        for(var i = 0; i<bins; i++){
                            histograms[id].bins.push(0);
                        }
                    }

                    client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE venues_id = id AND bb = 1", [], function(err, result) {
                        if(err){console.log((new Date()), 'error running query', err);}else{
                            console.log("count");

                            count = result.rows[0].c;
                            processResults();
                        }
                    });
                }
            });
        }
    });
}

function processResults(){
    client.query("SELECT * FROM neighborhoods, venues WHERE venues_id = id AND bb = 1 LIMIT "+limits+" OFFSET "+offset, [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{

            console.log(count, offset);

            for(var i = 0; i<result.rows.length; i++){
                var c = result.rows[i];

                for(var key in c){
                    if(key.substr(0,4) === "cat_"){
                        var id = (key.split("_"))[1];
                        var d = clearCat(c[key]);

                        if(d === 0){
                            histograms[id].nulls++;
                        }else{
                            var bid = (Math.ceil(d/histograms[id].binsize)-1);
                            if(bid > bins-1){
                                bid--;
                            }
                            histograms[id].bins[bid]++;
                        }
                    }
                }
            }

            nextProcess();
        }
    });
}

function nextProcess(){
    offset += limits;
    if(offset < count){
        processResults();
    }else{
        afterProcess();
    }
}

function afterProcess(){
    console.log("histogrammed");

    var csv = "category,max,nulls";

        for(var i = 0; i<bins.length; i++){
            csv += ",bin_"+i;
        }

        csv += "\n";

        for(var key in histograms){
            var h = histograms[key];
            csv += h.id+","+h.max+","+h.nulls;
            for(var i = 0; i<bins; i++){
                csv += ","+h.bins[i];
            }
            csv += "\n";
        }

    console.log("csv");

    fs.writeFile(bins+'_histograms.json', JSON.stringify(histograms), function (err) {
        if (err) return console.log(err);
        fs.writeFile(bins+'_histograms.csv', csv, function (err) {
            if (err) return console.log(err);
            process.exit();
        });
    });
}

function clearCat(c){
    var r = c;
    if(c == "NULL"){
        r = 0;
    }else if(c === null){
        r = 0;
    }else if(c == "null"){
        r = 0;
    }else if (isNaN(parseFloat(c))) {
        r = 0;
    }else if (!isFinite(c)){
        r = 0;
    }
    return parseFloat(r);
}
