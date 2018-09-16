![Test Coverage-shield-badge-1](https://img.shields.io/badge/Test%20Coverage-96.3%25-brightgreen.svg)

# Concat Scss (Work in progress)

Concat scss or css files into one file

# Features

* Base64 encode asset urls inline into the scss file
* Option available to copy assets to destination directory instead of base64 encoding them directly into the scss file
* Option to compile scss to css using node-sass
* Option to ignore certain @import statements or ignore whole chunks of scss code using start and end ignore comment tags

# How to use

## Installation 

``Currently not available in npm``

## Basic Usage

```typescript
const ConcatScss = require('@thenja/concat-scss');

const concatScss = new ConcatScss();
const options = {
  src: './scss/index.scss',
  dest: './dist/scss/index.scss'
};
concatScss.concat(options)
.then((result) => {
  // the file contents output is also returned
  console.log(result.output);
}).catch((err) => {
  throw err;
});
```

## Options

|Option | Required | Description |
|-------|----------|-------------|
|src | required | The filepath to the source file |
|dest | required | The filepath to the output destination file |
|rootDir | optional | The root directory of the project, basically where the node_modules folder is found. By default, concat-scss will use process.cwd() to find the root directory, if by any chance this is wrong, you can manully pass it in |
|removeImports | optional | Remove / Ignore any imports you do not want in the output file (example below) |
|outputCss | optional | Default value: _false_. Use node-sass to compile the scss into css |
|copyAssetsToDest | optional | Default value: _false_. By default, all asset urls are base64 encoded inline in the scss files, however, if you want, you can copy the assets to the output directory (_Refer to the detailed example below_). |

# Examples

## Remove / Ignore @import statements example

### Scss file
```scss
@import "_variables";
@import "~bootstrap/scss/bootstrap.scss";

$testVar: #000;
.test {
  color: $testVar;
}
```

### Concat-scss script
```typescript
const ConcatScss = require('@thenja/concat-scss');

const concatScss = new ConcatScss();
const options = {
  src: './scss/index.scss',
  dest: './dist/scss/index.scss',
  removeImports: [ '~bootstrap/scss/bootstrap.scss' ]
};
concatScss.concat(options)
.then((result) => {
  // the file contents output is also returned
  console.log(result.output);
}).catch((err) => {
  throw err;
});
```

## Copy assets to output directory example

The __copyAssetsToDest__ option can either be a boolean value or an array of asset urls that you want to copy to the destination directory. If set to _true_, all assets will be copied to the destination directory.

In the example below, we will only copy the font asset icomoon.svg to the output destination directory, where as the fake-logo.png asset will still be base64 encoded inline.

### Scss file
```scss
$color-primary: #000;
.logo {
  color: $color-primary;
  background-image: url("./fake-logo.png");
}

@font-face {
  font-family: 'icomoon';
  src:
    url('icomoon/fonts/icomoon.svg') format('svg');
  font-weight: normal;
  font-style: normal;
}
```

### Concat-scss script
```typescript
const ConcatScss = require('@thenja/concat-scss');

const concatScss = new ConcatScss();
const options = {
  src: './scss/index.scss',
  dest: './dist/scss/index.scss',
  copyAssetsToDest: [ 'icomoon/fonts/icomoon.svg' ],
  // copyAssetsToDest: true (all assets will be copied if set to true)
};
concatScss.concat(options)
.then((result) => {
  // the file contents output is also returned
  console.log(result.output);
}).catch((err) => {
  throw err;
});
```

## Ignore chunks of scss code example

In your scss code, add the following comments, anything in between these comments will be excluded from the output

```scss
// concat-scss-ignore-start
$variableThatWillBeExcluded: #ccc;
// concat-scss-ignore-end
```


# Development

``npm run init`` - Setup the app for development (run once after cloning)

``npm run dev`` - Run this command when you want to work on this app. It will
compile typescript, run tests and watch for file changes.

## Distribution

``npm run build -- -v <version>`` - Create a distribution build of the app.

__-v (version)__ - _[Optional]_ Either "patch", "minor" or "major". Increase
the version number in the package.json file.

The build command creates a _/compiled_ directory which has all the javascript
compiled code and typescript definitions. As well, a _/dist_ directory is 
created that contains a minified javascript file.

## Testing

_Tests are automatically ran when you do a build._

``npm run test`` - Run the tests. The tests will be ran in a nodejs environment.
You can run the tests in a browser environment by opening the file 
_/spec/in-browser/SpecRunner.html_.

## License

MIT © [Nathan Anderson](https://github.com/nathan-andosen)