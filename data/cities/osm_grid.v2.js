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

var loc_count = 0, loc_max = 0, loc_id;


client = new pg.Client(pg_conf);

client.connect(function(err) {
	if(err) {
		console.error('could not connect to postgres', err);
	}else{
		console.error('good', err);

        client.query("SELECT COUNT(*) AS c FROM grid_osm", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                loc_max = parseInt(result.rows[0].c);
                processLocations();
            }
        });

    }
});

var greens = [
    ["boundary","national_park"],
    ["landuse","recreation_ground"],
    ["landuse","forest"],
    ["landuse","village_green"],
    ["landuse","meadow"],
    ["landuse","grass"],
    ["leisure","park"],
    ["natural","wood"],
    ["natural","garden"],
    ["natural","scrub"],
    ["leisure","common"],
    ["leisure","garden"],
    ["leisure","nature_reserve"]
];

var waters = [
    ["water","pond"],
    ["water","lake;pond"],
    ["water","river"],
    ["water","lake"],

    ["waterway","river"],
    ["waterway","waterfall"],
    ["waterway","pond"],
    ["waterway","river"],
    ["waterway","harbour"],
    ["waterway","riverbank"],
    ["waterway","canal"],
    ["waterway","drain"],
    ["waterway","stream"],

    ["natural","water"],
    ["natural","lake"]
];

var roads = [
    [
        ["highway","motorway"], /*Autobahn*/
        ["highway","motorway_link"]
    ],[
        ["highway","trunk"], /*Schnellstraße / Stadtautobahn*/
        ["highway","trunk_link"]
    ],[
        ["highway","primary"], /*Zubringer*/
        ["highway","primary_link"]
    ],[
        ["highway","secondary"], /*Hauptverkehrsachsen*/
        ["highway","secondary_link"],
        ["highway","tertiary"], /*Hauptstraßen*/
        ["highway","unclassified"] /*Kleine Hauptstraße*/
    ],[
        ["highway","residential"], /*Anwohnerstraßen*/
        ["highway","service"], /*Spezialstraßen*/
        ["highway","living_street"] /*Anliegerstraße*/
    ]
];

var transport = [
    [
        //Bus
        ["highway","bus_stop"],
        ["public_transport","stop_position",[["bus","yes"]]],
        ["public_transport","platform",[["highway","bus_stop"]]],
        ["public_transport","platform",[["bus","yes"]]]
    ],[
        //Subway
        ["public_transport","stop_position",[["subway","yes"]]],
        ["railway","station",[["subway","yes"]]],
        ["railway","station",[["station","subway"]]],
        ["railway","halt",[["subway","yes"]]],
        ["railway","stop",[["subway","yes"]]]
    ],[
        //Tram (Attention, tram and subway are sometimes not used consistently)
        ["railway","halt",[["tram","yes"]]],
        ["railway","station",[["tram","yes"]]],
        ["public_transport","stop_position",[["railway","tram_stop"]]],
        ["public_transport","stop_position",[["tram","yes"]]],
        ["railway","tram_stop"]
    ],[
        //Lightrail (S-Bahn)
        ["railway","station",[["station","light_rail"]]],
        ["public_transport","stop_position",[["light_rail","yes"]]],
        ["railway","halt",[["light_rail","yes"]]],
        ["railway","stop",[["light_rail","yes"]]]
    ],[
        ["public_transport","stop_position",[["train","yes"]]],
        ["railway","stop",[["train","yes"]]]
    ]
];

var transport_types = [
    "bus", "subway", "tram", "lightrail", "train"
];

var ptype = "water";

