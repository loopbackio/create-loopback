#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const pacote = require('pacote');

const DEPENDENCIES_FILE = path.join(__dirname, '../versions.json');
(async () => {
  const dependencies = await fs.readFile(DEPENDENCIES_FILE)
    .then((data) => new Map(Object.entries(JSON.parse(data))));

  for (let key of  dependencies.keys()) {
    if (key === 'typescript') {
      const {dependencies: buildDeps} = await pacote.manifest('@loopback/build');
      dependencies.set(key, buildDeps['typescript']);
      continue;
    }
    const {version} = await pacote.manifest(key);
    dependencies.set(key, `^${version}`);
  }

  await fs.writeFile(DEPENDENCIES_FILE, JSON.stringify(Object.fromEntries(dependencies), undefined, 2));
})();