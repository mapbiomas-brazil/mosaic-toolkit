/**
 * @name mapbiomas-mosaic-toolkit
 * 
 * @author
 *  1. João Siqueira
 *  2. Marcos Rosa
 *  3. Mapbiomas Team
 * 
 * @version
 *  1.0.0 | 2020-02-04 | First release
 *  1.1.0 | 2020-05-08 | Update thumbnails and improve mosaic logic.
 *  1.1.1 | 2021-02-01 | Fix minor bugs.
 */
var bns = require('users/mapbiomas/mapbiomas-mosaics:modules/BandNames.js');
var csm = require('users/mapbiomas/mapbiomas-mosaics:modules/CloudAndShadowMasking.js');
var col = require('users/mapbiomas/mapbiomas-mosaics:modules/Collection.js');
var dtp = require('users/mapbiomas/mapbiomas-mosaics:modules/DataType.js');
var ind = require('users/mapbiomas/mapbiomas-mosaics:modules/SpectralIndexes.js');
var mis = require('users/mapbiomas/mapbiomas-mosaics:modules/Miscellaneous.js');
var mos = require('users/mapbiomas/mapbiomas-mosaics:modules/Mosaic.js');
var sma = require('users/mapbiomas/mapbiomas-mosaics:modules/SmaAndNdfi.js');

var projectInfo = [
    {
        label: 'Atlantic Forest Trinacional',
        value: {
            projectName: 'mapbiomas-af-trinacional',
            outputAsset: 'projects/mapbiomas_af_trinacional/MOSAICS/workspace-c1',
            regionsAsset: 'projects/mapbiomas_af_trinacional/ANCILLARY_DATA/RASTER/regions',
            regionsList: [
                'AFTN',
            ]
        }
    },
    {
        label: 'Brazil',
        value: {
            projectName: 'mapbiomas-brazil',
            outputAsset: 'projects/mapbiomas-workspace/MOSAICOS/workspace-c5',
            regionsAsset: 'projects/mapbiomas-workspace/AUXILIAR/RASTER/regions',
            regionsList: [
                'AMAZONIA',
                'CAATINGA',
                'CERRADO',
                'MATAATLANTICA',
                'PAMPA',
                'PANTANAL'
            ]
        }
    },
    {
        label: 'Indonesia',
        value: {
            projectName: 'mapbiomas-indonesia',
            outputAsset: 'projects/mapbiomas-indonesia/MOSAICS/workspace-c1',
            regionsAsset: 'projects/mapbiomas-indonesia/ANCILLARY_DATA/RASTER/regions',
            regionsList: [
                'REGION-100',
                'REGION-200',
                'REGION-300',
                'REGION-400',
                'REGION-500'
            ]
        }
    },
    {
        label: 'Pampa Trinacional',
        value: {
            projectName: 'mapbiomas-pampa-trinacional',
            outputAsset: 'projects/MapBiomas_Pampa/MOSAICS/workspace-c1',
            regionsAsset: 'projects/mapbiomas-workspace/AUXILIAR/RASTER/regions',
            regionsList: [
                'PAMPA-ARGENTINA',
                'PAMPA-BRASIL',
                'PAMPA-URUGUAI',
            ]
        }
    },
];

