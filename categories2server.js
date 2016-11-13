var express = require('express'),
	http = require('http'),
	app = express();

var	pg = require('pg'),
    categories = require('./categories.json');

var db = {
	db:"fourquare",
	user: "admin",
	pass: "@zw42JDa9"
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

var c = [];

function exploreCategories(categories, parent){
    for(var i = 0; i<categories.length; i++){
        c.push({
            fid: categories[i].id,
            name: categories[i].name,
            parent: parent,
            pluralName: categories[i].pluralName,
            shortName: categories[i].shortName,
            icon_prefix: categories[i].icon.prefix,
            icon_suffix: categories[i].icon.suffix
        });

        if('categories' in categories[i] && categories[i].categories.length >= 1){
            exploreCategories(categories[i].categories, categories[i].id);
        }
    }
}

exploreCategories(categories.response.categories, 0);

var cc = 0;

function processCategories(){
    client.query("SELECT id, fid FROM categories WHERE fid = $1::text", [c[cc].fid], function(err, result) {
		if(err){
			console.log((new Date()), 'error running query, 50', err);
		}else{
            if(result.rows.length >= 1){
                client.query("UPDATE categories SET parent = $1::text WHERE id = $2::integer", [c[cc].parent, result.rows[0].id], function(err, result) {
                    if(err){
            			console.log((new Date()), 'error running query, 55', err);
            		}else{
                        nextCategory();
                    }
                });
            }else{
                var data = [
                    /*id:*/  			c[cc].fid /*4bf58dd8d48988d115941735*/,
                    /*name:*/  			c[cc].name /*Middle Eastern Restaurant*/,
                    /*primary:*/  		(c[cc].parent === 0) ? 1 : 0 /*true*/,
                    /*pluralName:*/  	c[cc].pluralName /*Middle Eastern Restaurants*/,
                    /*shortName:*/  	c[cc].shortName /*Middle Eastern*/,
                    /*icon_prefix:*/ 	c[cc].icon_prefix /*https://ss3.4sqi.net/img/categories_v2/food/middleeastern_*/,
                    /*icon_suffix:*/ 	c[cc].icon_suffix /*.png*/,
                    /*parent:*/ 	    c[cc].parent /*4bf58dd8d48988d115941735*/
                ];
                client.query("INSERT INTO categories (fid, name, \"primary\", \"pluralName\", \"shortName\", icon_prefix, icon_suffix, parent) VALUES ($1::text, $2::text, $3::smallint, $4::text, $5::text, $6::text, $7::text, $8::text) RETURNING id", data, function(err, result) {
                    if(err){
                        console.log((new Date()), 'error running query, 73', err);
                    }else{
                        nextCategory();
                    }
                });
            }
		}
	});
}

function nextCategory(){
    cc++;
    if(cc<c.length-1){
        processCategories();
    }else{
        process.exit();
    }
}

client.connect(function(err) {
	if(err) {
		console.error('could not connect to postgres', err);
	}else{
		console.error('good', err);
    }
});

app.set('port', 10070);

app.use('/static', express.static('data'));

//write animation pictures
app.get('/process', function(req, res){ processCategories(); res.type('txt').send('Process');});

app.use(function(req, res, next){
	res.status(404);
	res.type('txt').send('Not found');
});

http.createServer(app).listen(app.get('port'), function(){
	console.log((new Date()), "Express server listening on port " + app.get('port'));
});
