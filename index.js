// phpinfo() Generator Source:
// https://github.com/php/php-src/
// https://github.com/php/php-src/blob/1c295d4a9ac78fcc2f77d6695987598bb7abcb83/ext/standard/info.c
// https://github.com/php/php-src/blob/1c295d4a9ac78fcc2f77d6695987598bb7abcb83/ext/standard/css.c
// https://github.com/php/php-src/blob/1c295d4a9ac78fcc2f77d6695987598bb7abcb83/main/php_ini.c
//
// main:
// php_print_info()


'use strict';

const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const CONFIG = require('./package.json');
const DEFAULT_OUTPUT_FILENAME = 'PHPINFO.md';
const MARKDOWN_EXTENSION = '.md';


let inputFile;
let outputFile;

let $;


function br2nl(data) {
  if (!data) {
    return '';
  }
  return data.replace(/<br>/g, '\n');
}

function cleanString(data) {
  if (!data) {
    return '';
  }
  return data.replace(/\r/g, ' ').replace(/\n/g, ' ').replace(/&#xA0;/g, ' ').replace(/\*/g, '\\*').replace(/\|/g, '&#124;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}

function tableParser($table) {
  let t = { thead: [], tbody: [] };

  let tbodyContent = false;
  $table.children('tr').each(function() {
    let $tr = $(this);
    let trow = [];

    $tr.children().each(function() {
      // <i>no value</i> -> *no value*
      if ($(this).html().trim() === '<i>no value</i>') {
        trow.push('*no value*');
      } else {
        trow.push(cleanString($(this).text()));
      }
    });

    if (!trow.length) {
      return;
    }

    if (!tbodyContent && $tr.hasClass('h')) {
      t.thead.push(trow);
    } else {
      t.tbody.push(trow);
      tbodyContent = true;
    }
  });

  if (!t.thead.length && !t.tbody.length) {
    console.log('EMPTY', $table.html().length);
    return;
  }

  return t;
}

function items(content) {
  if (!content) {
    console.log('Empty input file');
    return;
  }

  $ = cheerio.load(content);


  let parsed = [];

  // cleanup <br> tags
  $('div.center > br').remove();
  // cleanup <hr> tags
  $('div.center > hr').remove();

  $('div.center').children().each(function(i) {
    let $this = $(this);

    if (i === 0) {
      let title = $this.find('h1.p').text().trim();
      parsed.push({ type: 'h1', data: title });
      return;
    }

    let textContent = $this.text().trim();
    let tagName = $(this).get(0).tagName;

    if (textContent === 'PHP Credits') {
      return;
    }

    if (tagName === 'h1') {
      parsed.push({ type: 'h2', data: textContent });
    }
    if (tagName === 'h2') {
      parsed.push({ type: 'h3', data: textContent });
    }
    if (tagName === 'table') {
      if ($this.prev().text() === 'PHP License') {
        $this.find('p').each(function() {
          let p = $(this).text().trim();
          parsed.push({ type: 'paragraph', data: p });
        });
      } else if ($this.children('tr.v').length) {
        let $p = $this.find('tr.v td');
        $p.find('a').remove();
        let p = cleanString(br2nl($p.html()));
        parsed.push({ type: 'paragraph', data: p });
      } else {
        parsed.push({ type: 'table', data: tableParser($this) });
      }
    }

  });

  return parsed;

}

function tableEmptyHeader(cols) {
  return (new Array(cols + 2).join('|')) + '\n';
}

function tableHeadSeparator(cols) {
  let separator = new Array(cols);
  separator.fill('---');
  return '| ' + separator.join(' | ') + ' |\n';
}

function toMarkdown(data) {
  let md = '';

  data.forEach(item => {
    if (!item.data) {
      return;
    }
    if (item.type === 'h1') {
      md += '# ' + item.data + '\n\n';
      return;
    }
    if (item.type === 'h2') {
      md += '## ' + item.data + '\n\n';
      return;
    }
    if (item.type === 'h3') {
      md += '### ' + item.data + '\n\n';
      return;
    }
    if (item.type === 'paragraph') {
      md += item.data + '\n\n';
      return;
    }
    if (item.type === 'table') {
      let cols = item.data.thead.length ? item.data.thead[0].length :
        item.data.tbody.length ? item.data.tbody[0].length : 0;

      if (cols === 0) {
        console.log('Empty table', item.data);
        return;
      }

      item.data.thead.forEach((row, index) => {
        if (index > 0) {
          row = row.map(cell => '**' + cell + '**');
        }
        md += '| ' + row.join(' | ') + ' |\n';
        if (index === 0) {
          md += tableHeadSeparator(cols);
        }
      });

      if (!item.data.thead.length) {
        md += tableEmptyHeader(cols);
        md += tableHeadSeparator(cols);
      }

      item.data.tbody.forEach(row => {
        row[0] = '**' + row[0] + '**';
        md += '| ' + row.join(' | ') + ' |\n';
      });

      md += '\n';
      return;
    }
    console.log('Unknown data:', item);
  });

  return md;
}


function run() {
  console.log('Loading', inputFile);

  fs.readFile(inputFile, (err, fileContent) => {
    if (err) {
      console.log('Error', err);
      return;
    }
    let parsed = items(fileContent);
    if (!parsed) {
      return;
    }

    let md = toMarkdown(parsed);

    if (!md) {
      console.log('No phpinfo() content found');
      return;
    }

    // hide empty table cells
    md += '<style>th:empty,td:empty{display: none}</style>\n';

    fs.writeFile(outputFile, md, (err) => {
      if (err) {
        console.log('File write error', err);
        return;
      }
      console.log('MarkDown file written to', outputFile);
    });
  });

}

/*
  when input exists and !isFile -> error
  when input exists -> inputFile = input
  otherwise error
*/
function checkInput(input, output) {
  input = path.resolve(process.cwd(), input);

  fs.stat(input, (err, stats) => {
    if (err) {
      console.log('Invalid input file');
      return;
    }
    if (!stats.isFile()) {
      console.log('Invalid input file');
      return;
    }
    inputFile = input;
    checkOutput(output);
  });
}

/*
  DEFAULT_OUTPUT_FILENAME = 'PHPINFO.md'
  when output exists and isDirectory -> outputFile = output/PHPINFO.md
  when output exists and !isFile -> error
  when output exists -> outputFile = output
  otherwise outputFile = inputFile.basename + .md
*/
function checkOutput(output) {
  if (!output) {
    let ext = path.extname(inputFile);
    output = path.join(path.dirname(inputFile), path.basename(inputFile, ext) + MARKDOWN_EXTENSION);
  }
  output = path.resolve(process.cwd(), output);

  fs.stat(output, (err, stats) => {
    if (err) {
      outputFile = output;
      run();
      return;
    }
    if (stats.isDirectory()) {
      outputFile = path.join(output, DEFAULT_OUTPUT_FILENAME);
      run();
      return;
    }
    outputFile = output;
    run();
  });
}

module.exports = function(input, output, options) {
  if (options.v || options.version) {
    console.log(CONFIG.version);
    return;
  }

  checkInput(input, output);
};
