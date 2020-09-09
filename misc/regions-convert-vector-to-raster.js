/**
 * @name regions-convert-vector-to-raster.js
 */

// convert vector to raster

var regions = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil');

var geometry = ee.Geometry.Polygon(
    [
        [
            [-74.65080776631021, 7.688333890160532],
            [-74.65080776631021, -34.107994339250475],
            [-24.81682339131021, -34.107994339250475],
            [-24.81682339131021, 7.688333890160532]
        ]
    ]);
// Map.addLayer(regions)
var regionsNumber = regions.reduceColumns(ee.Reducer.toList(), ['Bioma']).get('list');

regionsNumber.evaluate(

    function (regionsNumber) {

        regionsNumber.forEach(
            function (regionid) {
                var region = regions.filterMetadata('Bioma', 'equals', regionid);

                var regionRaster = ee.Image().byte().paint({
                    featureCollection: region,
                    color: 1
                }).rename(['regions']);

                Map.addLayer(regionRaster.randomVisualizer(), {}, regionid, false);

                regionid = regionid.toUpperCase().replace(' ', '').replace('Â', 'A').replace('Ô', 'O')
                
                Export.image.toAsset({
                    "image": regionRaster.set('region', regionid),
                    "description": regionid,
                    "assetId": 'projects/mapbiomas-workspace/AUXILIAR/RASTER/regions/' + regionid,
                    "scale": 30,
                    "pyramidingPolicy": {
                        '.default': 'mode'
                    },
                    "maxPixels": 1e13,
                    "region": geometry
                });
            }
        );
    }
);
