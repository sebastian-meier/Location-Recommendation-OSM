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
		port:5433,
		host:"localhost",
		ssl:false
	};

client = new pg.Client(pg_conf);

var city = "Berlin",
    json, ji = 0;

//Cologne invalid geojson

client.connect(function(err) {
	if(err) {
		console.error('could not connect to postgres', err);
	}else{
		console.error('good', err);

        data = fs.readFileSync( "./cities/berlin/flaechennutzungsplan_berlin_3068.geojson" );
        json = JSON.parse(data);
        processData();

    }
});

function processData(){

    if("geometry" in json.features[ji] && json.features[ji].geometry !== null){
        var params = [
            JSON.stringify(json.features[ji].geometry),
            city,
            /*//Munich
            json.features[ji].properties.NUTZUNG,
            json.features[ji].properties.TB,
            json.features[ji].properties.GEBIET,
            json.features[ji].properties.LNR,
            json.features[ji].properties.FIDOK_CODE,*/
            /*
            //Hamburg
            json.features[ji].properties.Nutzungstext,*/
            /*
            //COLOGNE
            json.features[ji].properties.TYP,
            json.features[ji].properties.subtype,
            json.features[ji].properties.LABEL1,
            json.features[ji].properties.ZWECK,
            json.features[ji].properties.TYPspezial,*/

            //BERLIN
            json.features[ji].properties.GRZKL,
            json.features[ji].properties.TYPKLAR,
            json.features[ji].properties.BAUNKLAR,
            JSON.stringify(json.features[ji].properties)
        ];

        var query = "INSERT INTO fnp (geom, city, type, type1, type2, parameters)VALUES(ST_Multi(ST_GeomFromGeoJSON($1::text)), $2::text, $3::text, $4::text, $5::text, $6::text)";
        client.query(query, params, function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                console.log(ji, json.features.length);
                next();
            }
        });
    }else{
        next();
    }
}

function next(){
    ji++;
    if(ji < json.features.length){
        processData();
    }else{
        console.log("done");
    }
}
