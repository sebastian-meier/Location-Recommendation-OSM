var fs = require("fs"),
    iconv  = require('iconv-lite'),
    pg = require('pg'),
    x2jsLib = require("x2js"),
    csv = require("ya-csv");

var x2js = new x2jsLib();

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

client.connect(function(err) {
	if(err) {
		console.error('could not connect to postgres', err);
	}else{
		console.error('good', err);
        var body = fs.readFileSync( "./2015-03_Flaechennutzungsplan/fnp_aktuell.shp.xml" );
        var Utf8String = iconv.decode(new Buffer(body), "utf8");
        processXML(Utf8String);
    }
});

var trans = {}, types = [], json, updates = 0;

function processXML(Utf8String){

    var json = x2js.xml2js(Utf8String);

    for(var i = 0; i<json.metadata.eainfo.detailed.subtype.length; i++){
        var subtype = json.metadata.eainfo.detailed.subtype[i];

        trans[subtype.stcode] = {
            value: subtype.stname.__text,
            keys:{}
        };

        for(var j = 0; j<subtype.stfield.length; j++){
            trans[subtype.stcode].keys[subtype.stfield[j].stfldnm.__text] = subtype.stfield[j].stflddv.__text;
        }
    }

    var reader = csv.createCsvFileReader('../flaechennutzungsplan_values.csv', { 'separator': ';', columnsFromHeader: true });
    reader.addListener('data', function(data) {
        if(data.Origin === "Cologne"){
            var found = false;
            for(var i in trans){
                if(trans[i].value === data.Original){
                    found = true;
                    types.push({
                        level1:data.Level1Short,
                        level2:data.Level2Short,
                        val1:data.Original,
                        val2:data.Subtype1,
                        val3:data.Subtype2,
                        subtype:i,
                        value:trans[i].value,
                        keys:trans[i].keys
                    });
                }
            }
            if(!found){console.log("nothing found", data);}
        }
    });

    reader.addListener('end', function(){

        for(var i = 0; i<types.length; i++){
            var type1 = "='"+types[i].subtype+"'";

            var type3 = " IS NULL ";
            var type4 = " IS NULL ";

            if(types[i].val2 && types[i].val2.length >= 1){
                type4 = " = '"+types[i].val2+"'";
            }

            if(types[i].val3 && types[i].val3.length >= 1){
                type3 = " = '"+types[i].val3+"'";
            }

            var query = "UPDATE fnp SET level1 = '"+types[i].level1+"', level2 = '"+types[i].level2+"' WHERE city = 'Cologne' AND type1 "+type1+" AND type3 "+type3+" AND type4 "+type4;
            console.log(query);
            client.query(query, [], function(err, result) { if(err){
                console.log((new Date()), 'error running query', err);
            }else{
                updates++;
                if(updates === (types.length-1)){
                    console.log("done");
                }
            } });
        }

    });

}
