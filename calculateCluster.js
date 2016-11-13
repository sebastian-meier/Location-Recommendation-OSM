/*jshint -W004 */

var bins = 10,
    //TODO: Instead of using a fixed amount one should try to get the upper 10% of a group to find the peaks
    amount = 50,
    twostep_start = 0.3,
    tolerance = 0.1,
    bins = 10,
    cats = [52,26,194],
    ci = 0,
    iterations = 20,
    json = {
        "individual":{},
        "parallel":{},
        "all_parallel":{},
        "twostep_prio_bins":{},
        "twostep_prio_cont":{},
        "threestep_prio_bins":{},
        "threestep_prio_cont":{}
    };

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

        init();
    }
});

function init(){

    console.log("Performance Testing:", bins, amount, tolerance, cats);

    individual();

}

var time,loop;

//Binary Search Algorithm

function individual(){
    time = (new Date()).getTime();
    loop = 0;
    var i = bins-1,j=0;
    var collect = histograms[cats[count]].bins[i];
    while(collect<amount){
        i--;
        j++;
        collect += histograms[cats[count]].bins[i];
    }

    individualQuery(i*histograms[cats[count]].binsize, (histograms[cats[count]].max-(j*histograms[cats[count]].binsize)), collect);
}

function individualQuery(min, max, result){
    if(result > amount && result < amount+amount*tolerance){
        getIndividual(min);
    }else{
        loop++;
        client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE cat_"+cats[count]+" > "+((max-min)/2+min)+" AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                var c = parseInt(result.rows[0].c);
                if(c > amount){
                    individualQuery(((max-min)/2+min), max, c);
                }else{
                    individualQuery(min, ((max-min)/2+min), c);
                }
            }
        });
    }
}

function getIndividual(min){
    client.query("SELECT latitude, longitude, cat_52, cat_26, cat_194 FROM neighborhoods, venues WHERE cat_"+cats[count]+" > "+min+" AND venues_id = id AND bb = 1", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{

            var geoq = "";

            for(var i = 0; i<result.rows.length; i++){
                if(geoq !== ""){
                    geoq += " OR ";
                }

                geoq += " ST_DWithin(geom, ST_SetSRID(ST_MakePoint("+result.rows[i].longitude+", "+result.rows[i].latitude+"),4326), 0.006) ";
            }

            var query = "SELECT latitude, longitude, categories_id FROM venues, venues_categories WHERE id = venues_id AND categories_id = "+cats[count]+" AND ("+geoq+")";

            var descriptors = result.rows;

            client.query(query, [], function(err, result) {
                if(err){console.log((new Date()), 'error running query', err);}else{
                    var t = ((new Date()).getTime()-time);
                    console.log("Result Individual", cats[count], loop, result.rows.length, ((new Date()).getTime()-time));
                    if(!(cats[count] in json.individual)){
                        json.individual[cats[count]] = {
                                test:[],
                                descriptors:descriptors,
                                result : result.rows
                        };
                    }
                    json.individual[cats[count]].test.push({
                        loop:loop,
                        count:result.rows.length,
                        time:t
                    });
                    nextIndividual();
                }
            });

        }
    });
}

var count = 0, scount = 1;

function nextIndividual(){
    count++;
    if(count>=cats.length){
        count = 0;
        setTimeout(parallel(), 100);
    }else{
        setTimeout(individual(), 100);

    }
}

/* Parallel */

var perc = 99;

function parallel(){
    time = (new Date()).getTime();
    loop = 0;
    perc = 99;
    parallelQuery();
}

function parallelQuery(){
    loop++;
    client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE cat_"+cats[count]+" > "+(histograms[cats[count]].max/100*perc)+" AND cat_"+cats[scount]+" > "+(histograms[cats[scount]].max/100*perc)+" AND venues_id = id AND bb = 1", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            var c = parseInt(result.rows[0].c);
            if(c > amount){
                getParallel();
            }else{
                perc--;
                parallelQuery();
            }
        }
    });
}

