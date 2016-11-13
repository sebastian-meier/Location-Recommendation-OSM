var cats = [52,26,194],
    c = 1, b = 0, limit = 0,
    bins = 10;

var	pg = require('pg'),
    fs = require('fs'),
    histograms = require('./'+bins+'_histograms');

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

        update();
    }
});

function alter(){

    client.query("ALTER TABLE neighborhoods ADD COLUMN bin_"+bins+"_cat_"+cats[c]+" smallint DEFAULT 0", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            c++;
            if(c>=cats.length){
                c = 0;
                update();
            }else{
                alter();
            }
        }
    });

}

function update(){
    console.log(c,b);

    client.query("UPDATE neighborhoods SET bin_"+bins+"_cat_"+cats[c]+" = "+(b+1)+" WHERE cat_"+cats[c]+" > "+(b*histograms[cats[c]].binsize)+" AND cat_"+cats[c]+" <= "+((b+1)*histograms[cats[c]].binsize), [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            b++;
            if(b>=bins){
                b = 0;
                c++;
                if(c>=cats.length){
                    process.exit();
                }else{
                    update();
                }
            }else{
                update();
            }
        }
    });
}
