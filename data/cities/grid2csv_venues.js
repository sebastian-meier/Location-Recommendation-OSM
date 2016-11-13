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

var csv;

var cities = ["Berlin","Hamburg","Cologne","Munich"],
    c = 0;

client.connect(function(err) {
	if(err) {
		console.error('could not connect to postgres', err);
	}else{
		console.error('good', err);

        exportCity();
    }
});

function exportCity(){
    csv = "x,y,water,green,bus,tram,subway,lightrail,road_l1,road_l2,road_l3,road_l4,road_l5";
    client.query("SELECT latitude AS y, longitude AS x, water, green, bus, tram, subway, lightrail,road_l1,road_l2,road_l3,road_l4,road_l5 FROM venues_osm, venues WHERE venues.id = venues_osm.venue_id AND bb = 1", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            for(var i = 0; i<result.rows.length; i++){
                if(i>0){csv+="\n";}
                csv += result.rows[i].x+","+result.rows[i].y+","+result.rows[i].water+","+result.rows[i].green+","+result.rows[i].bus+","+result.rows[i].tram+","+result.rows[i].subway+","+result.rows[i].lightrail+","+result.rows[i].road_l1+","+result.rows[i].road_l2+","+result.rows[i].road_l3+","+result.rows[i].road_l4+","+result.rows[i].road_l5;
            }

            fs.writeFile("berlin.csv", csv, function(err) {
                console.log("done");
                process.exit();
            });
        }
    });
}