function getParallel(){
    client.query("SELECT latitude, longitude, cat_52, cat_26, cat_194 FROM neighborhoods, venues WHERE cat_"+cats[count]+" > "+(histograms[cats[count]].max/100*perc)+" AND cat_"+cats[scount]+" > "+(histograms[cats[scount]].max/100*perc)+" AND venues_id = id AND bb = 1", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            var geoq = "";

            for(var i = 0; i<result.rows.length; i++){
                if(geoq !== ""){
                    geoq += " OR ";
                }

                geoq += " ST_DWithin(geom, ST_SetSRID(ST_MakePoint("+result.rows[i].longitude+", "+result.rows[i].latitude+"),4326), 0.006) ";
            }

            var query = "SELECT latitude, longitude, categories_id FROM venues, venues_categories WHERE id = venues_id AND (categories_id = "+cats[count]+" OR categories_id = "+cats[scount]+") AND ("+geoq+")";

            var descriptors = result.rows;

            client.query(query, [], function(err, result) {
                if(err){console.log((new Date()), 'error running query', err);}else{
                    console.log("Result Parallel", cats[count], cats[scount], perc, loop, result.rows.length, ((new Date()).getTime()-time));
                    var t = ((new Date()).getTime()-time);
                    if(!(cats[count]+"_"+cats[scount] in json.parallel)){
                        json.parallel[cats[count]+"_"+cats[scount]] = {
                                test:[],
                                descriptors:descriptors,
                                result : result.rows
                        };
                    }
                    json.parallel[cats[count]+"_"+cats[scount]].test.push({
                        perc:perc,
                        loop:loop,
                        count:result.rows.length,
                        time:t
                    });
                    nextParallel();
                }
            });
        }
    });
}

function nextParallel(){
    scount++;
    if(scount >= cats.length){
        scount = 0;
        count++;
        if(count >= cats.length){
            tparallel();
        }else{
            if(scount != count){
                setTimeout(parallel(), 100);
            }else{
                nextParallel();
            }
        }
    }else{
        if(scount != count){
            setTimeout(parallel(), 100);
        }else{
            nextParallel();
        }
    }
}

/* ALL three parallel */

function tparallel(){
    time = (new Date()).getTime();
    loop = 0;
    perc = 99;
    tparallelQuery();
}

function tparallelQuery(){
    loop++;
    client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE cat_"+cats[0]+" > "+(histograms[cats[0]].max/100*perc)+" AND cat_"+cats[1]+" > "+(histograms[cats[1]].max/100*perc)+" AND cat_"+cats[2]+" > "+(histograms[cats[2]].max/100*perc)+" AND venues_id = id AND bb = 1", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            var c = parseInt(result.rows[0].c);
            if(c > amount){
                tgetParallel();
            }else{
                perc--;
                tparallelQuery();
            }
        }
    });
}

function tgetParallel(){
    client.query("SELECT latitude, longitude, cat_52, cat_26, cat_194 FROM neighborhoods, venues WHERE cat_"+cats[0]+" > "+(histograms[cats[0]].max/100*perc)+" AND cat_"+cats[1]+" > "+(histograms[cats[1]].max/100*perc)+" AND cat_"+cats[2]+" > "+(histograms[cats[2]].max/100*perc)+" AND venues_id = id AND bb = 1", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            var geoq = "";

            for(var i = 0; i<result.rows.length; i++){
                if(geoq !== ""){
                    geoq += " OR ";
                }

                geoq += " ST_DWithin(geom, ST_SetSRID(ST_MakePoint("+result.rows[i].longitude+", "+result.rows[i].latitude+"),4326), 0.006) ";
            }

            var query = "SELECT latitude, longitude, categories_id FROM venues, venues_categories WHERE id = venues_id AND (categories_id = "+cats[0]+" OR categories_id = "+cats[1]+" OR categories_id = "+cats[2]+") AND ("+geoq+")";

            var descriptors = result.rows;

            client.query(query, [], function(err, result) {
                if(err){console.log((new Date()), 'error running query', err);}else{
                    var t = ((new Date()).getTime()-time);
                    console.log("Result All Parallel", cats[0], cats[1], cats[2], perc, loop, result.rows.length, ((new Date()).getTime()-time));
                    count = 0;
                    scount = 1;
                    if(!("result" in json.all_parallel)){
                        json.all_parallel = {
                                test:[],
                                descriptors:descriptors,
                                result : result.rows
                        };
                    }
                    json.all_parallel.test.push({
                        perc:perc,
                        loop:loop,
                        count:result.rows.length,
                        time:t
                    });
                    twostepC();
                }
            });
        }
    });
}

