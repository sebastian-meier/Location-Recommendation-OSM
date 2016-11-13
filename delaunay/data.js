var	pg = require('pg'),
    fs = require('fs'),
    delaunay = require('delaunay-fast');

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
		port:5433,
		host:"localhost",
		ssl:false
	};

client = new pg.Client(pg_conf);

var json = {
    lat_min:Number.MAX_VALUE,
    lat_max:-Number.MAX_VALUE,
    lng_min:Number.MAX_VALUE,
    lng_max:-Number.MAX_VALUE,
    min:Number.MAX_VALUE,
    max:-Number.MAX_VALUE,
    data:[],
    vertices:[],
    triangles:null
};

var vertices = [], map= {};

client.connect(function(err) {
	if(err) {
		console.error('could not connect to postgres', err);
	}else{
		console.error('good', err);

        client.query("SELECT latitude, longitude, venues.id AS vid, road_l4 AS val FROM venues, venues_osm WHERE venues.id = venue_id AND city = 'Berlin' AND longitude > 13.0883536782043 AND longitude < 13.761131111581 AND latitude > 52.3382388102358 AND latitude < 52.6755085785852", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                for(var i = 0; i<result.rows.length; i++){
                    var r = result.rows[i];

                    if(r.val < 999999){

                        r.longitude *= 100000;
                        r.latitude *= 100000;

                        if(r.latitude>json.lat_max){json.lat_max=r.latitude;}
                        if(r.longitude>json.lng_max){json.lng_max=r.longitude;}
                        if(r.latitude<json.lat_min){json.lat_min=r.latitude;}
                        if(r.longitude<json.lng_min){json.lng_min=r.longitude;}

                        if(r.val>json.max){json.max=r.val;}
                        if(r.val<json.min){json.min=r.val;}

                        var exists = false;

                        /*if(r.latitude in map){
                            if(r.longitude in map){
                                exists = map[r.latitude][r.longitude];
                            }else{
                                map[r.latitude][r.longitude] = i;
                            }
                        }else{
                            map[r.latitude] = {};
                            map[r.latitude][r.longitude] = i;
                        }*/
                        for(var j = 0; j<json.data.length; j++){
                            if(
                                json.data[j].lat == r.latitude &&
                                json.data[j].lng == r.longitude
                            ){
                                exists = j;
                            }
                        }

                        if(!exists){
                            json.data.push({
                                lat:r.latitude,
                                lng:r.longitude,
                                id:r.vid,
                                val:r.val
                            });

                            json.vertices.push([r.longitude, r.latitude]);
                        }else{
                            if(json.data[exists].val > r.val){
                                json.data[exists].val = r.val;
                            }
                        }
                    }
                }

                json.triangles = delaunay.triangulate(json.vertices);

                fs.writeFile("delaunay.json", JSON.stringify(json), function(err) {
                    console.log("done");
                    process.exit();
                });
            }
        });

    }
});
