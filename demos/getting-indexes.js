// define a geometry
var geometry = ee.Geometry.Point([-77.02748021809037, -0.4642960523160016]);

// Import modules
var col = require('users/mapbiomas/mapbiomas-mosaics:modules/Collection.js');
var bns = require('users/mapbiomas/mapbiomas-mosaics:modules/BandNames.js');
var ind = require('users/mapbiomas/mapbiomas-mosaics:modules/SpectralIndexes.js');

// get band names
var bands = bns.get('l8');

// Get Landsat image collection
var obj = {
    'collectionid': 'LANDSAT/LC08/C01/T1_SR',
    'geometry': geometry,
    'dateStart': '2013-01-01',
    'dateEnd': '2018-12-31',
    'cloudCover': 50,
};

// Get image collection
var collection = col.getCollection(obj)
    .select(bands.bandNames, bands.newNames);

var SpectralIndexesCollection = collection.map(
    function (image) {

        // Ilumination correction
        // image = ilc.iluminationCorrection(image);

        // Calculate NDVI  and add to band
        image = ind.getNDVI(image);

        // Calculate EVI  and add to band
        image = ind.getEVI(image);

        return image;
    }
);

print('Index Collection', SpectralIndexesCollection);

Map.centerObject(geometry, 13);