/*----------------------------------------------------------*/
/*
Using a continous scale
*/

var twostep_collect;

function twostepC(){
    time = (new Date()).getTime();
    loop = 0;

    client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE cat_"+cats[count]+" > 0 AND cat_"+cats[scount]+" > 0 AND venues_id = id AND bb = 1", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            twostep_collect = result.rows[0].c;
            //console.log(((new Date()).getTime()-time), "COUNT");
            twostepPhase1C(histograms[cats[count]].max, histograms[cats[count]].max, 0, histograms[cats[scount]].max, 0);
        }
    });
}

function twostepPhase1C(min, max, smin, smax, result){
    if(result > twostep_collect*twostep_start){
        client.query("SELECT MAX(cat_"+cats[scount]+") AS m FROM neighborhoods, venues WHERE cat_"+cats[count]+" > "+min+" AND cat_"+cats[scount]+" > 0 AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                //console.log(((new Date()).getTime()-time), "MAX");
                twostepPhase2C(min,max,smin,parseFloat(result.rows[0].m),result);
            }
        });
    }else{
        loop++;
        min -= histograms[cats[count]].binsize;
        client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE cat_"+cats[count]+" > "+min+" AND cat_"+cats[scount]+" > 0 AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                var c = parseInt(result.rows[0].c);
                //console.log(((new Date()).getTime()-time), "STEP1");
                twostepPhase1C(min,max,smin,smax,c);
            }
        });
    }
}

function twostepPhase2C(min,max,smin,smax,result){
    if(result > amount && result < amount+amount*tolerance){
        //console.log(((new Date()).getTime()-time),"GET");
        getTwostepC(min, smin);
    }else{
        loop++;
        client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE cat_"+cats[count]+" > "+min+" AND cat_"+cats[scount]+" > "+((smax-smin)/2+smin)+" AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                var c = parseInt(result.rows[0].c);
                //console.log(((new Date()).getTime()-time), "STEP2");
                if(c > amount){
                    twostepPhase2C(min, max, ((smax-smin)/2+smin), smax, c);
                }else{
                    twostepPhase2C(min, max, smin, ((smax-smin)/2+smin), c);
                }
            }
        });
    }
}

function getTwostepC(min, smin){
    client.query("SELECT latitude, longitude, cat_52, cat_26, cat_194 FROM neighborhoods, venues WHERE cat_"+cats[count]+" > "+min+" AND cat_"+cats[scount]+" > "+smin+" AND venues_id = id AND bb = 1", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            var geoq = "";

            for(var i = 0; i<result.rows.length; i++){
                if(geoq !== ""){
                    geoq += " OR ";
                }

                geoq += " ST_DWithin(geom, ST_SetSRID(ST_MakePoint("+result.rows[i].longitude+", "+result.rows[i].latitude+"),4326), 0.006) ";
            }

            var query = "SELECT latitude, longitude, categories_id FROM venues, venues_categories WHERE id = venues_id AND (categories_id = "+cats[count]+" OR categories_id = "+cats[scount]+") AND ("+geoq+")";

            var descriptors = result.rows;

            client.query(query, [], function(err, result) {
                if(err){console.log((new Date()), 'error running query', err);}else{
                    console.log("Twostep Priority Continous", cats[count], cats[scount], loop, result.rows.length, ((new Date()).getTime()-time));
                    var t = ((new Date()).getTime()-time);
                    if(!(cats[count]+"_"+cats[scount] in json.twostep_prio_cont)){
                        json.twostep_prio_cont[cats[count]+"_"+cats[scount]] = {
                                test:[],
                                descriptors:descriptors,
                                result : result.rows
                        };
                    }
                    json.twostep_prio_cont[cats[count]+"_"+cats[scount]].test.push({
                        loop:loop,
                        count:result.rows.length,
                        time:t
                    });
                    nextTwostepC();
                }
            });
        }
    });
}

function nextTwostepC(){
    scount++;
    if(scount >= cats.length){
        scount = 0;
        count++;
        if(count >= cats.length){
            count = 0;
            scount = 1;
            setTimeout(twostep(), 100);
        }else{
            if(scount != count){
                setTimeout(twostepC(), 100);
            }else{
                nextTwostepC();
            }
        }
    }else{
        if(scount != count){
            setTimeout(twostepC(), 100);
        }else{
            nextTwostepC();
        }
    }
}


