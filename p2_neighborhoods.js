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

var ref, ref_c = 0, ref_m, current;

function init(){
    client.query("DROP TABLE IF EXISTS neighborhoods", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            client.query("SELECT categories_id FROM venues_categories GROUP BY categories_id ORDER BY categories_id ASC", [], function(err, result) {
                if(err){console.log((new Date()), 'error running query', err);}else{
                    var query = "CREATE TABLE neighborhoods (venues_id integer, ";

                        for(var i = 0; i<result.rows.length; i++){
                            query += "cat_"+result.rows[i].categories_id+" double precision DEFAULT 0, ";
                        }

                        query += "UNIQUE(venues_id), CONSTRAINT neighborhoods_id PRIMARY KEY(venues_id))";

                    client.query(query, [], function(err, result) {
                        if(err){console.log((new Date()), 'error running query', err);}else{
                            console.log("table created");

                            client.query("INSERT INTO neighborhoods (venues_id) SELECT id FROM venues", [], function(err, result) {
                                if(err){console.log((new Date()), 'error running query', err);}else{
                                    console.log("insert ids into table");

                                    client.query("SELECT COUNT(*) AS c FROM neighborhoods", [], function(err, result) {
                                        if(err){console.log((new Date()), 'error running query', err);}else{
                                            ref_m = result.rows[0].c;
                                            processNeighborhoods();
                                        }
                                    });
                                }
                            });

                        }
                    });
                }
            });
        }
    });
}

var maxDist = 0.006; //roughly 500 meters

function weight(dist){
    return ((maxDist - parseFloat(dist))/maxDist);
}

function processNeighborhoods(){
    client.query("SELECT id, latitude, longitude, geom FROM venues ORDER BY id ASC LIMIT 1 OFFSET "+ref_c, [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            current = result.rows[0];

            client.query("SELECT id, venues_id, categories_id, ST_Distance(geom, ST_SetSRID(ST_MakePoint("+current.longitude+", "+current.latitude+"),4326)) AS dist FROM venues, venues_categories WHERE id = venues_id AND NOT id = "+current.id+" AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint("+current.longitude+", "+current.latitude+"),4326),  "+maxDist+")", [], function(err, result) {
                if(err){console.log((new Date()), 'error running query', err);}else{

                    var neighborhood = {};

                    for(var i = 0; i<result.rows.length; i++){
                        if(!(result.rows[i].categories_id in neighborhood)){
                            neighborhood[result.rows[i].categories_id] = 0;
                        }
                        neighborhood[result.rows[i].categories_id] += weight(result.rows[i].dist);
                    }

                    var query = "";
                    var keyc = 0;

                    for(var key in neighborhood){
                        if(query!==""){query += ",";}
                        query += "cat_"+key+" = "+neighborhood[key];
                        keyc++;
                    }


                        query = "UPDATE neighborhoods SET "+query+" WHERE venues_id = "+current.id;

                    if(keyc === 0){
                        next();
                    }else{
                        client.query(query, [], function(err, result) {
                            if(err){console.log((new Date()), 'error running query', err);}else{
                                console.log(ref_c, ref_m, keyc);

                                next();

                            }
                        });
                    }
                }
            });

        }
    });
}

function next(){
    ref_c++;
    if(ref_c < ref_m){
        processNeighborhoods();
    }else{
        process.exit();
    }
}
