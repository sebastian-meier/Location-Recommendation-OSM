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

var cats = {};

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
    return (parseFloat(r)).toFixed(7);
}

function init(){
    client.query("SELECT id, categories_id FROM venues, venues_categories WHERE id = venues_id AND (categories_id = 52 OR categories_id = 26 OR categories_id = 194) AND geom && ST_MakeEnvelope(13.0883536782043,52.3382388102358,13.761131111581,52.6755085785852, 4326)", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            for(var i = 0; i<result.rows.length; i++){
                cats[result.rows[i].id]=result.rows[i].categories_id;
            }

            client.query("SELECT id, latitude, longitude, cat_52, cat_26, cat_194 FROM neighborhoods, venues WHERE id = venues_id AND geom && ST_MakeEnvelope(13.0883536782043,52.3382388102358,13.761131111581,52.6755085785852, 4326)", [], function(err, result) {
                if(err){console.log((new Date()), 'error running query', err);}else{

                    var csv = "id,latitude,longitude,cat_52,cat_26,cat_194,cat\n";

                    for(var i = 0; i<result.rows.length; i++){
                        var tcsv = "";
                        tcsv += result.rows[i].id+","+(parseFloat(result.rows[i].latitude)).toFixed(7)+","+(parseFloat(result.rows[i].longitude)).toFixed(7)+","+clearCat(result.rows[i].cat_52)+","+clearCat(result.rows[i].cat_26)+","+clearCat(result.rows[i].cat_194)+",";
                        if(result.rows[i].id in cats){
                            tcsv += cats[result.rows[i].id];
                        }else{
                            tcsv += "0";
                        }
                        tcsv += "\n";

                        csv += tcsv;
                    }

                    fs.writeFile('cat_analysis.csv', csv, function (err) {
                        if (err) return console.log(err);
                        process.exit();
                    });
                }
            });
        }
    });
}