/*----------------------------------------------------------*/
/*
Using bins/buckets
*/
var twostep_collect, stepper = 1;

function twostep(){
    time = (new Date()).getTime();
    loop = 0;

    client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE bin_"+bins+"_cat_"+cats[count]+" > 0 AND bin_"+bins+"_cat_"+cats[scount]+" > 0 AND venues_id = id AND bb = 1", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            twostep_collect = result.rows[0].c;
            //console.log(((new Date()).getTime()-time), "COUNT");
            twostepPhase1(10, 10, 0, 10, 0);
        }
    });
}

function twostepPhase1(min, max, smin, smax, result){
    if(result > twostep_collect*twostep_start){
        client.query("SELECT MAX(cat_"+cats[scount]+") AS m FROM neighborhoods, venues WHERE bin_"+bins+"_cat_"+cats[count]+" > "+min+" AND bin_"+bins+"_cat_"+cats[scount]+" > 0 AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                //console.log(((new Date()).getTime()-time), "MAX");
                twostepPhase2(min,max,smin,parseFloat(result.rows[0].m),result);
            }
        });
    }else{
        loop++;
        min-=stepper;
        client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE bin_"+bins+"_cat_"+cats[count]+" > "+min+" AND bin_"+bins+"_cat_"+cats[scount]+" > 0 AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                var c = parseInt(result.rows[0].c);
                //console.log(((new Date()).getTime()-time), "STEP1");
                twostepPhase1(min,max,smin,smax,c);
            }
        });
    }
}

function twostepPhase2(min,max,smin,smax,result){
    if(result > amount && result < amount+amount*tolerance){
        //console.log(((new Date()).getTime()-time),"GET");
        getTwostep(min, smin);
    }else{
        loop++;
        client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE bin_"+bins+"_cat_"+cats[count]+" > "+min+" AND bin_"+bins+"_cat_"+cats[scount]+" > "+smin+" AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                var c = parseInt(result.rows[0].c);
                //console.log(((new Date()).getTime()-time), "STEP2");
                if(c > amount && c < amount+amount*tolerance){
                    getTwostep(min, smin);
                }else if(c > amount){
                    twostepPhase2(min, max, smin+stepper, smax, c);
                }else{
                    getTwostep(min, smin-stepper);
                }
            }
        });
    }
}

function getTwostep(min, smin){
    client.query("SELECT latitude,longitude, cat_52, cat_26, cat_194 FROM neighborhoods, venues WHERE bin_"+bins+"_cat_"+cats[count]+" > "+min+" AND bin_"+bins+"_cat_"+cats[scount]+" > "+smin+" AND venues_id = id AND bb = 1", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            var geoq = "";

            for(var i = 0; i<result.rows.length; i++){
                if(geoq !== ""){
                    geoq += " OR ";
                }

                geoq += " ST_DWithin(geom, ST_SetSRID(ST_MakePoint("+result.rows[i].longitude+", "+result.rows[i].latitude+"),4326), 0.006) ";
            }

            var query = "SELECT latitude, longitude, categories_id FROM venues, venues_categories WHERE id = venues_id AND (categories_id = "+cats[count]+" OR categories_id = "+cats[scount]+") AND ("+geoq+")";

            var descriptors = result.rows;

            client.query(query, [], function(err, result) {
                if(err){console.log((new Date()), 'error running query', err);}else{
                    console.log("Twostep Priority Bins", cats[count], cats[scount], loop, result.rows.length, ((new Date()).getTime()-time));
                    var t = ((new Date()).getTime()-time);
                    if(!(cats[count]+"_"+cats[scount] in json.twostep_prio_bins)){
                        json.twostep_prio_bins[cats[count]+"_"+cats[scount]] = {
                                test:[],
                                descriptors:descriptors,
                                result : result.rows
                        };
                    }
                    json.twostep_prio_bins[cats[count]+"_"+cats[scount]].test.push({
                        loop:loop,
                        count:result.rows.length,
                        time:t
                    });
                    nextTwostep();
                }
            });
        }
    });
}

