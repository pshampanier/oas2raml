#!/usr/bin/env node
const log = require('winston');
const program = require('commander');
const converter = require('../index.js');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

program.version(require('../package.json').version)
  .usage('[options] <openapi.yaml>')
  .option('-v, --verbose', 'verbose mode', false)
  .option('-o, --output <api.raml>', 'output file, otherwise use stdout')
  .parse(process.argv);

if (program.verbose) {
  log.level = 'verbose';
}

if (program.args.length == 0) {
  program.help();
}

const source = yaml.safeLoad(fs.readFileSync(program.args[0], 'utf8'), { json: true });
const output = (program.output && !path.isAbsolute(program.output)) ? path.join(process.cwd(), program.output) : program.output;
const raml = converter.convert(source);
if (output) {

}
else {
  console.log(raml);
}
