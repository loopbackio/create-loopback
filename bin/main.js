#!/usr/bin/env node

const Environment = require('yeoman-environment');
const { name, description, version } = require('../package.json');
const generator = require('../generator');

const command = Environment.prepareCommand(generator);

command
  .name(name)
  .description(description)
  .version(version)
  .parseAsync(process.argv)
  .catch((e) => {
    console.error(e)
    process.exit(1)
  });
