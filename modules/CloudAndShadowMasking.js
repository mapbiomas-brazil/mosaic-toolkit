/**
 * @name
 *      reescale
 * @description
 *      Aplica o reescalonamento em uma imagem
 * @argument
 *      Objecto contendo os atributos
 *          @attribute image {ee.Image}
 *          @attribute min {Integer}
 *          @attribute max {Integer}
 * @example
 *      var obj = {
 *          'image': image.expression('b(red) + b(green) + b(blue)'),
 *          'min': 2000,
 *          'max': 8000
 *      };
 *      
 *      var reescaled = reescale(obj);
 * @returns
 *      ee.Image
 */
var rescale = function (obj) {

    var image = obj.image.subtract(obj.min).divide(ee.Number(obj.max).subtract(obj.min));

    return image;
};

/**
 * @name
 *      cloudScore
 * @description
 *      Constroi uma máscara de nuvens usando varios indicadores de presença de nuvens 
 * @argument
 *      @attribute image {ee.Image}
 * @example
 *      var image = cloudScore(image);
 * @returns
 *      ee.Image
 */
var cloudScore = function (image) {

    var cloudThresh = 10;

    // Compute several indicators of cloudiness and take the minimum of them.
    var score = ee.Image(1.0);

    // Clouds are reasonably bright in the blue band.
    score = score.min(rescale({
        'image': image.select(['blue']),
        'min': 1000,
        'max': 3000
    }));

    // Clouds are reasonably bright in all visible bands.
    score = score.min(rescale({
        'image': image.expression("b('red') + b('green') + b('blue')"),
        'min': 2000,
        'max': 8000
    }));

    // Clouds are reasonably bright in all infrared bands.
    score = score.min(rescale({
        'image': image.expression("b('nir') + b('swir1') + b('swir2')"),
        'min': 3000,
        'max': 8000
    }));

    // Clouds are reasonably cool in temperature.
    var temperature = image.select(['temp']);

    // score = score.where(temperature.mask(),
    //     score.min(rescale({
    //         'image': temperature,
    //         'min': 300,
    //         'max': 290
    //     })));

    // However, clouds are not snow.
    var ndsi = image.normalizedDifference(['green', 'swir1']);

    score = score.min(rescale({
        'image': ndsi,
        'min': 0.8,
        'max': 0.6
    })).multiply(100).byte();

    score = score.gte(cloudThresh).rename('cloudScoreMask');

    return image.addBands(score);
};

/**
 * @name
 *      tdom
 * @description
 *      The TDOM method first computes the mean and standard deviation of the near-infrared(NIR) and
 *      shortwave-infrared(SWIR1) bands across a collection of images.For each image, the algorithm then
 *      computes the z - score of the NIR and SWIR1 bands(z(Mb))(Equation(5))(Figure 2). Each image also has a
 *      darkness metric computed as the sum of the NIR and SWIR1 bands().Cloud shadows are then identified
 *      if a pixel has a z - score of less than −1 for both the NIR and SWIR1 bands and a darkness
 *      value less than 0.35 (Equation(8)).These thresholds were chosen after extensive qualitative evaluation of
 *      TDOM outputs from across the CONUS.
 * 
 * https://www.mdpi.com/2072-4292/10/8/1184/htm
 * @argument
 *      Objecto contendo os atributos
 *          @attribute collection {ee.ImageCollection}
 *          @attribute zScoreThresh {Float}
 *          @attribute shadowSumThresh {Float}
 *          @attribute dilatePixels {Integer}
 * @example
 *      var obj = {
 *          'collection': collection,
 *          'zScoreThresh': -1,
 *          'shadowSumThresh': 0.5,
 *          'dilatePixels': 2,
 *      };
 *      
 *      collection = tdom(obj);
 * @returns
 *      ee.ImageCollection
 */
var tdom = function (obj) {

    var shadowSumBands = ['nir', 'swir1'];

    // Get some pixel-wise stats for the time series
    var irStdDev = obj.collection
        .select(shadowSumBands)
        .reduce(ee.Reducer.stdDev());

    var irMean = obj.collection
        .select(shadowSumBands)
        .mean();

    // Mask out dark dark outliers
    var collection = obj.collection.map(
        function (image) {
            var zScore = image.select(shadowSumBands)
                .subtract(irMean)
                .divide(irStdDev);

            var irSum = image.select(shadowSumBands)
                .reduce(ee.Reducer.sum());

            var tdomMask = zScore.lt(obj.zScoreThresh)
                .reduce(ee.Reducer.sum())
                .eq(2)
                .and(irSum.lt(obj.shadowSumThresh));

            tdomMask = tdomMask.focal_min(obj.dilatePixels);

            return image.addBands(tdomMask.rename('tdomMask'));
        }
    );

    return collection;
};

