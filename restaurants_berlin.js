/*jshint -W004 */

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

var json = [];

/*
Restaurant: 26
Museum: 194
*/

function init(){

	client.query("SELECT latitude, longitude, neighborhoods.cat_26, neighborhoods.cat_194 FROM neighborhoods, venues, venues_w_categories WHERE venues_w_categories.cat_26 = 1 AND neighborhoods.venues_id = id AND venues_w_categories.venues_id = id AND bb = 1", [], function(err, result) {
		if(err){
			console.log((new Date()), 'error running query', err);
		}else{

			for(var i in result.rows){
				json.push(result.rows[i]);
			}			

			fs.writeFile('restaurants.json', JSON.stringify(json), function (err) {
			    if (err) return console.log(err);
			    console.log("done");
			    process.exit();
			});
		
		}
	});

}