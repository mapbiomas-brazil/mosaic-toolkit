/**
 * user defined parameters
 */
var outputAsset = 'projects/mapbiomas-workspace/MOSAICS/workspace-c5';
var regionAsset = 'projects/mapbiomas-workspace/AUXILIAR/landsat-scenes';

// define a geometry
var pathRow = '225076';

var geometry = ee.Feature(
    ee.FeatureCollection(regionAsset)
        .filterMetadata('WRSPR', 'equals', pathRow)
        .first())
    .geometry()
    .centroid();

// define a list of bad images
var trash = [
    'LT05_126061_20040812', //example
];

// define a list of parameters for each mosaic
// year, dateStart, dateEnd, satellite, cloudCover, regionName
var params = [
    [2017, '2017-01-01', '2017-12-31', 'l8', 70, 'MATA ATLANTICA'],
    [2018, '2018-01-01', '2018-12-31', 'l8', 70, 'MATA ATLANTICA'],
    [2019, '2019-01-01', '2019-12-31', 'l8', 70, 'MATA ATLANTICA']
];

var version = '1';

var collectionVersion = '1.0';

var vis = {
    'bands': 'swir1_median,nir_median,red_median',
    'gain': '0.08,0.06,0.2',
    'gamma': 0.5
};

/**
 * import modules
 */
var bns = require('users/mapbiomas/mapbiomas-mosaics:modules/BandNames.js');
var csm = require('users/mapbiomas/mapbiomas-mosaics:modules/CloudAndShadowMasking.js');
var col = require('users/mapbiomas/mapbiomas-mosaics:modules/Collection.js');
var dtp = require('users/mapbiomas/mapbiomas-mosaics:modules/DataType.js');
var ind = require('users/mapbiomas/mapbiomas-mosaics:modules/SpectralIndexes.js');
var mis = require('users/mapbiomas/mapbiomas-mosaics:modules/Miscellaneous.js');
var mos = require('users/mapbiomas/mapbiomas-mosaics:modules/Mosaic.js');
var sma = require('users/mapbiomas/mapbiomas-mosaics:modules/SmaAndNdfi.js');

// landsat collections
var collectionIds = {
    'l4': 'LANDSAT/LT04/C01/T1_SR',
    'l5': 'LANDSAT/LT05/C01/T1_SR',
    'l7': 'LANDSAT/LE07/C01/T1_SR',
    'l8': 'LANDSAT/LC08/C01/T1_SR',
};

// endemembers collection
var endmembers = {
    'l4': sma.endmembers['landsat-4'],
    'l5': sma.endmembers['landsat-5'],
    'l7': sma.endmembers['landsat-7'],
    'l8': sma.endmembers['landsat-8'],
    'lx': sma.endmembers['landsat-5'],
};

/**
 * user defined functions
 */

/**
 * 
 * @param {*} collection 
 */
var applyCloudAndSahdowMask = function (collection) {

    var collectionWithMasks = csm.getMasks({
        'collection': collection,
        'cloudBQA': true,    // cloud mask using pixel QA
        'cloudScore': true,  // cloud mas using simple cloud score
        'shadowBQA': true,   // cloud shadow mask using pixel QA
        'shadowTdom': true,  // cloud shadow using tdom
        'zScoreThresh': -1,
        'shadowSumThresh': 4000,
        'dilatePixels': 2,
        'cloudHeights': [200, 700, 1200, 1700, 2200, 2700, 3200, 3700, 4200, 4700],
        'cloudBand': 'cloudBQAMask' //'cloudScoreMask' or 'cloudBQAMask'
    });

    // get collection without clouds
    var collectionWithoutClouds = collectionWithMasks.map(
        function (image) {
            return image.mask(
                image.select([
                    'cloudBQAMask',
                    'cloudScoreMask',
                    'shadowBQAMask',
                    'shadowTdomMask'
                ]).reduce(ee.Reducer.anyNonZero()).eq(0)
            );
        }
    );

    return collectionWithoutClouds;
};

/**
 * script to run the mosaics
 */
params.forEach(
    function (param) {

        var spectralBands = ['blue', 'red', 'green', 'nir', 'swir1', 'swir2'];

        var collection;

        if (param[3] !== 'lx') {

            var objLandsat = {
                'collectionid': collectionIds[param[3]],
                'geometry': geometry,
                'dateStart': param[1],
                'dateEnd': param[2],
                'cloudCover': param[4],
            };

            var bands = bns.get(param[3]);

            collection = col.getCollection(objLandsat)
                .select(bands.bandNames, bands.newNames)
                .filter(ee.Filter.inList('system:index', trash).not());

            collection = applyCloudAndSahdowMask(collection)
                .select(spectralBands);
        } else {

            var objLandsat5 = {
                'collectionid': collectionIds['l5'],
                'geometry': geometry,
                'dateStart': param[1],
                'dateEnd': param[2],
                'cloudCover': param[4],
            };

            var objLandsat7 = {
                'collectionid': collectionIds['l7'],
                'geometry': geometry,
                'dateStart': param[1],
                'dateEnd': param[2],
                'cloudCover': param[4],
            };

            var bandsL5 = bns.get('l5');
            var bandsL7 = bns.get('l7');

            var collectionL5 = col.getCollection(objLandsat5)
                .select(bandsL5.bandNames, bandsL5.newNames);

            var collectionL7 = col.getCollection(objLandsat7)
                .select(bandsL7.bandNames, bandsL7.newNames);

            collection = collectionL5.merge(collectionL7)
                .filter(ee.Filter.inList('system:index', trash).not());

            collection = applyCloudAndSahdowMask(collection)
                .select(spectralBands);
        }

        // If collection is toa
        // collection = collection.map(
        //     function (image) {
        //         return image.multiply(10000);
        //     }
        // );

        // apply SMA
        collection = collection.map(
            function (image) {
                return sma.getFractions(image, endmembers[param[3]]);
            }
        );

        // calculate SMA indexes        
        collection = collection
            .map(sma.getNDFI)
            .map(sma.getSEFI)
            .map(sma.getWEFI)
            .map(sma.getFNS);

        // calculate Spectral indexes        
        collection = collection
            .map(ind.getCAI)
            .map(ind.getEVI2)
            .map(ind.getGCVI)
            .map(ind.getHallCover)
            .map(ind.getHallHeigth)
            .map(ind.getNDVI)
            .map(ind.getNDWI)
            .map(ind.getPRI)
            .map(ind.getSAVI);

        var mosaic = mos.getMosaic({
            'collection': collection,
            'dateStart': param[1],
            'dateEnd': param[2],
            'bandReference': 'ndvi',
            'percentileDry': 25,
            'percentileWet': 75,
        });

        // get other bands
        mosaic = mis.getSlope(mosaic);
        mosaic = mis.getEntropyG(mosaic);

        // set band data types
        mosaic = dtp.setBandTypes(mosaic);

        // set mosaic properties
        mosaic = mosaic
            .set('year', param[0])
            .set('biome', param[5])
            .set('cloud_cover', param[4])
            .set('sensor', param[3])
            .set('version', version)
            .set('collection', collectionVersion);

        print(mosaic);

        var name = (
            param[5].replace(' ', '') + '-' +
            pathRow + '-' +
            param[3] + '-' +
            String(param[0]) + '-' +
            version
        ).toUpperCase();

        Map.addLayer(mosaic, vis, name);
    }
);

Map.centerObject(geometry, 12);
