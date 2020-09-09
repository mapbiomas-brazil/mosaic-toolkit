/**
 * @name
 *      setProperties
 * @description
 *      Normaliza algumas propriedades entre imagens Landsat e Sentinel-2
 * @argument
 *      ee.Image
 * @returns
 *      ee.Image
 */
var setProperties = function (image) {

    var cloudCover = ee.Algorithms.If(image.get('SPACECRAFT_NAME'),
        image.get('CLOUDY_PIXEL_PERCENTAGE'),
        image.get('CLOUD_COVER')
    );

    var date = ee.Algorithms.If(image.get('DATE_ACQUIRED'),
        image.get('DATE_ACQUIRED'),
        ee.Algorithms.If(image.get('SENSING_TIME'),
            image.get('SENSING_TIME'),
            image.get('GENERATION_TIME')
        )
    );

    var satellite = ee.Algorithms.If(image.get('SPACECRAFT_ID'),
        image.get('SPACECRAFT_ID'),
        ee.Algorithms.If(image.get('SATELLITE'),
            image.get('SATELLITE'),
            image.get('SPACECRAFT_NAME')
        )
    );

    var azimuth = ee.Algorithms.If(image.get('SUN_AZIMUTH'),
        image.get('SUN_AZIMUTH'),
        ee.Algorithms.If(image.get('SOLAR_AZIMUTH_ANGLE'),
            image.get('SOLAR_AZIMUTH_ANGLE'),
            image.get('MEAN_SOLAR_AZIMUTH_ANGLE')
        )
    );

    var elevation = ee.Algorithms.If(image.get('SUN_ELEVATION'),
        image.get('SUN_ELEVATION'),
        ee.Algorithms.If(image.get('SOLAR_ZENITH_ANGLE'),
            ee.Number(90).subtract(image.get('SOLAR_ZENITH_ANGLE')),
            ee.Number(90).subtract(image.get('MEAN_SOLAR_ZENITH_ANGLE'))
        )
    );

    var reflectance = ee.Algorithms.If(
        ee.String(ee.Dictionary(ee.Algorithms.Describe(image)).get('id')).match('SR').length(),
        'SR',
        'TOA'
    );

    return image
        .set('image_id', image.id())
        .set('cloud_cover', cloudCover)
        .set('satellite_name', satellite)
        .set('sun_azimuth_angle', azimuth)
        .set('sun_elevation_angle', elevation)
        .set('reflectance', reflectance)
        .set('date', ee.Date(date).format('Y-MM-dd'));
};

/**
 * @name
 *      getCollection
 * @description
 *      Cria uma coleção de imagens aplicando filtros de metadados
 * @argument
 *      Objeto contendo os atributos
 *          @attribute collectionid {String}
 *          @attribute geometry {ee.Geometry}
 *          @attribute dateStart {String 'yyyy-mm-dd'}
 *          @attribute dateEnd {String 'yyyy-mm-dd'}
 *          @attribute cloud_cover {Float}
 * @example
 *      var obj = {
 *          'collectionid': 'LANDSAT/LC08/C01/T1_TOA', //COPERNICUS/S2
 *          'geometry': geometry,
 *          'dateStart': '2017-01-01',
 *          'dateEnd': '2017-12-31',
 *          'cloudCover': 70,
 *      };
 *      
 *      var collection = getCollection(obj);
 * @returns
 *      ee.ImageCollection
 */
exports.getCollection = function (obj) {

    var filters = ee.Filter.and(
        ee.Filter.bounds(obj.geometry),
        ee.Filter.date(obj.dateStart, obj.dateEnd),
        ee.Filter.lte('cloud_cover', obj.cloudCover)
    );

    var collection = ee.ImageCollection(obj.collectionid)
        .map(setProperties)
        .filter(filters);

    return collection;
};