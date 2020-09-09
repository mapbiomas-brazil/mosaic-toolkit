/**
 *
 */
exports.getSlope = function (image) {

    var terrain = ee.Image("JAXA/ALOS/AW3D30_V1_1").select("AVE");

    var slope = ee.Terrain.slope(terrain)
        .multiply(100)
        .int16()
        .rename('slope');

    return image.addBands(slope);
};

/**
 * 
 */
exports.getEntropyG = function (image) {

    var square = ee.Kernel.square({ radius: 5 });

    var entropyG = image.select('green_median')
        .int32()
        // .divide(10000)
        .entropy(square)
        .multiply(100)
        .rename("green_median_texture");

    return image.addBands(entropyG);
};