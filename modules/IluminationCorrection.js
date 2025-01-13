//Cosine correction: The amount of irradiance reaching an inclined pixel is
//proportional to the cosine of the incidence angle i, where i is defined as the angle between the
//normal on the pixel in question and the zenith direction (Teillet et al., 1982). Only the part
//cos(i) * Ei of the total incoming irradiance Ei reaches the inclined pixel.
//Ei is dependent from the solar constant and the distance between sun and earth. The
//cosine law, however, only takes the sun's position into account in the form of the sun zenith
//angle, assuming the solar constant and the distance between sun and earth being constant for
//all scenes.

//Taken from: http://mortcanty.github.io/src/CRCDockerExamples1.html

//The quantity to be determined is the local solar incidence angle (i) , which determines
//the local irradiance. From trigonometry we can calculate the relation:

//cosi=cosp*cosz+sinp*sinz*cos(ϕa−ϕo).

//i= local solar incidence angle
//p= slope
//z= solar zenith angle
//az= solar azimuth
//o= aspect

exports.iluminationCorrection = function (image) {
    
    var degree2radian = 0.01745;
    
    //Load USGS/SRTMGL1_003 DEM
    var terrain = ee.call('Terrain', ee.Image('USGS/SRTMGL1_003'));
    
    //Extract slope in radians for each pixel in the image  
    var p = terrain.select(['slope']).multiply(degree2radian);
    
    //Extract solar zenith angle from the image
    var z = ee.Number(90).subtract(ee.Number(image.get('sun_elevation_angle'))).multiply(degree2radian);
    
    //Extract solar azimuth from the image
    var az = ee.Image(ee.Number(image.get('sun_azimuth_angle')).multiply(degree2radian));
    
    //Extract aspect in radians for each pixel in the image
    var o = terrain.select(['aspect']).multiply(degree2radian);
    var cosao = (az.subtract(o)).cos(); //cos(ϕa−ϕo)
    
    //Calculate the cosine of the local solar incidence for every pixel in the image in radians (cosi=cosp*cosz+sinp*sinz*cos(ϕa−ϕo)
    var cosi = image.expression(
        '((cosp*cosz) + ((sinp*sinz)*(cosao)))', {
            'cosp': p.cos(),
            'cosz': z.cos(),
            'sinp': p.sin(),
            'sinz': z.sin(),
            'az': az,
            'o': o,
            'cosao': cosao
        });

    // Create the image to apply the linear regression.The first band
    //is the cosi and the second band is the response variable, the reflectance (the bands).
    //L (y) = a + b*cosi(x); a = intercept, b = slope
    // Dependent: Reflectance
    var y = image.select(['swir1', 'nir', 'red']);
    
    // Independent: (cosi)
    var x = cosi;
    
    // Intercept: a
    var a = ee.Image(1).rename('a');
    
    // create an image collection with the three variables by concatenating them
    var reg_img = ee.Image.cat(a, x, y);
    
    // specify the linear regression reducer
    var lr_reducer = ee.Reducer.linearRegression({
        numX: 2,
        numY: 3
    });
    
    // fit the model
    var fit = reg_img.reduceRegion({
        reducer: lr_reducer,
        geometry: image.geometry(),//region,
        scale: 30,
        maxPixels: 1e9
    });

    fit = fit.combine({
        "coefficients": ee.Array([
            [1],
            [1]
        ])
    }, false);

    // Get the coefficients as a nested list, cast it to an array, and get
    // just the selected column
    var slo = (ee.Array(fit.get('coefficients')).get([0, 0]));
    var int = (ee.Array(fit.get('coefficients')).get([1, 0]));
    
    //Calculate C parameter C= a/b

    var C = int.divide(slo);

    //Apply the SCS + C correction in: Soenen, S. A., Peddle, D. R., & Coburn, C. A. (2005).
    //SCS+ C: A modified sun-canopy-sensor topographic correction in forested terrain. 
    //IEEE Transactions on geoscience and remote sensing, 43(9), 2148-2159. 

    var newimg = image.expression(
        '((img * ((cosp*cosz) + C))/(cosi + C))', {
            'img': image,
            'cosp': p.cos(),
            'cosz': z.cos(),
            'cosi': cosi,
            'C': C
        });

    return ee.Image(newimg.copyProperties(image));//.set('system:time_start', img.get('system:time_start'));

};