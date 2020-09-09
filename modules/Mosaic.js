/**
 * 
 * @param obj 
 * 
 * @example
 *      var obj = {
 *          'collection': collection,
 *          'dateStart': '2018-01-01',
 *          'dateEnd': '2018-12-31',
 *          'medianList': ['image_1', 'image_2'],
 *          'bandReference': 'ndvi',
 *          'percentilDry': 25,
 *          'percentilWet': 75,
 *      };
 *      
 *      var mosaic = getMosaic(obj);
 */
exports.getMosaic = function (obj) {

    // get band names and create its suffix
    var bands = ee.Image(obj.collection.first()).bandNames();

    var bandsDry = bands.map(function (band) {
        return ee.String(band).cat('_median_dry');
    });

    var bandsWet = bands.map(function (band) {
        return ee.String(band).cat('_median_wet');
    });

    var bandsAmp = bands.map(function (band) {
        return ee.String(band).cat('_amp');
    });

    // get dry season collection
    var ndviDry = obj.collection
        .select(['ndvi'])
        .reduce(ee.Reducer.percentile([obj.percentileDry]));

    var collectionDry = obj.collection.map(
        function (image) {
            return image.mask(image.select(['ndvi']).lte(ndviDry));
        }
    );

    // get wet season collection
    var ndviWet = obj.collection
        .select(['ndvi'])
        .reduce(ee.Reducer.percentile([obj.percentileWet]));

    var collectionWet = obj.collection.map(
        function (image) {
            return image.mask(image.select(['ndvi']).gte(ndviWet));
        }
    );

    // Reduce collection to median mosaic
    var mosaic = obj.collection.filter(
        ee.Filter.date(obj.dateStart, obj.dateEnd)
    ).reduce(ee.Reducer.median());

    // get dry median mosaic
    var mosaicDry = collectionDry.reduce(ee.Reducer.median())
        .rename(bandsDry);

    // get wet median mosaic
    var mosaicWet = collectionWet.reduce(ee.Reducer.median())
        .rename(bandsWet);

    // get minimum mosaic
    var mosaicMin = obj.collection.reduce(ee.Reducer.min());

    // get maximum mosaic
    var mosaicMax = obj.collection.reduce(ee.Reducer.max());

    // get amplitude mosaic
    var mosaicAmp = mosaicMax.subtract(mosaicMin)
        .rename(bandsAmp);

    // get stdDev mosaic
    var mosaicStdDev = obj.collection.reduce(ee.Reducer.stdDev());

    mosaic = mosaic
        .addBands(mosaicDry)
        .addBands(mosaicWet)
        .addBands(mosaicMin)
        .addBands(mosaicMax)
        .addBands(mosaicAmp)
        .addBands(mosaicStdDev)

    return mosaic;
};
