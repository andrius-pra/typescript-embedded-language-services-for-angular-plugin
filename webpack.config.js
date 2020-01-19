//@ts-check
'use strict';

const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node',
    entry: './src/index.ts',
    output: {
        path: path.resolve(__dirname, 'lib'),
        filename: 'index.js',
        libraryTarget: "commonjs2",
        devtoolModuleFilenameTemplate: "../[resource-path]",
    },
    devtool: 'source-map',
    externals: {
        'typescript-template-language-service-decorator': true,
        'vscode-css-languageservice': true,
        'vscode-html-languageservice': true,
        'vscode-languageserver-types': true,
        'vscode-emmet-helper': true
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [{
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [{
                loader: 'ts-loader'
            }]
        }]
    },
}

module.exports = config;