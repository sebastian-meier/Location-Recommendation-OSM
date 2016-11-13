var fs = require('fs');

var fs_client = {
	id : 		"4YS5YTCFC3CEVNPIILTVJBRNHP1BLHEVBDA4UN01I0MICLHO",
	secret : 	"UXYMQW05NPQXFRYUDD0GCA2EDUADD0JMLS4DDKIY5UHWQJ5J"
};

var foursquare = require('node-foursquare-venues')(fs_client.id, fs_client.secret, '20160229', 'foursquare');

foursquare.venues.categories(
    function(res, data){
        fs.writeFile('categories.json', JSON.stringify(data), function (err) {
            if (err) return console.log(err);
            process.exit();
        });

    }
);
