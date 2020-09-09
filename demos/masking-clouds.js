// define a geometry
var geometry = ee.Geometry.Point([-77.02052053414934, -0.47431950004231643]);

var col = require('users/mapbiomas/mapbiomas-mosaics:modules/Collection.js');
var csm = require('users/mapbiomas/mapbiomas-mosaics:modules/CloudAndShadowMasking.js');
var bns = require('users/mapbiomas/mapbiomas-mosaics:modules/BandNames.js');

var bands = bns.get('l8');

var objLandsat = {
	'collectionid': 'LANDSAT/LC08/C01/T1_SR',
	'geometry': geometry,
	'dateStart': '2017-01-01',
	'dateEnd': '2017-12-31',
	'cloudCover': 70,
};

var collectionLandsat = col.getCollection(objLandsat)
	.select(bands.bandNames, bands.newNames);

var collectionWithMasks = csm.getMasks({
	'collection': collectionLandsat,
	'cloudBQA': true,    // cloud mask using pixel QA
	'cloudScore': true,  // cloud mas using simple cloud score
	'shadowBQA': true,   // cloud shadow mask using pixel QA
	'shadowTdom': true,  // cloud shadow using tdom
	'zScoreThresh': -1,
	'shadowSumThresh': 4000,
	'dilatePixels': 2,
	'cloudHeights': [200, 700, 1200, 1700, 2200, 2700, 3200, 3700, 4200, 4700],
	'cloudBand': 'cloudBQAMask'//'cloudScoreMask' or 'cloudShadowFlagMask'
});

print(collectionWithMasks);

// Collection without clouds
var collectionWithoutClouds = collectionWithMasks.map(
	function (image) {
		var masks = image.select([
			'cloudBQAMask',
			'cloudScoreMask',
			'shadowBQAMask',
			'shadowTDOMMask'
		])
			.reduce(ee.Reducer.anyNonZero());

		return image.mask(masks.eq(0));
	}
);

Map.addLayer(collectionWithoutClouds,
	{
		"opacity": 1,
		"bands": ["swir1", "nir", "red"],
		"min": 259.42,
		"max": 9015.58,
		"gamma": 1
	});

Map.addLayer(ee.Image(collectionWithMasks.first()),
	{
		"bands": ["shadowBQAMask"],
		"min": 0,
		"max": 1,
	},
	"shadowBQAMask");

Map.addLayer(ee.Image(collectionWithMasks.first()),
	{
		"bands": ["shadowTDOMMask"],
		"min": 0,
		"max": 1,
	},
	"shadowTDOMMask");

Map.addLayer(ee.Image(collectionWithMasks.first()),
	{
		"bands": ["cloudBQAMask"],
		"min": 0,
		"max": 1,
	},
	"cloudBQAMask");

Map.centerObject(geometry, 9);