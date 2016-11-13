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

        processQueries();
    }
});

var ref, ref_c = 0, ref_m, current;

var queries = [
    //First clean the attributes table
    "DROP TABLE IF EXISTS attributes_clean",
    "DROP TABLE IF EXISTS attributes_translate",
    "DROP SEQUENCE IF EXISTS attributes_clean_seq",
    "CREATE SEQUENCE attributes_clean_seq",
    "CREATE TABLE attributes_clean (id integer PRIMARY KEY default nextval('attributes_clean_seq'), type text, name text, value text, UNIQUE(id))",
    "INSERT INTO attributes_clean (type,name,value) SELECT type, displayname, displayvalue FROM attributes GROUP BY type, displayname, displayvalue ORDER BY type, displayname, displayvalue",
    "CREATE TABLE attributes_translate (attributes_id integer, attributes_clean_id integer, UNIQUE(attributes_id, attributes_clean_id))",
    "INSERT INTO attributes_translate (attributes_id, attributes_clean_id) SELECT a1.id, a2.id FROM attributes AS a1, attributes_clean AS a2 WHERE a1.type = a2.type AND a1.displayname = a2.name  AND a1.displayvalue = a2.value ",
    //Now that we have unique clean attributes create a new table to compare them
    "DROP TABLE IF EXISTS venues_w_attributes",
    "SELECT id FROM attributes_clean ORDER BY id ASC"
], query_c = 0;

function processQueries(){
    console.log(queries[query_c]);
    client.query(queries[query_c], [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            query_c++;
            if(query_c<queries.length){
                processQueries();
            }else{
                transferAttributes(result);
            }
        }
    });
}

var trans = {};

function transferAttributes(result){
    var query = "CREATE TABLE venues_w_attributes (venues_id integer, ";

        for(var i = 0; i<result.rows.length; i++){
            query += "attr_"+result.rows[i].id+" integer, ";
        }

        query += "UNIQUE(venues_id), CONSTRAINT venues_w_attributes_id PRIMARY KEY(venues_id))";

    client.query(query, [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            console.log("table created");

            client.query("INSERT INTO venues_w_attributes (venues_id) SELECT id FROM venues", [], function(err, result) {
                if(err){console.log((new Date()), 'error running query', err);}else{
                    console.log("insert ids into table");

                    client.query("SELECT attributes_id, attributes_clean_id FROM attributes_translate", [], function(err, result) {
                        if(err){console.log((new Date()), 'error running query', err);}else{
                            for(var i = 0; i<result.rows.length; i++){
                                trans[result.rows[i].attributes_id] = result.rows[i].attributes_clean_id;
                            }
                            client.query("SELECT venues_id, attributes_id FROM venues_attributes", [], function(err, result) {
                                if(err){console.log((new Date()), 'error running query', err);}else{
                                    ref = result.rows;
                                    processAttributes();
                                }
                            });
                        }
                    });
                }
            });

        }
    });

}

function processAttributes(){
    client.query("UPDATE venues_w_attributes SET attr_"+trans[ref[ref_c].attributes_id]+" = 1 WHERE venues_id = "+ref[ref_c].venues_id, [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            console.log(ref[ref_c]);
            ref_c++;
            if(ref_c < ref.length){
                processAttributes();
            }else{
                process.exit();
            }
        }
    });
}
