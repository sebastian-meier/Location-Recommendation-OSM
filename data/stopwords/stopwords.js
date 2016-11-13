var fs = require("fs"),
    csv = require("fast-csv");

var lists = [
    "de.csv",
    "de1.csv",
    "de2.csv",
    "en.csv",
    "en1.csv",
    "en2.csv",
    "multi.csv"
];

var sw = {};

var lc = 0;

function readCSV(){
    fs.createReadStream(lists[lc])
        .pipe(csv())
        .on("data", function(data){
            if(!(data[0] in sw)){
                sw[data[0]] = true;
            }
        })
        .on("end", function(){
            lc++;
            if(lc<lists.length){
                readCSV();
            }else{
                saveCSV();
            }
        });
}

readCSV();

function saveCSV(){
    var data = [];

    for(var key in sw){
        data.push([key]);
    }

    var ws = fs.createWriteStream("all.csv");
    csv
       .write(data, {headers: true})
       .pipe(ws);

   ws.on("finish", function(){
       console.log("DONE!");
   });
}