/**
 * @name
 *      cloudProject
 * @description
 *      
 * @argument
 *      Objecto contendo os atributos
 *          @attribute image {ee.Image}
 *          @attribute cloudHeights {ee.List}
 *          @attribute shadowSumThresh {Float}
 *          @attribute dilatePixels {Integer}
 *          @attribute cloudBand {String}
 * @example
 *      var obj = {
 *          'image': image,
 *          'cloudHeights': ee.List.sequence(200, 10000, 500),
 *          'shadowSumThresh': 0.5,
 *          'dilatePixels': 2,
 *          'cloudBand': 'cloudScoreMask',
 *      };
 *      
 *      image = cloudProject(obj);
 * @returns
 *      ee.Image
 */
var cloudProject = function (obj) {

    // Get the cloud mask
    var cloud = obj.image
        .select(obj.cloudBand);

    // Get TDOM mask
    var tdomMask = obj.image
        .select(['tdomMask']);

    //Project the shadow finding pixels inside the TDOM mask that are dark and 
    //inside the expected area given the solar geometry
    //Find dark pixels
    var darkPixels = obj.image.select(['nir', 'swir1', 'swir2'])
        .reduce(ee.Reducer.sum())
        .lt(obj.shadowSumThresh);

    //Get scale of image
    var nominalScale = cloud
        .projection()
        .nominalScale();

    //Find where cloud shadows should be based on solar geometry
    //Convert to radians
    var meanAzimuth = obj.image.get('sun_azimuth_angle');
    var meanElevation = obj.image.get('sun_elevation_angle');

    var azR = ee.Number(meanAzimuth)
        .multiply(Math.PI)
        .divide(180.0)
        .add(ee.Number(0.5).multiply(Math.PI));

    var zenR = ee.Number(0.5)
        .multiply(Math.PI)
        .subtract(ee.Number(meanElevation).multiply(Math.PI).divide(180.0));

    //Find the shadows
    var shadows = obj.cloudHeights.map(
        function (cloudHeight) {

            cloudHeight = ee.Number(cloudHeight);

            var shadowCastedDistance = zenR.tan()
                .multiply(cloudHeight); //Distance shadow is cast

            var x = azR.cos().multiply(shadowCastedDistance)
                .divide(nominalScale).round(); //X distance of shadow

            var y = azR.sin().multiply(shadowCastedDistance)
                .divide(nominalScale).round(); //Y distance of shadow

            return cloud.changeProj(cloud.projection(), cloud.projection()
                .translate(x, y));
        }
    );

    var shadow = ee.ImageCollection.fromImages(shadows).max().unmask();

    //Create shadow mask
    shadow = shadow.focal_max(obj.dilatePixels);
    shadow = shadow.and(darkPixels).and(tdomMask.not().and(cloud.not()));

    var shadowMask = shadow
        .rename(['shadowTdomMask']);

    return obj.image.addBands(shadowMask);
};

/**
 * @name
 *      cloudBQAMaskToaLX
 * @description
 *      
 * @argument
 * 
 * @example
 * 
 * @returns
 *      ee.Image
 */
var cloudBQAMaskToaLX = function (image) {

    var qaBand = image.select('BQA');

    var cloudMask = qaBand.bitwiseAnd(Math.pow(2, 5)).neq(0)
        .or(qaBand.bitwiseAnd(Math.pow(2, 6)).neq(0))
        .rename('cloudBQAMask');

    return ee.Image(cloudMask);
};

/**
 * @name
 *      cloudBQAMaskToaS2
 * @description
 *      
 * @argument
 * 
 * @example
 * 
 * @returns
 *      ee.Image
 */
var cloudBQAMaskToaS2 = function (image) {

    var qaBand = image.select('BQA');

    var cloudMask = qaBand.bitwiseAnd(Math.pow(2, 10)).neq(0)
        .or(qaBand.bitwiseAnd(Math.pow(2, 11)).neq(0))
        .rename('cloudBQAMask');

    return ee.Image(cloudMask);
};

/**
 * @name
 *      cloudBQAMaskToa
 * @description
 *      
 * @argument
 * 
 * @example
 * 
 * @returns
 *      ee.Image
 */
var cloudBQAMaskToa = function (image) {

    var cloudMask = ee.Algorithms.If(
        ee.String(image.get('satellite_name')).slice(0, 10).compareTo('Sentinel-2').not(),
        cloudBQAMaskToaS2(image),
        cloudBQAMaskToaLX(image)
    );

    return ee.Image(cloudMask);
};

/**
 * @name
 *      cloudBQAMaskSr
 * @description
 *      
 * @argument
 * 
 * @example
 * 
 * @returns
 *      ee.Image
 */
var cloudBQAMaskSr = function (image) {

    var qaBand = image.select(['pixel_qa']);

    var cloudMask = qaBand.bitwiseAnd(Math.pow(2, 5)).neq(0)
        .rename('cloudBQAMask');

    return ee.Image(cloudMask);
};

/**
 * @name
 *      cloudBQAMask
 * @description
 *      
 * @argument
 * 
 * @example
 * 
 * @returns
 *      ee.Image
 */