function nextTwostep(){
    scount++;
    if(scount >= cats.length){
        scount = 0;
        count++;
        if(count >= cats.length){
            count = 0;
            setTimeout(threestepC(), 100);
        }else{
            if(scount != count){
                setTimeout(twostep(), 100);
            }else{
                nextTwostep();
            }
        }
    }else{
        if(scount != count){
            setTimeout(twostep(), 100);
        }else{
            nextTwostep();
        }
    }
}

/*
ThreeStep bins & binary
*/

var threestep_collect, combis = [
    [1,0,2],
    [2,0,1],
    [0,1,2],
    [2,1,0],
    [0,2,1],
    [1,2,0]
];

function threestepC(){
    time = (new Date()).getTime();
    loop = 0;

    client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE cat_"+cats[combis[count][0]]+" > 0 AND cat_"+cats[combis[count][1]]+" > 0 AND cat_"+cats[combis[count][1]]+" > 0 AND venues_id = id AND bb = 1", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            threestep_collect = result.rows[0].c;
            threestepPhase1C(histograms[cats[combis[count][0]]].max, histograms[cats[combis[count][1]]].max, 0);
        }
    });
}

function threestepPhase1C(min, max, result){
    if(result > threestep_collect*(twostep_start*2)){
        client.query("SELECT MAX(cat_"+cats[combis[count][1]]+") AS m FROM neighborhoods, venues WHERE cat_"+cats[combis[count][0]]+" > "+min+" AND cat_"+cats[combis[count][1]]+" > 0 AND cat_"+cats[combis[count][1]]+" > 0 AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                //console.log(((new Date()).getTime()-time), "MAX");
                threestepPhase2C(min,max,0,parseFloat(result.rows[0].m),Number.MAX_VALUE);
            }
        });
    }else{
        loop++;
        min -= histograms[cats[combis[count][0]]].binsize;
        client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE cat_"+cats[combis[count][0]]+" > "+min+" AND cat_"+cats[combis[count][1]]+" > 0 AND cat_"+cats[combis[count][1]]+" > 0 AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                var c = parseInt(result.rows[0].c);
                //console.log(((new Date()).getTime()-time), "STEP1");
                threestepPhase1C(min,max,c);
            }
        });
    }
}

function threestepPhase2C(min, max, smin, smax, result){
    if(result < threestep_collect*twostep_start){
        client.query("SELECT MAX(cat_"+cats[combis[count][2]]+") AS m FROM neighborhoods, venues WHERE cat_"+cats[combis[count][0]]+" > "+min+" AND cat_"+cats[combis[count][1]]+" > "+smin+" AND cat_"+cats[combis[count][1]]+" > 0 AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                //console.log(((new Date()).getTime()-time), "MAX");
                threestepPhase3C(min, max, smin, smax, 0, parseFloat(result.rows[0].m), 0);
            }
        });
    }else{
        loop++;
        smin += histograms[cats[combis[count][1]]].binsize;
        client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE cat_"+cats[combis[count][0]]+" > "+min+" AND cat_"+cats[combis[count][1]]+" > "+smin+" AND cat_"+cats[combis[count][1]]+" > 0 AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                var c = parseInt(result.rows[0].c);
                //console.log(((new Date()).getTime()-time), "STEP1");
                threestepPhase2C(min,max,smin,smax,c);
            }
        });
    }
}

function threestepPhase3C(min,max,smin,smax,ssmin,ssmax,result){
    if(result > amount && result < amount+amount*tolerance){
        //console.log(((new Date()).getTime()-time),"GET");
        getThreestepC(min, smin, ssmin);
    }else{
        loop++;
        client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE cat_"+cats[combis[count][0]]+" > "+min+" AND cat_"+cats[combis[count][1]]+" > "+smin+" AND cat_"+cats[combis[count][2]]+" > "+((ssmax-ssmin)/2+ssmin)+" AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                var c = parseInt(result.rows[0].c);
                //console.log(((new Date()).getTime()-time), "STEP2");
                if(c > amount){
                    threestepPhase3C(min, max, smin, smax, ((ssmax-ssmin)/2+ssmin), ssmax, c);
                }else{
                    threestepPhase3C(min, max, smin, smax, ssmin, ((ssmax-ssmin)/2+ssmin), c);
                }
            }
        });
    }
}

