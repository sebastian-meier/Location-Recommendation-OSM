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

var cat = 52;

function init(){
    client.query("SELECT venues_id, latitude, longitude FROM neighborhoods, venues WHERE id = venues_id AND cat_"+cat+" > 25 AND geom && ST_MakeEnvelope(13.0883536782043,52.3382388102358,13.761131111581,52.6755085785852, 4326) ORDER BY cat_"+cat+" DESC", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{

            console.log(result.rows.length);

            var geoq = "";

            for(var i = 0; i<result.rows.length; i++){
                if(geoq !== ""){
                    geoq += " OR ";
                }

                geoq += " ST_DWithin(geom, ST_SetSRID(ST_MakePoint("+result.rows[i].longitude+", "+result.rows[i].latitude+"),4326), 0.006) ";
            }

            var query = "SELECT latitude, longitude FROM venues, venues_categories WHERE id = venues_id AND categories_id = "+cat+" AND ("+geoq+")";

            client.query(query, [], function(err, result) {
                if(err){console.log((new Date()), 'error running query', err);}else{
                    var json = [];
                    console.log(result.rows.length);
                    for(var i = 0; i<result.rows.length; i++){
                        json.push([result.rows[i].latitude, result.rows[i].longitude]);
                    }
                    fs.writeFile('cat_'+cat+'.json', JSON.stringify(json), function (err) {
                        if (err) return console.log(err);
                        process.exit();
                    });
                }
            });

        }
    });
}
