// define a geometry
var geometry = ee.Geometry.Point([-77.13788397078224, -0.5868972439402838]);

var col = require('users/mapbiomas/mapbiomas-mosaics:modules/Collection.js');

// Landsat 8 toa collection
var objToa = {
    'collectionid': 'LANDSAT/LC08/C01/T1_TOA',
    'geometry': geometry,
    'dateStart': '2017-01-01',
    'dateEnd': '2017-12-31',
    'cloudCover': 70,
};

var collectionLandsatTOA = col.getCollection(objToa);

print(collectionLandsatTOA);

// Landsat 8 SR collection
var objSr = {
    'collectionid': 'LANDSAT/LC08/C01/T1_SR',
    'geometry': geometry,
    'dateStart': '2017-01-01',
    'dateEnd': '2017-12-31',
    'cloud_cover': 70,
};

var collectionLandsatSR = col.getCollection(objSr);

print(collectionLandsatSR);