function getThreestepC(min, smin, ssmin){
    client.query("SELECT latitude, longitude, cat_52, cat_26, cat_194 FROM neighborhoods, venues WHERE cat_"+cats[combis[count][0]]+" > "+min+" AND cat_"+cats[combis[count][1]]+" > "+smin+" AND cat_"+cats[combis[count][2]]+" > "+ssmin+" AND venues_id = id AND bb = 1", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            var geoq = "";

            for(var i = 0; i<result.rows.length; i++){
                if(geoq !== ""){
                    geoq += " OR ";
                }

                geoq += " ST_DWithin(geom, ST_SetSRID(ST_MakePoint("+result.rows[i].longitude+", "+result.rows[i].latitude+"),4326), 0.006) ";
            }

            var query = "SELECT latitude, longitude, categories_id FROM venues, venues_categories WHERE id = venues_id AND (categories_id = "+cats[combis[count][0]]+" OR categories_id = "+cats[combis[count][1]]+" OR categories_id = "+cats[combis[count][2]]+") AND ("+geoq+")";

            var descriptors = result.rows;

            client.query(query, [], function(err, result) {
                if(err){console.log((new Date()), 'error running query', err);}else{
                    console.log("Threestep Priority Continous", cats[combis[count][0]], cats[combis[count][1]], cats[combis[count][2]], loop, result.rows.length, ((new Date()).getTime()-time));
                    var t = ((new Date()).getTime()-time);
                    var k = cats[combis[count][0]]+"_"+cats[combis[count][1]]+"_"+cats[combis[count][2]];
                    if(!(k in json.threestep_prio_cont)){
                        json.threestep_prio_cont[k] = {
                                test:[],
                                descriptors:descriptors,
                                result : result.rows
                        };
                    }
                    json.threestep_prio_cont[k].test.push({
                        loop:loop,
                        count:result.rows.length,
                        time:t
                    });
                    nextThreestepC();
                }
            });
        }
    });
}

function nextThreestepC(){
    count++;
    if(count >= combis.length){
        count = 0;
        setTimeout(threestep(), 100);
    }else{
        threestepC();
    }
}

/*
ThreeStep Bins
*/

function threestep(){
    time = (new Date()).getTime();
    loop = 0;

    client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE bin_"+bins+"_cat_"+cats[combis[count][0]]+" > 0 AND bin_"+bins+"_cat_"+cats[combis[count][1]]+" > 0 AND bin_"+bins+"_cat_"+cats[combis[count][2]]+" > 0 AND venues_id = id AND bb = 1", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            threestep_collect = result.rows[0].c;
            //console.log(((new Date()).getTime()-time), "COUNT");
            threestepPhase1(10, 10, 0);
        }
    });
}

function threestepPhase1(min, max, result){
    if(result > threestep_collect*(twostep_start*2)){
        client.query("SELECT MAX(cat_"+cats[combis[count][1]]+") AS m FROM neighborhoods, venues WHERE bin_"+bins+"_cat_"+cats[combis[count][0]]+" > "+min+" AND bin_"+bins+"_cat_"+cats[combis[count][1]]+" > 0 AND bin_"+bins+"_cat_"+cats[combis[count][2]]+" > 0 AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                //console.log(((new Date()).getTime()-time), "MAX");
                threestepPhase2(min,max,0,parseFloat(result.rows[0].m),Number.MAX_VALUE);
            }
        });
    }else{
        loop++;
        min-=stepper;
        client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE bin_"+bins+"_cat_"+cats[combis[count][0]]+" > "+min+" AND bin_"+bins+"_cat_"+cats[combis[count][1]]+" > 0 AND bin_"+bins+"_cat_"+cats[combis[count][2]]+" > 0 AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                var c = parseInt(result.rows[0].c);
                //console.log(((new Date()).getTime()-time), "STEP1");
                threestepPhase1(min,max,c);
            }
        });
    }
}

function threestepPhase2(min, max, smin, smax, result){
    if(result > threestep_collect*twostep_start){
        client.query("SELECT MAX(cat_"+cats[combis[count][1]]+") AS m FROM neighborhoods, venues WHERE bin_"+bins+"_cat_"+cats[combis[count][0]]+" > "+min+" AND bin_"+bins+"_cat_"+cats[combis[count][1]]+" > "+smin+" AND bin_"+bins+"_cat_"+cats[combis[count][2]]+" > 0 AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                //console.log(((new Date()).getTime()-time), "MAX");
                threestepPhase3(min,max,smin,smax,0,parseFloat(result.rows[0].m),0);
            }
        });
    }else{
        loop++;
        smin+=stepper;
        client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE bin_"+bins+"_cat_"+cats[combis[count][0]]+" > "+min+" AND bin_"+bins+"_cat_"+cats[combis[count][1]]+" > "+smin+" AND bin_"+bins+"_cat_"+cats[combis[count][2]]+" > 0 AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                var c = parseInt(result.rows[0].c);
                //console.log(((new Date()).getTime()-time), "STEP1");
                threestepPhase2(min,max,smin,smax,c);
            }
        });
    }
}

