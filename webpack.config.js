const TerserPlugin = require('terser-webpack-plugin')


module.exports = () => {
    return {
        mode: 'development',

        watchOptions: {
            ignored: /node_modules|dist|\.js/g,
        },

        devtool: 'cheap-module-source-map',

        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.json'],
            plugins: [],
        },
        externals: {
            'jquery': 'jQuery',
            'jqueryui': 'jQuery',
            'bootstrap': 'jQuery',
            'chrome': 'chrome',
            'dexie': 'Dexie',
            'xregexp': 'XRegExp',
            'jszip': 'JSZip'
        },

        optimization: {
            minimizer: [
                new TerserPlugin({
                    sourceMap: true
                })
            ],
        },

        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: 'awesome-typescript-loader?sourceMap=' + true,
                    options: {
                        useBabel: false,
                        babelOptions: {
                            babelrc: false,
                            presets: [
                                ['minify']
                            ],
                            plugins: [],
                            sourceMaps: true
                        },
                        useTranspileModule: true,
                        comments: true,
                        silent: false
                    },
                },
            ],
        },
    }
}
