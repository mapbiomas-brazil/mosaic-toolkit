/**
 * user defined parameters
 */
var regionAsset = 'projects/mapbiomas-workspace/AUXILIAR/landsat-scenes';

// define a geometry
var pathRow = '217073';

var geometry = ee.Feature(
    ee.FeatureCollection(regionAsset)
        .filterMetadata('WRSPR', 'equals', pathRow)
        .first())
    .geometry();

// define a list of parameters for each mosaic

var params = [
    { 'year': 2020, 'dateStart': '2020-01-01', 'dateEnd': '2020-12-31', 'territory': 'MATA ATLANTICA' },
    { 'year': 2021, 'dateStart': '2021-01-01', 'dateEnd': '2021-12-31', 'territory': 'MATA ATLANTICA' },
    { 'year': 2022, 'dateStart': '2022-01-01', 'dateEnd': '2022-12-31', 'territory': 'MATA ATLANTICA' },
    { 'year': 2023, 'dateStart': '2023-01-01', 'dateEnd': '2023-12-31', 'territory': 'MATA ATLANTICA' },
    { 'year': 2024, 'dateStart': '2024-01-01', 'dateEnd': '2024-12-31', 'territory': 'MATA ATLANTICA' },
];

var version = '1';

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
var collectionId = 'LANDSAT/COMPOSITES/C02/T1_L2_32DAY';

// Spectral bands selected
var spectralBands = ['blue', 'red', 'green', 'nir', 'swir1', 'swir2'];

// endemembers collection
var endmembers = sma.endmembers['landsat-8'];

/**
 * script to run the mosaics
 */
params.forEach(
    function (obj) {

        var collection = ee.ImageCollection(collectionId)
            .filter(ee.Filter.date(obj.dateStart, obj.dateEnd))
            .filter(ee.Filter.bounds(geometry))
            .select(spectralBands);

        // apply scaling factor
        collection = collection.map(
            function (image) {
                return image.multiply(10000).copyProperties(image, ['system:time_start', 'system:time_end']);
            }
        );

        // apply SMA
        collection = collection.map(
            function (image) {
                return sma.getFractions(image, endmembers);
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
            'dateStart': obj.dateStart,
            'dateEnd': obj.dateEnd,
            'bandReference': 'ndvi',
            'percentileDry': 25,
            'percentileWet': 75,
        });

        // get other bands
        mosaic = mis.getSlope(mosaic);
        mosaic = mis.getEntropyG(mosaic);

        // // set band data types
        // // mosaic = dtp.setBandTypes(mosaic);

        // set mosaic properties
        mosaic = mosaic
            .set('year', obj.year)
            .set('territory', obj.territory)
            .set('version', version);

        print(mosaic);

        var name = (
            obj.territory.replace(' ', '') + '-' +
            pathRow + '-' +
            obj.year + '-' +
            version
        ).toUpperCase();

        mosaic = mosaic.clip(geometry);

        Map.addLayer(mosaic, vis, name);
    }
);

Map.centerObject(geometry, 10);
