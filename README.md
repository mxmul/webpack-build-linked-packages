# Webpack Build Linked Packages

[![npm](https://img.shields.io/npm/v/webpack-build-linked-packages.svg)](https://yarn.pm/webpack-build-linked-packages)

A webpack plugin that runs a build script for any symlinked packages in node_modules (e.g. via `npm link` or `yarn link`).

## Installation

```shell
npm install webpack-build-linked-packages --save-dev
```

## Usage

In your webpack config, require the plugin then add an instance to the `plugins` array.

```js
const WebpackBuildLinkedPackages = require("webpack-build-linked-packages");

module.exports = {
  plugins: [
    new WebpackBuildLinkedPackages({
      // Options go here
    })
  ]
};
```

## Options ([read the schema](options-schema.json))

### `scriptName`

Type: `string`

Default: `build`

The NPM script to run in all linked packages. If the script is defined in the linked package, it will be invoked with `npm run-script`.