function threestepPhase3(min,max,smin,smax,ssmin,ssmax,result){
    if(result > amount && result < amount+amount*tolerance){
        //console.log(((new Date()).getTime()-time),"GET");
        getThreestep(min, smin, ssmin);
    }else{
        loop++;
        client.query("SELECT COUNT(*) AS c FROM neighborhoods, venues WHERE bin_"+bins+"_cat_"+cats[combis[count][0]]+" > "+min+" AND bin_"+bins+"_cat_"+cats[combis[count][1]]+" > "+smin+" AND bin_"+bins+"_cat_"+cats[combis[count][2]]+" > "+ssmin+" AND venues_id = id AND bb = 1", [], function(err, result) {
            if(err){console.log((new Date()), 'error running query', err);}else{
                var c = parseInt(result.rows[0].c);
                //console.log(((new Date()).getTime()-time), "STEP2");
                if(c > amount && c < amount+amount*tolerance){
                    getThreestep(min, smin, ssmin);
                }else if(c > amount){
                    threestepPhase3(min, max, smin, smax, ssmin+stepper, ssmax, c);
                }else{
                    getThreestep(min, smin, ssmin-stepper);
                }
            }
        });
    }
}

function getThreestep(min, smin, ssmin){
    client.query("SELECT latitude, longitude, cat_52, cat_26, cat_194 FROM neighborhoods, venues WHERE bin_"+bins+"_cat_"+cats[combis[count][0]]+" > "+min+" AND bin_"+bins+"_cat_"+cats[combis[count][1]]+" > "+smin+" AND bin_"+bins+"_cat_"+cats[combis[count][2]]+" > "+ssmin+" AND venues_id = id AND bb = 1", [], function(err, result) {
        if(err){console.log((new Date()), 'error running query', err);}else{
            var geoq = "";

            for(var i = 0; i<result.rows.length; i++){
                if(geoq !== ""){
                    geoq += " OR ";
                }

                geoq += " ST_DWithin(geom, ST_SetSRID(ST_MakePoint("+result.rows[i].longitude+", "+result.rows[i].latitude+"),4326), 0.006) ";
            }

            var query = "SELECT latitude, longitude, categories_id FROM venues, venues_categories WHERE id = venues_id AND (categories_id = "+cats[combis[count][0]]+" OR categories_id = "+cats[combis[count][1]]+" OR categories_id = "+cats[combis[count][2]]+") AND ("+geoq+")";

            var descriptors = result.rows;

            client.query(query, [], function(err, result) {
                if(err){console.log((new Date()), 'error running query', err);}else{
                    console.log("Threestep Priority Bins", cats[combis[count][0]], cats[combis[count][1]], cats[combis[count][2]], loop, result.rows.length, ((new Date()).getTime()-time));
                    var t = ((new Date()).getTime()-time);
                    var k = cats[combis[count][0]]+"_"+cats[combis[count][1]]+"_"+cats[combis[count][2]];
                    if(!(k in json.threestep_prio_bins)){
                        json.threestep_prio_bins[k] = {
                                test:[],
                                descriptors:descriptors,
                                result : result.rows
                        };
                    }
                    json.threestep_prio_bins[k].test.push({
                        loop:loop,
                        count:result.rows.length,
                        time:t
                    });
                    nextThreestep();
                }
            });
        }
    });
}

function nextThreestep(){
    count++;
    if(count >= combis.length){
        ci++;
        if(ci<iterations){
            count = 0;
            scount = 1;
            console.log("ITER:",ci);
            individual();
        }else{
            fs.writeFile('clusterPerformance.json', JSON.stringify(json), function (err) {
                if (err) return console.log(err);
                console.log("done");
                process.exit();
            });
        }
    }else{
        threestep();
    }
}
