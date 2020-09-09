// define a geometry
var geometry = ee.Geometry.Point([-78.02805215948104, -1.1815771712637269]);

// Import modules
var col = require('users/mapbiomas/mapbiomas-mosaics:modules/Collection.js');
var bns = require('users/mapbiomas/mapbiomas-mosaics:modules/BandNames.js');
var sma = require('users/mapbiomas/mapbiomas-mosaics:modules/SmaAndNdfi.js');

// Get band names
var bands = bns.rename('l8');

// Define collection parameters
var obj = {
    'collectionid': 'LANDSAT/LC08/C01/T1_SR',
    'geometry': geometry,
    'dateStart': '2017-01-01',
    'dateEnd': '2017-12-31',
    'cloudCover': 50,
};

// Get Collection
var collection = col.getCollection(obj)
    .select(bands.bandNames, bands.newNames);

// Apply SMA
var collectionSma = collection.map(
    function (image) {
        return sma.getSMAFractions(image, sma.L8Endmembers);
    }
);

// Calculate NDFI
var collectionNdfi = collectionSma.map(
    function (image) {
        return sma.getNDFI(image);
    }
);

print(collectionNdfi);
