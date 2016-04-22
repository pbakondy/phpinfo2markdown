#!/usr/bin/env node
'use strict';

const meow = require('meow');
const fn = require('./index.js');

const cli = meow(`

  Usage
    $ phpinfo2markdown <inputFile> [outputFile|outputDir]

    inputFile is mandantory
    outputFile|outputDir is optional

    Without a second parameter the output file will be placed the same directory
    as the inputFile, the filename will be inherited from inputFile with an
    md extension.

  Options
    -v, --version   Display version

`);

if (cli.flags.h || cli.input.length === 0) {
  cli.showHelp(0);
}

fn(cli.input[0], cli.input[1], cli.flags);
