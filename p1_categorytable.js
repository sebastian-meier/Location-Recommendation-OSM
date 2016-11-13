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

var ref, ref_c = 0;

function init(){
    client.query("DROP TABLE IF EXISTS venues_w_categories", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            client.query("SELECT categories_id FROM venues_categories GROUP BY categories_id ORDER BY categories_id ASC", [], function(err, result) {
                if(err){console.log((new Date()), 'error running query', err);}else{
                    var query = "CREATE TABLE venues_w_categories (venues_id integer, ";

                        for(var i = 0; i<result.rows.length; i++){
                            query += "cat_"+result.rows[i].categories_id+" integer, ";
                        }

                        query += "UNIQUE(venues_id), CONSTRAINT venues_w_categories_id PRIMARY KEY(venues_id))";

                    client.query(query, [], function(err, result) {
                        if(err){console.log((new Date()), 'error running query', err);}else{
                            console.log("table created");

                            client.query("INSERT INTO venues_w_categories (venues_id) SELECT id FROM venues", [], function(err, result) {
                                if(err){console.log((new Date()), 'error running query', err);}else{
                                    console.log("insert ids into table");

                                    client.query("SELECT venues_id, categories_id FROM venues_categories", [], function(err, result) {
                                        if(err){console.log((new Date()), 'error running query', err);}else{
                                            ref = result.rows;
                                            processCategories();
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

function processCategories(){
    client.query("UPDATE venues_w_categories SET cat_"+ref[ref_c].categories_id+" = 1 WHERE venues_id = "+ref[ref_c].venues_id, [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            console.log(ref[ref_c]);
            ref_c++;
            if(ref_c < ref.length){
                processCategories();
            }else{
                process.exit();
            }
        }
    });
}