var App = {

    options: {

        dates: {
            amp: {
                t0: '2010-01-01',
                t1: '2010-12-31'
            },
            med: {
                t0: '2010-05-01',
                t1: '2010-10-30'
            },

        },

        collection: null,

        mosaic: null,

        pathRow: '224078',

        region: null,

        regionId: null,

        buffer: 500,

        assets: {
            'pathRow': 'projects/mapbiomas-workspace/AUXILIAR/landsat-scenes'
        },

        projectInfo: null,

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
                backgroundColor: '#f2f2f2',
                stretch: 'horizontal',
            },

        },

        collectionid: '',

        collectionIds: {
            'Landsat-4 SR': [
                'LANDSAT/LT04/C01/T1_SR'
            ],
            'Landsat-5 SR': [
                'LANDSAT/LT05/C01/T1_SR'
            ],
            'Landsat-7 SR': [
                'LANDSAT/LE07/C01/T1_SR'
            ],
            'Landsat-8 SR': [
                'LANDSAT/LC08/C01/T1_SR'
            ],
            'Landsat-5 SR [+L7]': [
                'LANDSAT/LT05/C01/T1_SR',
                'LANDSAT/LE07/C01/T1_SR'
            ],
            'Landsat-7 SR [+L5]': [
                'LANDSAT/LE07/C01/T1_SR',
                'LANDSAT/LT05/C01/T1_SR'
            ],

        },

        endmembers: {
            'Landsat-4 SR': sma.endmembers['landsat-4'],
            'Landsat-5 SR': sma.endmembers['landsat-5'],
            'Landsat-7 SR': sma.endmembers['landsat-7'],
            'Landsat-8 SR': sma.endmembers['landsat-8'],
            'Landsat-5 SR [+L7]': sma.endmembers['landsat-5'],
            'Landsat-7 SR [+L5]': sma.endmembers['landsat-7'],
        },

        bqaValue: {
            'Landsat-4 SR': ['pixel_qa', Math.pow(2, 5)],
            'Landsat-5 SR': ['pixel_qa', Math.pow(2, 5)],
            'Landsat-7 SR': ['pixel_qa', Math.pow(2, 5)],
            'Landsat-8 SR': ['pixel_qa', Math.pow(2, 5)],
            'Landsat-5 SR [+L7]': ['pixel_qa', Math.pow(2, 5)],
            'Landsat-7 SR [+L5]': ['pixel_qa', Math.pow(2, 5)],
        },

        bandIds: {
            'LANDSAT/LT04/C01/T1_SR': 'l4',
            'LANDSAT/LT05/C01/T1_SR': 'l5',
            'LANDSAT/LE07/C01/T1_SR': 'l7',
            'LANDSAT/LC08/C01/T1_SR': 'l8',
        },

        lastMonthDay: {
            '01': '31',
            '02': '28',
            '03': '31',
            '04': '30',
            '05': '31',
            '06': '30',
            '07': '31',
            '08': '31',
            '09': '30',
            '10': '31',
            '11': '30',
            '12': '31'
        },

        visParams: {
            bands: 'swir1,nir,red',
            gain: '0.08,0.06,0.2',
            gamma: 0.75
        },

    },

    init: function () {

        App.ui.init();
        App.loadFeatures();

    },

    loadFeatures: function () {

        App.options.features = ee.FeatureCollection(App.options.assets.pathRow);

    },

    applyCloudAndSahdowMask: function (collection) {

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
    },

    applyRegionMask: function (image) {

        return image.mask(App.options.region.gte(0)).selfMask();
    },

    getGeometries: function () {

        App.options.geometry = App.options.features
            .filterMetadata('WRSPR', 'equals', App.options.pathRow)
            .geometry()
            .centroid();

    },

    setProperties: function (mosaic) {

        return mosaic
            .set('year', App.options.year)
            .set('region', App.options.regionId)
            .set('collection_id', App.options.collectionid)
            .set('landsat_scene', App.options.pathRow)
            .set('black_list', App.options.blackList.join(','))
            .set('image_list', App.options.imageList.join(','));
    },

    processCollection: function (collectionid) {

        var spectralBands = ['blue', 'red', 'green', 'nir', 'swir1', 'swir2'];

        var objLandsat = {
            'collectionid': collectionid,
            'geometry': App.options.geometry,
            'dateStart': App.options.dates.amp.t0,
            'dateEnd': App.options.dates.amp.t1,
            'cloudCover': 100,
        };

        var bands = bns.get(App.options.bandIds[collectionid]);

        var collection = col.getCollection(objLandsat)
            .select(bands.bandNames, bands.newNames)
            .filter(ee.Filter.inList('system:index', App.options.blackList).not());

        collection = App.applyCloudAndSahdowMask(collection)
            .select(spectralBands);

        collection = collection.map(App.applyRegionMask);

        // apply SMA
        collection = collection.map(
            function (image) {
                return sma.getFractions(image,
                    App.options.endmembers[App.options.collectionid]);
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

        return collection;
    },

    makeMosaic: function () {

        App.options.collection = App.processCollection(
            App.options.collectionIds[App.options.collectionid][0]);

        var mosaic = mos.getMosaic({
            'collection': App.options.collection,
            'dateStart': App.options.dates.med.t0,
            'dateEnd': App.options.dates.med.t1,
            'bandReference': 'ndvi',
            'percentileDry': 25,
            'percentileWet': 75,
        });

        print(mosaic);

        // Unmask data with the secondary mosaic (+L5 or +L7)
        if (App.options.collectionIds[App.options.collectionid].length == 2) {
            var collection = App.processCollection(
                App.options.collectionIds[App.options.collectionid][1]);

            var secondaryMosaic = mos.getMosaic({
                'collection': collection,
                'dateStart': App.options.dates.med.t0,
                'dateEnd': App.options.dates.med.t1,
                'bandReference': 'ndvi',
                'percentileDry': 25,
                'percentileWet': 75,
            });

            mosaic = mosaic.unmask(secondaryMosaic);

            App.options.collection = App.options.collection.merge(collection);
        }

        // get other bands
        mosaic = mis.getSlope(mosaic);
        mosaic = mis.getEntropyG(mosaic);

        // set band data types
        App.options.mosaic = dtp.setBandTypes(mosaic, App.options.projectInfo.projectName);

        // set mosaic properties
        App.options.mosaic = App.setProperties(App.options.mosaic)
            .clip(App.options.features
                .filterMetadata('WRSPR', 'equals', App.options.pathRow)
                .geometry()
                .buffer(App.options.buffer)
            );

    },

    exportMosaic: function () {

        var name = [
            App.options.pathRow,
            App.options.dates.med.t0.split('-')[0],
            App.options.regionId
        ].join('-');

        Export.image.toAsset({
            "image": App.options.mosaic,
            "description": name,
            "assetId": App.options.projectInfo.outputAsset + '/' + name,
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

        updateRegionList: function () {

            App.ui.form.panelFilterContainer.remove(App.ui.form.selectRegion);

            App.options.region = null;

            App.ui.form.selectRegion = ui.Select({
                'items': ['None'].concat(App.options.projectInfo.regionsList),
                'onChange': function (region) {
                    App.options.regionId = region;
                    App.options.region = ee.Image(
                        App.options.projectInfo.regionsAsset + '/' + App.options.regionId);

                },
                'placeholder': 'Select a region',
                'style': {
                    'stretch': 'horizontal',
                }
            });

            App.ui.form.panelFilterContainer.insert(5, App.ui.form.selectRegion);
        },

        getDates: function () {

            App.options.dates.amp.t0 = App.options.year + '-01-01';
            App.options.dates.amp.t1 = App.options.year + '-12-31';

            App.options.dates.med.t0 = App.options.year + '-' + App.options.montht0 + '-' + App.options.lastMonthDay[App.options.montht0];
            App.options.dates.med.t1 = App.options.year + '-' + App.options.montht1 + '-' + App.options.lastMonthDay[App.options.montht1];

        },

        addMosaicToMap: function () {

            App.ui.form.map.addLayer(App.options.mosaic, {
                'bands': 'swir1_median,nir_median,red_median',
                'gain': App.options.visParams.gain,
                'gamma': App.options.visParams.gamma
            }, 'Mosaic');

            App.ui.form.map.centerObject(App.options.geometry, 9);

            print("blackList: ", App.options.blackList);
        },

        findImages: function () {

            App.ui.reset();

            App.ui.getDates();

            App.getGeometries();

            // App.getCollectionCloudMask();

            App.makeMosaic();

            App.ui.loadImagesSelector();

            App.ui.addMosaicToMap();

        },

        selectAll: function () {

            App.options.thumbnailList.forEach(
                function (thumbnailContainer) {
                    thumbnailContainer.checkbox.setValue(true, App.ui.updateImageList);
                }
            );

            print("blackList:", App.options.blackList);

        },

        unselectAll: function () {

            App.options.thumbnailList.forEach(
                function (thumbnailContainer) {
                    thumbnailContainer.checkbox.setValue(false, App.ui.updateImageList);
                }
            );

            print("blackList:", App.options.blackList);
        },

        updateImageList: function (checked, checkbox) {

            var fun = function (imageName) {
                return imageName !== checkbox.imageName;
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
                .filterMetadata('image_id', 'equals', obj.imageName).first());

            var thumbnail = ui.Thumbnail({
                "image": image.visualize(App.options.visParams),
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

            thumbnailContainer.checkbox = checkbox;

            return thumbnailContainer;
        },

        loadImagesSelector: function () {

            var thumbnailGrid = App.ui.makeThumbnailGrid();

            App.options.imageList = ee.List(
                App.options.collection
                    .reduceColumns(ee.Reducer.toList(), ['image_id'])
                    .get('list'));

            App.options.thumbnailList = [];

            App.ui.loadingMsg.show();

            App.options.imageList.evaluate(
                function (imageList) {

                    imageList.forEach(
                        function (imageName) {

                            var thumbnail = App.ui.makeThumbnail({
                                'imageName': imageName,
                            });

                            App.options.thumbnailList.push(thumbnail);

                            thumbnailGrid.add(thumbnail);
                        }
                    );

                    App.options.imageList = imageList;

                    App.ui.loadingMsg.destroy();
                }
            );

            App.ui.form.panelImagePicker.clear();

            App.ui.form.panelImagePicker.add(thumbnailGrid);
        },

        loadingMsg: {

            show: function () {
                App.ui.form.panelImagePickerContainer.add(App.ui.form.msgBox);
            },

            destroy: function () {
                App.ui.form.panelImagePickerContainer.remove(App.ui.form.msgBox);
            }

        },


        form: {

            init: function () {

                App.ui.form.panelFilterContainer.add(App.ui.form.labelTitleFilter);
                App.ui.form.panelFilterContainer.add(App.ui.form.panelDiv1);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelProject);
                App.ui.form.panelFilterContainer.add(App.ui.form.selectProject);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelRegion);
                App.ui.form.panelFilterContainer.add(App.ui.form.selectRegion);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelCollection);
                App.ui.form.panelFilterContainer.add(App.ui.form.selectCollection);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelDates);
                App.ui.form.panelFilterContainer.add(App.ui.form.selectYear);
                App.ui.form.panelFilterContainer.add(App.ui.form.selectMontht0);
                App.ui.form.panelFilterContainer.add(App.ui.form.selectMontht1);
                App.ui.form.panelFilterContainer.add(App.ui.form.labelPathRow);
                App.ui.form.panelFilterContainer.add(App.ui.form.textPathRow);
                App.ui.form.panelFilterContainer.add(App.ui.form.buttonFind);

                App.ui.form.panelImagePickerContainer.add(App.ui.form.labelTitle);
                App.ui.form.panelImagePickerContainer.add(App.ui.form.panelDiv2);
                App.ui.form.panelImagePickerContainer.add(App.ui.form.panelImagePicker);

                App.ui.form.panelMapContainer.add(App.ui.form.panelControl);
                App.ui.form.panelMapContainer.add(App.ui.form.map);

                App.ui.form.panelControl.add(App.ui.form.buttonSelectAll);
                App.ui.form.panelControl.add(App.ui.form.buttonUnselectAll);
                App.ui.form.panelControl.add(App.ui.form.buttonMakeMosaic);
                App.ui.form.panelControl.add(App.ui.form.buttonExportMosaic);

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
                }
            }),

            panelImagePicker: ui.Panel({
                'layout': ui.Panel.Layout.flow('vertical'),
                'style': {
                    'stretch': 'both',
                }
            }),

            panelControl: ui.Panel({
                'layout': ui.Panel.Layout.flow('horizontal'),
                'style': {
                    'stretch': 'horizontal',
                }
            }),

            panelDiv1: ui.Panel({
                'layout': ui.Panel.Layout.flow('horizontal'),
                'style': {
                    'stretch': 'horizontal',
                    'border': '1px solid rgba(97, 97, 97, 0.05)',
                }
            }),

            panelDiv2: ui.Panel({
                'layout': ui.Panel.Layout.flow('horizontal'),
                'style': {
                    'stretch': 'horizontal',
                    'border': '1px solid rgba(97, 97, 97, 0.05)',
                }
            }),

            panelDiv3: ui.Panel({
                'layout': ui.Panel.Layout.flow('vertical'),
                'style': {
                    'stretch': 'vertical',
                    'border': '1px solid rgba(97, 97, 97, 0.05)',
                }
            }),

            selectCollection: ui.Select({
                'items': [
                    'Landsat-4 SR',
                    'Landsat-5 SR',
                    'Landsat-7 SR',
                    'Landsat-8 SR',
                    'Landsat-5 SR [+L7]',
                    'Landsat-7 SR [+L5]',
                ],
                'placeholder': 'Collection',
                'onChange': function (collectionid) {
                    App.options.collectionid = collectionid;
                },
                'style': {
                    'stretch': 'horizontal',
                }
            }),

            selectYear: ui.Select({
                'items': [
                    '1985', '1986', '1987', '1988',
                    '1989', '1990', '1991', '1992',
                    '1993', '1994', '1995', '1996',
                    '1997', '1998', '1999', '2000',
                    '2001', '2002', '2003', '2004',
                    '2005', '2006', '2007', '2008',
                    '2009', '2010', '2011', '2012',
                    '2013', '2014', '2015', '2016',
                    '2017', '2018', '2019', '2020',
                    '2021'
                ],
                'placeholder': 'Year',
                'onChange': function (year) {
                    App.options.year = year;
                },
                'style': {
                    'stretch': 'horizontal',
                }
            }),

            selectMontht0: ui.Select({
                'items': [
                    '01', '02', '03', '04',
                    '05', '06', '07', '08',
                    '09', '10', '11', '12',
                ],
                'placeholder': 'Month t0',
                'onChange': function (month) {
                    App.options.montht0 = month;
                },
                'style': {
                    'stretch': 'horizontal',
                }
            }),

            selectMontht1: ui.Select({
                'items': [
                    '01', '02', '03', '04',
                    '05', '06', '07', '08',
                    '09', '10', '11', '12',
                ],
                'placeholder': 'Month t1',
                'onChange': function (month) {
                    App.options.montht1 = month;
                },
                'style': {
                    'stretch': 'horizontal',
                }
            }),

            buttonFind: ui.Button({
                'label': 'Find images',
                'onClick': function () {
                    App.ui.findImages();
                },
                'style': {
                    'stretch': 'horizontal',
                }
            }),

            buttonSelectAll: ui.Button({
                'label': 'Select all',
                'onClick': function () {
                    App.ui.selectAll();
                },
                'style': {
                    'stretch': 'vertical',
                    'width': '150px'
                }
            }),

            buttonUnselectAll: ui.Button({
                'label': 'Unselect all',
                'onClick': function () {
                    App.ui.unselectAll();
                },
                'style': {
                    'stretch': 'vertical',
                    'width': '150px'
                }
            }),

            buttonMakeMosaic: ui.Button({
                'label': 'Mosaic',
                'onClick': function () {
                    App.makeMosaic();
                    App.ui.addMosaicToMap();
                },
                'style': {
                    'stretch': 'vertical',
                    'width': '150px'
                }
            }),

            buttonExportMosaic: ui.Button({
                'label': 'Export',
                'onClick': function () {
                    App.makeMosaic();
                    App.exportMosaic();
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

            labelProject: ui.Label({
                "value": "Project:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            labelRegion: ui.Label({
                "value": "Region:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            labelDates: ui.Label({
                "value": "Date range:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            labelDatesMedian: ui.Label({
                "value": "Median date range:",
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

            labelPathRow: ui.Label({
                "value": "Path/Row id:",
                "style": {
                    'stretch': 'horizontal',
                }
            }),

            textPathRow: ui.Textbox({
                'placeholder': '112063 (6 numbers)',
                'onChange': function (text) {
                    App.options.pathRow = text;
                },
            }),

            selectProject: ui.Select({
                'items': projectInfo,
                'onChange': function (item) {
                    App.options.projectInfo = item;
                    App.ui.updateRegionList();
                },
                'placeholder': 'Select a project',
                'style': {
                    'stretch': 'horizontal',
                }
            }),

            selectRegion: ui.Select({
                'items': ['None'],
                'onChange': function (region) {
                },
                'placeholder': 'Select a region',
                'style': {
                    'stretch': 'horizontal',
                    // 'width': '150px'
                }
            }),

            map: ui.Map({
                'style': {
                    'stretch': 'both'
                }
            }),

            msgBox: ui.Panel(
                {
                    'widgets': [
                        ui.Label('Loading...')
                    ],
                    'layout': ui.Panel.Layout.flow('horizontal'),
                    'style': {
                        'position': 'top-left'
                    }
                }
            )
        }
    }
};

App.init();