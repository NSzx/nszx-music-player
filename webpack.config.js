const TerserPlugin = require('terser-webpack-plugin')


module.exports = (env) => {

    const prod = (env && env.prod) || false

    return {
        mode: 'development',

        watchOptions: {
            ignored: /node_modules|build|dist|\.js/g,
        },

        devtool: prod ? false : 'cheap-module-source-map',

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
                    sourceMap: !prod
                })
            ],
        },

        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: 'awesome-typescript-loader?sourceMap=' + !prod,
                    options: {
                        useBabel: false,
                        babelOptions: {
                            babelrc: false,
                            presets: [
                                ['minify']
                            ],
                            plugins: [],
                            sourceMaps: !prod
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
