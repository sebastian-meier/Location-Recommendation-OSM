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
    csv = "x,y,bus,tram,subway,lightrail";
    client.query("SELECT ST_X(ST_Transform(geom,4326)) AS x, ST_Y(ST_Transform(geom,4326)) AS y, bus, tram, subway, lightrail FROM grid_osm WHERE city = "+(c+1), [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            for(var i = 0; i<result.rows.length; i++){
                if(i>0){csv+="\n";}
                csv += result.rows[i].x+","+result.rows[i].y+","+result.rows[i].bus+","+result.rows[i].tram+","+result.rows[i].subway+","+result.rows[i].lightrail;
            }

            fs.writeFile("cities_transport_"+cities[c]+".csv", csv, function(err) {
                c++;
                if(c>=cities.length){
                    console.log("done");
                    process.exit();
                }else{
                    exportCity();
                }
            });
        }
    });
}