var cloudBQAMask = function (image) {

    var cloudMask = ee.Algorithms.If(
        ee.String(image.get('reflectance')).compareTo('TOA').not(),
        cloudBQAMaskToa(image),
        cloudBQAMaskSr(image)
    );

    return image.addBands(ee.Image(cloudMask));
};

/**
 * @name
 *      shadowBQAMaskToaLX
 * @description
 *      
 * @argument
 * 
 * @example
 * 
 * @returns
 *      ee.Image
 */
var shadowBQAMaskToaLX = function (image) {

    var qaBand = image.select('BQA');

    var cloudShadowMask = qaBand.bitwiseAnd(Math.pow(2, 7)).neq(0)
        .or(qaBand.bitwiseAnd(Math.pow(2, 8)).neq(0))
        .rename('shadowBQAMask');

    return ee.Image(cloudShadowMask);
};

/**
 * @name
 *      shadowBQASrLX
 * @description
 *      
 * @argument
 * 
 * @example
 * 
 * @returns
 *      ee.Image
 */
var shadowBQAMaskSrLX = function (image) {

    var qaBand = image.select(['pixel_qa']);

    var cloudShadowMask = qaBand.bitwiseAnd(Math.pow(2, 3)).neq(0)
        .rename('shadowBQAMask');

    return ee.Image(cloudShadowMask);
};

/**
 * @name
 *      cloudBQAMask
 * @description
 *      
 * @argument
 * 
 * @example
 * 
 * @returns
 *      ee.Image
 */
var shadowBQAMask = function (image) {

    var cloudShadowMask = ee.Algorithms.If(
        ee.String(image.get('satellite_name')).slice(0, 10).compareTo('Sentinel-2').not(),
        // true
        ee.Image(0).mask(image.select(0)).rename('shadowBQAMask'),
        // false
        ee.Algorithms.If(ee.String(image.get('reflectance')).compareTo('TOA').not(),
            shadowBQAMaskToaLX(image),
            shadowBQAMaskSrLX(image)
        )
    );

    return image.addBands(ee.Image(cloudShadowMask));
};

/**
 * @name
 *      getMasks
 * @description
 *      
 * @argument
 *      Objecto contendo os atributos
 *          @attribute collection {ee.ImageCollection}
 *          @attribute cloudBQA {Boolean}
 *          @attribute cloudScore {Boolean}
 *          @attribute shadowBQA {Boolean}
 *          @attribute shadowTdom {Boolean}
 *          @attribute zScoreThresh { Float}
 *          @attribute shadowSumThresh { Float}
 *          @attribute dilatePixels { Integer}
 *          @attribute cloudHeights {ee.List}
 *          @attribute cloudBand {String}
 * @example
 *      var obj = {
 *          'collection': collection,
 *          'cloudBQA': true,
 *          'cloudScore': true,
 *          'shadowBQA': true,
 *          'shadowTdom': true,
 *          'zScoreThresh': -1,
 *          'shadowSumThresh': 0.5,
 *          'dilatePixels': 2,
 *          'cloudHeights': ee.List.sequence(200, 10000, 500),
 *          'cloudBand': 'cloudScoreMask'
 *      };
 *      
 *      var collectionWithMasks = getMasks(obj);
 * @returns
 *      ee.ImageCollection
 */
exports.getMasks = function (obj) {

    // Cloud mask
    var collection = ee.Algorithms.If(obj.cloudBQA,
        ee.Algorithms.If(obj.cloudScore,
            // cloudBQA is true and cloudScore is true
            obj.collection.map(cloudBQAMask).map(cloudScore),
            // cloudBQA is true and cloudScore is false
            obj.collection.map(cloudBQAMask)),
        // cloudBQA is false and cloudScore is true
        obj.collection.map(cloudScore));

    collection = ee.ImageCollection(collection);

    // Cloud shadow Mask
    collection = ee.Algorithms.If(obj.shadowBQA,
        ee.Algorithms.If(obj.shadowTdom,
            // shadowBQA is true and shadowTdom is true
            tdom({
                'collection': collection.map(shadowBQAMask),
                'zScoreThresh': obj.zScoreThresh,
                'shadowSumThresh': obj.shadowSumThresh,
                'dilatePixels': obj.dilatePixels,
            }),
            // shadowBQA is true and shadowTdom is false
            collection.map(shadowBQAMask)),
        // shadowBQA is false and shadowTdom is true
        tdom({
            'collection': collection,
            'zScoreThresh': obj.zScoreThresh,
            'shadowSumThresh': obj.shadowSumThresh,
            'dilatePixels': obj.dilatePixels,
        }));

    collection = ee.ImageCollection(collection);

    var getShadowTdomMask = function (image) {

        image = cloudProject({
            'image': image,
            'shadowSumThresh': obj.shadowSumThresh,
            'dilatePixels': obj.dilatePixels,
            'cloudHeights': obj.cloudHeights,
            'cloudBand': obj.cloudBand,
        });

        return image;
    };

    collection = ee.Algorithms.If(
        obj.shadowTdom,
        collection.map(getShadowTdomMask),
        collection);

    return ee.ImageCollection(collection);

};