function processLocations(){
    client.query("SELECT id, "+ptype+" AS val FROM grid_osm WHERE "+ptype+" = 999999 LIMIT 1", [], function(err, result) { // OFFSET "+loc_count
        if(err){console.log((new Date()), 'error running query', err);}else{

            console.log(ptype, loc_count, loc_max, result.rows[0].id, result.rows[0].val);

            loc_id = result.rows[0].id;

            if(result.rows[0].val === 999999){

                switch(ptype){
                    case "road_l1":
                        //Roads
                        setRoads(0, result.rows[0]);
                    break;
                    case "train":
                        //Roads
                        setTransport(0, result.rows[0]);
                    break;
                    case "water":
                        //water
                        var waters_query = "";
                        for(var i = 0; i<waters.length; i++){
                            if(waters_query !== ""){
                                waters_query += " OR ";
                            }
                            waters_query += "planet_osm_polygon."+waters[i][0]+" = '"+waters[i][1]+"'";
                        }

                        var query = "WITH dist_query AS ("+
                            "  SELECT "+
                            "    ST_Distance(way, geom) AS dist"+
                            "  FROM grid_osm, planet_osm_polygon "+
                            "   WHERE id = "+loc_id+
                            "   AND way IS NOT NULL AND ("+waters_query+")"+
                            "   AND ST_DWithin(way, geom, 5000)"+
                            "   ORDER BY geom <-> way LIMIT 50"+
                            ")"+
                            "SELECT dist FROM dist_query ORDER BY dist LIMIT 1";

                        client.query(query, [], function(err, result){
                            if(err){console.log((new Date()), 'error running query', err);}else{

                                if(result.rows.length<1){

                                    client.query("UPDATE grid_osm SET water = 5001 WHERE id = "+loc_id, [], function(err, r) {
                                        if(err){console.log((new Date()), 'error running query', err);}else{
                                            console.log("too far");
                                            nextLocation();
                                        }
                                    });

                                }else{

                                    client.query("UPDATE grid_osm SET water = "+parseFloat(result.rows[0].dist)+" WHERE id = "+loc_id, [], function(err, r) {
                                        if(err){console.log((new Date()), 'error running query', err);}else{
                                            console.log(parseFloat(result.rows[0].dist));
                                            nextLocation();
                                        }
                                    });

                                }
                            }
                        });
                    break;
                    case "green":

                        //greens
                        var greens_query = "";
                        for(var i = 0; i<greens.length; i++){
                            if(greens_query !== ""){
                                greens_query += " OR ";
                            }
                            greens_query += "\""+greens[i][0]+"\" = '"+greens[i][1]+"'";
                        }

                        var query = "WITH dist_query AS ("+
                            "  SELECT "+
                            "    ST_Distance(way, geom) AS dist"+
                            "  FROM grid_osm, planet_osm_polygon "+
                            "   WHERE id = "+loc_id+
                            "   AND way IS NOT NULL AND ("+greens_query+")"+
                            "   AND ST_DWithin(way, geom, 5000)"+
                            "   ORDER BY geom <-> way LIMIT 50"+
                            ")"+
                            "SELECT dist FROM dist_query ORDER BY dist LIMIT 1";

                        client.query(query, [], function(err, result){
                            if(err){console.log((new Date()), 'error running query', err);}else{

                                if(result.rows.length<1){

                                    client.query("UPDATE grid_osm SET green = 5001 WHERE id = "+loc_id, [], function(err, r) {
                                        if(err){console.log((new Date()), 'error running query', err);}else{
                                            console.log("too far");
                                            nextLocation();
                                        }
                                    });

                                }else{

                                    client.query("UPDATE grid_osm SET green = "+parseFloat(result.rows[0].dist)+" WHERE id = "+loc_id, [], function(err, r) {
                                        if(err){console.log((new Date()), 'error running query', err);}else{
                                            console.log(parseFloat(result.rows[0].dist));
                                            nextLocation();
                                        }
                                    });

                                }
                            }
                        });
                    break;
                }
            }else{
                console.log("next");
                nextLocation();
            }
        }
    });
}

