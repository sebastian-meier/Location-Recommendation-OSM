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

var current = 3;

var cities = [
    	 {
    	 	//Berlin
    		min_longitude:13.0883536782043,
    		max_longitude:13.761131111581,
    		min_latitude:52.3382388102358,
    		max_latitude:52.6755085785852
    	 },
    	 {
    	 	//Hamburg
    		min_longitude:9.728689,
    		max_longitude:10.320578,
    		min_latitude:53.396665,
    		max_latitude:53.748130
    	 },
    	 {
    	 	//Cologne
    		min_longitude:6.766130,
    		max_longitude:7.168504,
    		min_latitude:50.825923,
    		max_latitude:51.088029
    	 },
    	 {
    	 	//Munich
    		min_longitude:11.357809,
    		max_longitude:11.727911,
    		min_latitude:48.061293,
    		max_latitude:48.250474
    	 }
];

var min_lng = cities[current].min_longitude,
	max_lng = cities[current].max_longitude,
	min_lat = cities[current].min_latitude,
	max_lat = cities[current].max_latitude;

var y_dist = distance(min_lat, min_lng, max_lat, min_lng),
    x_dist = distance(min_lat, min_lng, min_lat, max_lng);

var cols = Math.ceil(x_dist*10),
    rows = Math.ceil(y_dist*10);

var x = (max_lng-min_lng)/cols,
    y = (max_lat-min_lat)/rows;

var c = 0,
    max = cols*rows;

client.connect(function(err) {
	if(err) {
		console.error('could not connect to postgres', err);
	}else{
		console.error('good', err);
        buildInsert();
    }
});

function buildInsert(){
    var query = "INSERT INTO grid_osm (geom,city) VALUES";

    for(var i = 0; i<50 && c<max; i++){
        if(i>0){
            query += ",";
        }

        var ty = Math.floor(c/cols),
            tx = c-ty*cols;

        query += "(ST_Transform(ST_SetSRID(ST_MakePoint("+(min_lng+tx*x)+","+(min_lat+ty*y)+"),4326),900913),"+(current+1)+")";

        c++;
    }

    client.query(query, [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            if(c<(max-1)){
                buildInsert();
            }else{
                process.exit();
            }
        }
    });
}

function distance(lat1, lon1, lat2, lon2, unit) {
	var radlat1 = Math.PI * lat1/180,
        radlat2 = Math.PI * lat2/180,
        radlon1 = Math.PI * lon1/180,
        radlon2 = Math.PI * lon2/180,
        theta = lon1-lon2,
        radtheta = Math.PI * theta/180,
        dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);

    dist = Math.acos(dist);
	dist = dist * 180/Math.PI;
	dist = dist * 60 * 1.1515;
	if (unit=="K") { dist = dist * 1.609344; }
	if (unit=="N") { dist = dist * 0.8684; }
	return dist;
}
