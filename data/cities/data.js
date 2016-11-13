var fs = require("fs"),
    iconv  = require('iconv-lite'),
    x2jsLib = require("x2js");

var x2js = new x2jsLib();


//HAMBURG

var data = fs.readFileSync( "./hamburg/flaechennutzungsplan_hamburg.geojson" );
var json = JSON.parse(data);

var attributes = {};

for(var i = 0; i<json.features.length; i++){
    for(var key in json.features[i].properties){
        if(
            key === "NUTZUNG" ||
            key === "Nutzungstext"
        ){
            if(!(key in attributes)){
                attributes[key] = [];
            }
            if(attributes[key].indexOf(json.features[i].properties[key])===-1){
                attributes[key].push(json.features[i].properties[key]);
            }
        }
    }
}

fs.writeFile('./hamburg/flaechennutzungsplan_hamburg_attributes.json', JSON.stringify(attributes, null, '\t'), function (err) {
    if (err) return console.log(err);
    process.exit();
});


/*
//COLOGNE


var body = fs.readFileSync( "./cologne/2015-03_Flaechennutzungsplan/fnp_aktuell.shp.xml" );
var Utf8String = iconv.decode(new Buffer(body), "utf8");
//Utf8String = Utf8String.replace(/<Style>/g,"<LayerStyle>");
//body = Utf8String.replace(/<\/Style>/g,"</LayerStyle>");

var json = x2js.xml2js(Utf8String);
var trans = {};

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

var data = fs.readFileSync( "./cologne/flaechennutzungsplan_cologne.geojson" );
var json = JSON.parse(data);

var attributes = {};

for(var i = 0; i<json.features.length; i++){
    if(json.features[i].properties.subtype in trans){
        var allgood = true;
        for(var key in trans[json.features[i].properties.subtype].keys){
            if(json.features[i].properties[key] !== trans[json.features[i].properties.subtype].keys[key]){
                allgood = false;
            }
        }

        if(!allgood){
            console.log(trans[json.features[i].properties.subtype], "unknown combinations");
        }else{
            console.log("good");
        }
    }else{
        console.log(json.features[i].properties.subtype, "subtype not found");
    }

    for(var key in json.features[i].properties){
        if(
            key === "ZWECK" || 

            key === "TYP" || 
            key === "LABEL1" || 
            key === "subtype" || 

            key === "TYPspezial" || 
            key === "Abk"
        ){

            if(!(key in attributes)){
                attributes[key] = [];
            }
            var val = json.features[i].properties[key];

            if(key === "subtype" && (json.features[i].properties[key] in trans)){
                val = trans[json.features[i].properties[key]].value;
            }

            if(attributes[key].indexOf(val)===-1){
                attributes[key].push(val);
            }
        }
    }
}

fs.writeFile('./cologne/flaechennutzungsplan_cologne_attributes.json', JSON.stringify(attributes, null, '\t'), function (err) {
    if (err) return console.log(err);
    process.exit();
});*/




/*

//BERLIN

var data = fs.readFileSync( "./berlin/flaechennutzungsplan_berlin.geojson" );
var json = JSON.parse(data);

var attributes = {};

for(var i = 0; i<json.features.length; i++){
    for(var key in json.features[i].properties){
        if(
            key === "NEUBKLAR" || //:"Bezirk",
            key === "BEZKLAR" || //:"Alte Bezirk",
            key === "BAUNKLAR" || //:"Nutzung der bebauten Flächen",
            key === "GRZKL" || //:"Nutzung der unbebauten Flächen",
            key === "TYPKLAR" //:"Fächentyp",
        ){
            if(!(key in attributes)){
                attributes[key] = [];
            }
            if(attributes[key].indexOf(json.features[i].properties[key])===-1){
                attributes[key].push(json.features[i].properties[key]);
            }
        }
    }
}

fs.writeFile('./berlin/flaechennutzungsplan_berlin_attributes.json', JSON.stringify(attributes, null, '\t'), function (err) {
    if (err) return console.log(err);
    process.exit();
});*/
