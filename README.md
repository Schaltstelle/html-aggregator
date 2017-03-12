# simple-site
[![Build Status](https://travis-ci.org/Schaltstelle/simple-site.svg?branch=master)](https://travis-ci.org/Schaltstelle/simple-site)
[![codecov](https://codecov.io/gh/Schaltstelle/simple-site/graph/badge.svg)](https://codecov.io/gh/Schaltstelle/simple-site)
[![License](https://img.shields.io/badge/License-Apache%202.0-yellowgreen.svg)](https://opensource.org/licenses/Apache-2.0)

A simple website generator.

## Usage
Install with `npm install -g simple-site`.

Run with `simple-site build`. 

## Function
Simple-site recursively processes all files in the current directory and outputs them into an output directory.
Depending on the file extension, different actions take place.
- `*.md` apply the contents to the given template (see below).
- `*.html` apply possibly existing handlebar `{{...}}` tags.
- all other files copied into the output directory without any processing.

## Templating
A simple .md file looks like this:
```yaml
title: Hello site!
author: Joe Doe
date: 2017-03-17
template: _templates/simple.html
---
Here some *markdown* content.
```
the corresponding template `simple.html` would be:
```html
<body>
    <h1>{{title}}</h1>
    {{date}}, {{author}}
    <br>
    {{{content}} 
</body>
```

## Configuration
Configuration parameters can be defined on the command line `simple-site build --outputDir=dist` or in a file named `_config.yaml`.
All parameters are available in handlebar tags.
The following parameters exist:

`outputDir` The output directory. Default: `output`

`exclude` File patterns that should excluded from processing (by default all files starting with _ or . are already excluded).

`watch` When present, all files are watched and processed on change, the output directory is served on port 8111.

## Plugins
All `.js` files in `_plugins` are read and processed at the begin of the process.
