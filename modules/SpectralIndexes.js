/**
 *
 * @param {*} image
 */
exports.getNDVI = function (image) {

	var exp = '( b("nir") - b("red") ) / ( b("nir") + b("red") )';

	var ndvi = image.expression(exp).rename("ndvi")
		.add(1)
		.multiply(1000)
		.int16();

	return image.addBands(ndvi);
};

/**
 * 
 * @param {*} image 
 */
exports.getNDWI = function (image) {

	var exp = 'float(b("nir") - b("swir1"))/(b("nir") + b("swir1"))';

	var ndwi = image.expression(exp).rename("ndwi")
		.add(1)
		.multiply(1000)
		.int16();

	return image.addBands(ndwi);
};

/**
 *
 * @param {*} image
 */
exports.getSAVI = function (image) {

	var exp = '1.5 * (b("nir") - b("red")) / (0.5 + b("nir") + b("red"))';

	var savi = image.expression(exp).rename("savi")
		.add(1)
		.multiply(1000)
		.int16();

	return image.addBands(savi);
};

/**
 *
 * @param {*} image
 */
exports.getPRI = function (image) {

	var exp = 'float(b("blue") - b("green"))/(b("blue") + b("green"))';

	var pri = image.expression(exp).rename("pri")
		.add(1)
		.multiply(1000)
		.byte();

	return image.addBands(pri);
};

/**
 *
 * @param {*} image
 */
exports.getCAI = function (image) {

	var exp = 'float( b("swir2") / b("swir1") )';

	var cai = image.expression(exp).rename("cai")
		.add(1)
		.multiply(1000)
		.int16();

	return image.addBands(cai);
};

/**
 *
 * @param {*} image
 */
exports.getEVI = function (image) {

	var exp = '2.5 * ((b("nir") - b("red")) / (b("nir") + 6 * b("red") - 7.5 * b("blue") + 1))';

	var evi = image.expression(exp).rename("evi")
		.add(1)
		.multiply(100)
		.int16();

	return image.addBands(evi);

};

/**
 *
 * @param {*} image
 */
exports.getEVI2 = function (image) {

	var exp = '2.5 * (b("nir") - b("red")) / (b("nir") + (2.4 * b("red")) + 1)';

	var evi2 = image.expression(exp).rename("evi2")
		.add(1)
		.multiply(1000)
		.int16();

	return image.addBands(evi2);
};

/**
 *
 * @param {*} image
 */
exports.getHallCover = function (image) {

	var exp = '( (-b("red") * 0.017) - (b("nir") * 0.007) - (b("swir2") * 0.079) + 5.22 )';

	var hallcover = image.expression(exp).rename("hallcover")
		.add(1000);

	return image.addBands(hallcover);
};

/**
 *
 * @param {*} image
 */
exports.getHallHeigth = function (image) {

	var exp = '( (-b("red") * 0.039) - (b("nir") * 0.011) - (b("swir1") * 0.026) + 4.13 )';

	var hallheigth = image.expression(exp).rename("hallheigth")
		.add(1000);

	return image.addBands(hallheigth);
};

/**
 *
 * @param {*} image
 */
exports.getGCVI = function (image) {

	var exp = 'b("nir") / b("green") - 1';

	var gcvi = image.expression(exp).rename("gcvi")
		.add(1)
		.multiply(1000)
		.int16();

	return image.addBands(gcvi);
};