function setRoads(level, res){
    var roads_query = "";
    for(var i = 0; i<roads[level].length; i++){
        if(roads_query !== ""){
            roads_query += " OR ";
        }
        roads_query += "\""+roads[level][i][0]+"\" = '"+roads[level][i][1]+"'";
    }

    var query = "WITH dist_query AS ("+
        "  SELECT "+
        "    ST_Distance(way, geom) AS dist"+
        "  FROM grid_osm, planet_osm_roads "+
        "   WHERE id = "+loc_id+
        "   AND way IS NOT NULL AND ("+roads_query+")"+
        "   AND ST_DWithin(way, geom, 10000)"+
        "   ORDER BY geom <-> way LIMIT 50"+
        ")"+
        "SELECT dist FROM dist_query ORDER BY dist LIMIT 1";

    client.query(query, [], function(err, result){
        if(err){console.log((new Date()), 'error running query', err);}else{

            if(result.rows.length<1){

                client.query("UPDATE grid_osm SET road_l"+(level+1)+" = 10001 WHERE id = "+loc_id, [], function(err, r) {
                    if(err){console.log((new Date()), 'error running query', err);}else{
                        level++;
                        if(level===roads.length){
                            console.log("too far");
                            nextLocation();
                        }else{
                            setRoads(level, res);
                        }
                    }
                });

            }else{

                client.query("UPDATE grid_osm SET road_l"+(level+1)+" = "+parseFloat(result.rows[0].dist)+" WHERE id = "+loc_id, [], function(err, r) {
                    if(err){console.log((new Date()), 'error running query', err);}else{
                        level++;
                        if(level===roads.length){
                            console.log(parseFloat(result.rows[0].dist));
                            nextLocation();
                        }else{
                            setRoads(level, res);
                        }
                    }
                });

            }
        }
    });

}

function setTransport(level, res){
    var transport_query = "";
    for(var i = 0; i<transport[level].length; i++){
        if(transport_query !== ""){
            transport_query += " OR ";
        }
        if(transport[level][i].length===3){
            transport_query += " ( ";
        }
        transport_query += "planet_osm_point."+transport[level][i][0]+" = '"+transport[level][i][1]+"'";
        if(transport[level][i].length===3){
            transport_query += " AND planet_osm_point."+transport[level][i][2][0][0]+" = '"+transport[level][i][2][0][1]+"' ) ";
        }
    }

    var query = "WITH dist_query AS ("+
        "  SELECT "+
        "    ST_Distance(way, geom) AS dist"+
        "  FROM grid_osm, planet_osm_point "+
        "   WHERE id = "+loc_id+
        "   AND way IS NOT NULL AND ("+transport_query+")"+
        "   AND ST_DWithin(way, geom, 5000)"+
        "   ORDER BY geom <-> way LIMIT 50"+
        ")"+
        "SELECT dist FROM dist_query ORDER BY dist LIMIT 1";

    client.query(query, [], function(err, result){
        if(err){console.log((new Date()), 'error running query', err);}else{

            if(result.rows.length<1){

                client.query("UPDATE grid_osm SET "+(transport_types[level])+" = 5001 WHERE id = "+loc_id, [], function(err, r) {
                    if(err){console.log((new Date()), 'error running query', err);}else{
                        level++;
                        if(level===transport.length){
                            console.log("too far");
                            nextLocation();
                        }else{
                            setTransport(level, res);
                        }
                    }
                });

            }else{

                client.query("UPDATE grid_osm SET "+(transport_types[level])+" = "+parseFloat(result.rows[0].dist)+" WHERE id = "+loc_id, [], function(err, r) {
                    if(err){console.log((new Date()), 'error running query', err);}else{
                        level++;
                        if(level===transport.length){
                            console.log(parseFloat(result.rows[0].dist));
                            nextLocation();
                        }else{
                            setTransport(level, res);
                        }
                    }
                });

            }
        }
    });
}

function nextLocation(){
    loc_count++;
    if(loc_count < loc_max){
        processLocations();
    }else{
        console.log("done");
        process.exit();
    }
}
