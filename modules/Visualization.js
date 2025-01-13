/**
 * 
 */
var visParams = {
    
    'evi': {
        bands: ['evi'],
        min: -1.0355,
        max: 3.12,
        palette: [
            'ffffff', 'ce7e45', 'df923d', 'f1b555',
            'fcd163', '99b718', '74a901', '66a000',
            '529400', '3e8601', '609406', '2e8a17',
            '207401', '2b7a11', '1b570c', '004c00',
            '023b01',
        ],
        opacity: 1.0
    },

    'ndvi': {
        bands: ['ndvi'],
        min: -0.0959,
        max: 0.7486,
        palette: [
            'ffffff', 'ce7e45', 'df923d', 'f1b555',
            'fcd163', '99b718', '74a901', '66a000',
            '529400', '3e8601', '609406', '2e8a17',
            '207401', '2b7a11', '1b570c', '004c00',
            '023b01',
        ],
        opacity: 1.0
    },

    'ndfi': {
        "bands": 'ndfi',
        "palette": [
            'ffffff', 'fffcff', 'fff9ff', 'fff7ff', 'fff4ff', 'fff2ff', 'ffefff', 'ffecff', 'ffeaff', 'ffe7ff',
            'ffe5ff', 'ffe2ff', 'ffe0ff', 'ffddff', 'ffdaff', 'ffd8ff', 'ffd5ff', 'ffd3ff', 'ffd0ff', 'ffceff',
            'ffcbff', 'ffc8ff', 'ffc6ff', 'ffc3ff', 'ffc1ff', 'ffbeff', 'ffbcff', 'ffb9ff', 'ffb6ff', 'ffb4ff',
            'ffb1ff', 'ffafff', 'ffacff', 'ffaaff', 'ffa7ff', 'ffa4ff', 'ffa2ff', 'ff9fff', 'ff9dff', 'ff9aff',
            'ff97ff', 'ff95ff', 'ff92ff', 'ff90ff', 'ff8dff', 'ff8bff', 'ff88ff', 'ff85ff', 'ff83ff', 'ff80ff',
            'ff7eff', 'ff7bff', 'ff79ff', 'ff76ff', 'ff73ff', 'ff71ff', 'ff6eff', 'ff6cff', 'ff69ff', 'ff67ff',
            'ff64ff', 'ff61ff', 'ff5fff', 'ff5cff', 'ff5aff', 'ff57ff', 'ff55ff', 'ff52ff', 'ff4fff', 'ff4dff',
            'ff4aff', 'ff48ff', 'ff45ff', 'ff42ff', 'ff40ff', 'ff3dff', 'ff3bff', 'ff38ff', 'ff36ff', 'ff33ff',
            'ff30ff', 'ff2eff', 'ff2bff', 'ff29ff', 'ff26ff', 'ff24ff', 'ff21ff', 'ff1eff', 'ff1cff', 'ff19ff',
            'ff17ff', 'ff14ff', 'ff12ff', 'ff0fff', 'ff0cff', 'ff0aff', 'ff07ff', 'ff05ff', 'ff02ff', 'ff00ff',
            'ff00ff', 'ff0af4', 'ff15e9', 'ff1fdf', 'ff2ad4', 'ff35c9', 'ff3fbf', 'ff4ab4', 'ff55aa', 'ff5f9f',
            'ff6a94', 'ff748a', 'ff7f7f', 'ff8a74', 'ff946a', 'ff9f5f', 'ffaa55', 'ffb44a', 'ffbf3f', 'ffc935',
            'ffd42a', 'ffdf1f', 'ffe915', 'fff40a', 'ffff00', 'ffff00', 'fffb00', 'fff700', 'fff300', 'fff000',
            'ffec00', 'ffe800', 'ffe400', 'ffe100', 'ffdd00', 'ffd900', 'ffd500', 'ffd200', 'ffce00', 'ffca00',
            'ffc600', 'ffc300', 'ffbf00', 'ffbb00', 'ffb700', 'ffb400', 'ffb000', 'ffac00', 'ffa800', 'ffa500',
            'ffa500', 'f7a400', 'f0a300', 'e8a200', 'e1a200', 'd9a100', 'd2a000', 'ca9f00', 'c39f00', 'bb9e00',
            'b49d00', 'ac9c00', 'a59c00', '9d9b00', '969a00', '8e9900', '879900', '7f9800', '789700', '709700',
            '699600', '619500', '5a9400', '529400', '4b9300', '439200', '349100', '2d9000', '258f00', '1e8e00',
            '168e00', '0f8d00', '078c00', '008c00', '008c00', '008700', '008300', '007f00', '007a00', '007600',
            '007200', '006e00', '006900', '006500', '006100', '005c00', '005800', '005400', '005000', '004c00'
        ],
        "min": 0,
        "max": 200,
        "format": "png",
        "opacity": 1.0
    }

};

exports.get = function (key) {

    return visParams[key];
};