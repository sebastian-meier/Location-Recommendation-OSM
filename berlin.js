/*jshint -W004*/

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

var csv = "latitude,longitude,green,water,subway,lightrail,tram,bus,train,road_l1,road_l2,road_l3,road_l4,road_l5";

function init(){
    client.query("SELECT latitude, longitude, green, water, subway, lightrail, tram, bus, train, road_l1, road_l2, road_l3, road_l4, road_l5 FROM venues, venues_osm WHERE venue_id = venues.id AND bb = 1", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            for(var i = 0; i<result.rows.length; i++){
                csv += "\n";
                var j = 0;
                for(var key in result.rows[i]){
                    if(j>0){
                        csv += ",";
                    }
                    csv += result.rows[i][key];
                    j++;
                }
            }
            fs.writeFile('berlin_distance.csv', csv, function (err) {
                if (err) return console.log(err);
                console.log("done");
                process.exit();
            });
        }
    });
}
