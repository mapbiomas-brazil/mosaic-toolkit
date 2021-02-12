/**
 * @name mapbiomas-mosaic-toolkit-raisg
 *
 * @author
 *  1. João Siqueira
 *  2. Marcos Rosa
 *  3. Mapbiomas Team
 *
 * @version
 *  1.0.0 | 2020-02-04 | First release.
 */
var bns = require('users/mapbiomas/mapbiomas-mosaics:modules/BandNames.js');
var csm = require('users/mapbiomas/mapbiomas-mosaics:modules/CloudAndShadowMasking.js');
var col = require('users/mapbiomas/mapbiomas-mosaics:modules/Collection.js');
var dtp = require('users/mapbiomas/mapbiomas-mosaics:modules/DataType.js');
var ind = require('users/mapbiomas/mapbiomas-mosaics:modules/SpectralIndexes.js');
var mis = require('users/mapbiomas/mapbiomas-mosaics:modules/Miscellaneous.js');
var mos = require('users/mapbiomas/mapbiomas-mosaics:modules/Mosaic.js');
var sma = require('users/mapbiomas/mapbiomas-mosaics:modules/SmaAndNdfi.js');

var App = {

    options: {

        dates: {
            t0: '1985-01-01',
            t1: '2018-12-31'
        },

        collection: null,

        regionMosaic: '702',
        gridName: 'SB-18-X-D',
        cloudCover: 100,
        shadowSum: 5000,

        assets: {
            'regionMosaic': 'projects/mapbiomas-raisg/COLECCION2/0_DATOS_AUXILIARES/VECTORES/ClassifRegiones_buffer240',
            'grids': 'projects/mapbiomas-raisg/COLECCION2/0_DATOS_AUXILIARES/VECTORES/CartasMapbiomas'
        },

        blackList: [],

        imageList: [],

        thumbnailList: [],

        thumbnail: {
            width: 200,
            borderStyle: '4px solid rgba(97, 97, 97, 0.05)',

            colors: {
                cyan: '#24C1E0',
                background: '#eb9834',
                gray: '#F8F9FA'
            },

            labelStyle: {
                fontWeight: '50',
                textAlign: 'center',
                fontSize: '11px',
                backgroundColor: '#11ffee00',
            },

        },

        collectionid: '',

        collectionIds: {
            'LANDSAT/LT04/C01/T1_SR': 'l4',
            'LANDSAT/LT05/C01/T1_SR': 'l5',
            'LANDSAT/LE07/C01/T1_SR': 'l7',
            'LANDSAT/LC08/C01/T1_SR': 'l8',
        },

        endmembers: {
            'l4': sma.endmembers['landsat-4'],
            'l5': sma.endmembers['landsat-5'],
            'l7': sma.endmembers['landsat-7'],
            'l8': sma.endmembers['landsat-8'],
            'lx': sma.endmembers['landsat-5'],
        },

        bqaValue: {
            'LANDSAT/LT04/C01/T1_SR': ['pixel_qa', Math.pow(2, 5)],
            'LANDSAT/LT05/C01/T1_SR': ['pixel_qa', Math.pow(2, 5)],
            'LANDSAT/LE07/C01/T1_SR': ['pixel_qa', Math.pow(2, 5)],
            'LANDSAT/LC08/C01/T1_SR': ['pixel_qa', Math.pow(2, 5)],
        },

        visParams: {
            'LANDSAT/LT04/C01/T1_SR': {
                bands: 'B5,B4,B3',
                gain: '0.08,0.06,0.2',
                gamma: 0.75
            },
            'LANDSAT/LT05/C01/T1_SR': {
                bands: 'B5,B4,B3',
                gain: '0.08,0.06,0.2',
                gamma: 0.75
            },
            'LANDSAT/LE07/C01/T1_SR': {
                bands: 'B5,B4,B3',
                gain: '0.08,0.06,0.2',
                gamma: 0.75
            },
            'LANDSAT/LC08/C01/T1_SR': {
                bands: 'B6,B5,B4',
                gain: '0.08,0.06,0.2',
                gamma: 0.75
            }
        },
    },

    init: function () {

        App.ui.init();
        App.loadFeatures();

    },

    loadFeatures: function () {

        App.options.regions = ee.FeatureCollection(App.options.assets.regionMosaic);
        App.options.grids = ee.FeatureCollection(App.options.assets.grids);

    },

    applyCloudAndSahdowMask: function (collection) {

        var collectionWithMasks = csm.getMasks({
            'collection': collection,
            'cloudBQA': true,    // cloud mask using pixel QA
            'cloudScore': true,  // cloud mas using simple cloud score
            'shadowBQA': true,   // cloud shadow mask using pixel QA
            'shadowTdom': true,  // cloud shadow using tdom
            'zScoreThresh': -1,
            'shadowSumThresh': App.options.shadowSum,
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
    },

    applySingleCloudMask: function (image) {

        return image.mask(
            image.select(App.options.bqaValue[App.options.collectionid][0])
                .bitwiseAnd(App.options.bqaValue[App.options.collectionid][1]).not());
    },

    getGeometries: function () {

        App.options.region = App.options.regions
            .filterMetadata('id_region', 'equals', parseInt(App.options.regionMosaic, 10))
            .geometry();

        App.options.grid = App.options.grids
            .filterMetadata('name', 'equals', App.options.gridName)
            .geometry();
    },

    setProperties: function (mosaic) {

        return mosaic
            .set('year', App.options.dates.t0.split('-')[0])
            .set('collection_id', App.options.collectionid)
            .set('landsat_scene', App.options.pathRow)
            .set('black_list', App.options.blackList.join(','))
            .set('image_list', App.options.imageList.join(','));
    },

    makeMosaic: function () {

        var spectralBands = ['blue', 'red', 'green', 'nir', 'swir1', 'swir2'];

        var objLandsat = {
            'collectionid': App.options.collectionid,
            'geometry': App.options.grid,
            'dateStart': App.options.dates.t0,
            'dateEnd': App.options.dates.t1,
            'cloudCover': App.options.cloudCover,
        };

        var bands = bns.get(App.options.collectionIds[App.options.collectionid]);

        var collection = col.getCollection(objLandsat)
            .select(bands.bandNames, bands.newNames)
            .filter(ee.Filter.inList('system:index', App.options.blackList).not());

        collection = App.applyCloudAndSahdowMask(collection)
            .select(spectralBands);

        // apply SMA
        collection = collection.map(
            function (image) {
                return sma.getFractions(image,
                    App.options.endmembers[App.options.collectionIds[App.options.collectionid]]);
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
            'dateStart': App.options.dates.t0,
            'dateEnd': App.options.dates.t1,
            'bandReference': 'ndvi',
            'percentileDry': 25,
            'percentileWet': 75,
        });

        // get other bands
        mosaic = mis.getSlope(mosaic);
        mosaic = mis.getEntropyG(mosaic);

        // set band data types
        App.options.mosaic = dtp.setBandTypes(mosaic);

        // set mosaic properties
        // App.options.mosaic = App.setProperties(App.options.mosaic);

        App.ui.form.map.addLayer(mosaic.clip(App.options.region).clip(App.options.grid), {
            'bands': 'swir1_median,nir_median,red_median',
            'gain': App.options.visParams[App.options.collectionid].gain,
            'gamma': App.options.visParams[App.options.collectionid].gamma
        }, 'Mosaic');

        App.ui.form.map.centerObject(App.options.grid, 9);

        print("blackList: ", App.options.blackList);

    },

    exportMosaic: function () {

        var name = App.options.pathRow + '-' + App.options.dates.t0.split('-')[0];

        Export.image.toAsset({
            "image": App.options.mosaic,
            "description": name,
            "assetId": name,
            "region": App.options.features
                .filterMetadata('WRSPR', 'equals', App.options.pathRow)
                .geometry(),
            "scale": 30,
            "maxPixels": 1e13
        });

    },

    ui: {

        init: function () {

            App.ui.form.init();

        },

        reset: function () {

            App.options.blackList = [];
            App.options.imageList = [];

            App.ui.form.map.clear();
        },

        getDates: function () {

            App.options.dates.t0 = new Date(App.ui.form.dateSlidert0.getValue()[0]).toISOString().slice(0, 10);
            App.options.dates.t1 = new Date(App.ui.form.dateSlidert1.getValue()[0]).toISOString().slice(0, 10);

        },

        findImages: function () {

            App.ui.reset();

            App.ui.getDates();

            App.getGeometries();

            App.options.collection = ee.ImageCollection(App.options.collectionid)
                .filterDate(App.options.dates.t0, App.options.dates.t1)
                .filterMetadata('CLOUD_COVER', 'less_than', App.options.cloudCover)
                .filterBounds(App.options.region)
                .filterBounds(App.options.grid)
                .map(App.applySingleCloudMask);;

            App.ui.loadImagesSelector();

            App.makeMosaic();

        },

        updateImageList: function (checked, checkbox) {

            var fun = function (imageName) {
                return imageName !== checkbox.imageName
            };

            if (checked) {
                App.options.blackList = App.options.blackList.filter(fun);
                App.options.imageList.push(checkbox.imageName);
            } else {
                App.options.imageList = App.options.imageList.filter(fun);
                App.options.blackList.push(checkbox.imageName);
            }

        },

        makeThumbnailGrid: function () {
            return ui.Panel({
                layout: ui.Panel.Layout.flow('horizontal', true),
                style: {
                    stretch: 'vertical',
                    // backgroundColor: App.options.thumbnail.colors.background,
                }
            });
        },

        makeThumbnail: function (obj) {

            var thumbnailContainer = ui.Panel({
                "layout": ui.Panel.Layout.flow('vertical'),
                "style": {
                    // backgroundColor: App.options.thumbnail.colors.background,
                    border: App.options.thumbnail.borderStyle,
                    padding: '4px',
                    margin: '5px',
                    width: App.options.thumbnail.width + 35 + 'px',
                },
            });

            var image = ee.Image(App.options.collection
                .filterMetadata('system:index', 'equals', obj.imageName).first());

            var thumbnail = ui.Thumbnail({
                "image": image.visualize(App.options.visParams[App.options.collectionid]),
                "params": {
                    "dimensions": App.options.thumbnail.width,
                    "format": 'png'
                },
                "style": {
                    "width": App.options.thumbnail.width + 'px',
                    "maxHeight": App.options.thumbnail.width + 25 + 'px',
                    "backgroundColor": App.options.thumbnail.colors.background,
                }
            });

            thumbnailContainer.add(thumbnail);

            // Add the checkbox to specify which thumbnails to include in the mosaic.
            var checkbox = ui.Checkbox({
                "label": obj.imageName,
                "value": true,
                "onChange": App.ui.updateImageList,
                "disabled": false,
                "style": App.options.thumbnail.labelStyle
            });

            checkbox.imageName = obj.imageName;

            thumbnailContainer.add(checkbox);

            return thumbnailContainer;
        },

        loadImagesSelector: function () {

            var thumbnailGrid = App.ui.makeThumbnailGrid();

            var imageList = ee.List(
                App.options.collection
                    .reduceColumns(ee.Reducer.toList(), ['system:index'])
                    .get('list'));

            App.options.thumbnailList = [];

            imageList.evaluate(
                function (imageList) {
                    App.options.imageList = imageList;
                    imageList.forEach(
                        function (imageName) {

                            var thumbnail = App.ui.makeThumbnail({
                                'imageName': imageName,
                            });

                            App.options.thumbnailList.push(thumbnail);

                            thumbnailGrid.add(thumbnail);
                        }
                    );
                }
            );

            App.ui.form.panelImagePicker.clear();

            App.ui.form.panelImagePicker.add(thumbnailGrid);
        },

        form: {

            init: function () {

                App.ui.form.panelFilterContainer.add(App.ui.form.labelTitleFilter);
                App.ui.form.panelFilterContainer.add(App.ui.form.panelDiv1);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelDates);
                App.ui.form.panelFilterContainer.add(App.ui.form.dateSlidert0);
                App.ui.form.panelFilterContainer.add(App.ui.form.dateSlidert1);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelCollection);
                App.ui.form.panelFilterContainer.add(App.ui.form.selectCollection);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelCloudCover);
                App.ui.form.panelFilterContainer.add(App.ui.form.textCloudCover);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelShadow);
                App.ui.form.panelFilterContainer.add(App.ui.form.textShadow);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelRegionMosaic);
                App.ui.form.panelFilterContainer.add(App.ui.form.textRegionMosaic);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelGrids);
                App.ui.form.panelFilterContainer.add(App.ui.form.textGrids);
                App.ui.form.panelFilterContainer.add(App.ui.form.buttonFind);

                App.ui.form.panelImagePickerContainer.add(App.ui.form.labelTitle);
                App.ui.form.panelImagePickerContainer.add(App.ui.form.panelDiv2);
                App.ui.form.panelImagePickerContainer.add(App.ui.form.panelImagePicker);

                App.ui.form.panelMapContainer.add(App.ui.form.panelControl);
                App.ui.form.panelMapContainer.add(App.ui.form.map);

                App.ui.form.panelControl.add(App.ui.form.buttonMakeMosaic);

                App.ui.form.panelMain.add(App.ui.form.panelFilterContainer);
                App.ui.form.panelMain.add(App.ui.form.panelDiv3);
                App.ui.form.panelMain.add(App.ui.form.panelImagePickerContainer);
                App.ui.form.panelMain.add(App.ui.form.panelMapContainer);

                ui.root.widgets().reset([App.ui.form.panelMain]);
            },

            panelMain: ui.Panel({
                'layout': ui.Panel.Layout.flow('horizontal'),
                'style': {
                    'stretch': 'both'
                }
            }),

            panelImagePickerContainer: ui.Panel({
                'layout': ui.Panel.Layout.flow('vertical'),
                'style': {
                    'stretch': 'both'
                }
            }),

            panelMapContainer: ui.Panel({
                'layout': ui.Panel.Layout.flow('vertical'),
                'style': {
                    'stretch': 'both'
                }
            }),

            panelFilterContainer: ui.Panel({
                'layout': ui.Panel.Layout.flow('vertical'),
                'style': {
                    'stretch': 'vertical',
                    // 'border': '1px solid #cccccc',
                }
            }),

            panelImagePicker: ui.Panel({
                'layout': ui.Panel.Layout.flow('vertical'),
                'style': {
                    'stretch': 'both',
                    // 'border': '1px solid #cccccc',
                    // 'height': '800px'
                }
            }),

            panelControl: ui.Panel({
                'layout': ui.Panel.Layout.flow('vertical'),
                'style': {
                    'stretch': 'horizontal',
                    // 'border': '1px solid #cccccc',
                }
            }),

            panelDiv1: ui.Panel({
                'layout': ui.Panel.Layout.flow('horizontal'),
                'style': {
                    'stretch': 'horizontal',
                    'border': '2px solid #f2f2f2',
                }
            }),

            panelDiv2: ui.Panel({
                'layout': ui.Panel.Layout.flow('horizontal'),
                'style': {
                    'stretch': 'horizontal',
                    'border': '2px solid #f2f2f2',
                }
            }),

            panelDiv3: ui.Panel({
                'layout': ui.Panel.Layout.flow('vertical'),
                'style': {
                    'stretch': 'vertical',
                    'border': '2px solid #f2f2f2',
                }
            }),

            selectCollection: ui.Select({
                'items': [
                    'LANDSAT/LT04/C01/T1_SR',
                    'LANDSAT/LT05/C01/T1_SR',
                    'LANDSAT/LE07/C01/T1_SR',
                    'LANDSAT/LC08/C01/T1_SR',
                ],
                'placeholder': 'Collection',
                'onChange': function (collectionid) {
                    App.options.collectionid = collectionid;
                },
                'style': {
                    'stretch': 'horizontal',
                    // 'width': '120px'
                }
            }),

            dateSlidert0: ui.DateSlider({
                'start': '1985-01-01',
                'value': '2018-01-01',
                'style': {
                    // 'width': '140px',
                },
            }),

            dateSlidert1: ui.DateSlider({
                'start': '1985-01-01',
                'value': '2018-12-31',
                'style': {
                },
            }),

            buttonFind: ui.Button({
                'label': 'Find images',
                'onClick': function () {
                    App.ui.findImages();
                },
                'style': {
                    'stretch': 'horizontal',
                    // 'width': '120px'
                }
            }),

            buttonMakeMosaic: ui.Button({
                'label': 'Mosaic',
                'onClick': function () {
                    App.makeMosaic();
                },
                'style': {
                    'stretch': 'vertical',
                    'width': '150px'
                }
            }),

            labelTitleFilter: ui.Label({
                "value": "Filter",
                "style": {
                    "fontSize": "24px",
                    "fontWeight": "bold",
                    // 'border': '1px solid #cccccc',
                    'stretch': 'horizontal',
                    // 'padding': '4px'
                }
            }),

            labelTitle: ui.Label({
                "value": "Image Galery",
                "style": {
                    "fontSize": "24px",
                    "fontWeight": "bold",
                    // 'border': '1px solid #cccccc',
                    'stretch': 'horizontal',
                    // 'padding': '4px'
                }
            }),

            labelDates: ui.Label({
                "value": "Date range:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            labelCollection: ui.Label({
                "value": "Collection id:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            labelRegionMosaic: ui.Label({
                "value": "Region id:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            textRegionMosaic: ui.Textbox({
                'placeholder': '702',
                'onChange': function (text) {
                    App.options.regionMosaic = text;
                },
            }),

            labelGrids: ui.Label({
                "value": "Grid name:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            textGrids: ui.Textbox({
                'placeholder': 'SB-18-X-D',
                'onChange': function (text) {
                    App.options.gridName = text;
                },
            }),

            labelShadow: ui.Label({
                "value": "Shadow sum:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            textShadow: ui.Textbox({
                'placeholder': '5000',
                'onChange': function (text) {
                    App.options.shadowSum = parseInt(text, 10);
                },
            }),

            labelCloudCover: ui.Label({
                "value": "Cloud cover:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            textCloudCover: ui.Textbox({
                'placeholder': '100',
                'onChange': function (text) {
                    App.options.cloudCover = parseInt(text, 10);
                },
            }),

            map: ui.Map({
                'style': {
                    'stretch': 'both'
                }
            }),
        }
    }
};

App.init();