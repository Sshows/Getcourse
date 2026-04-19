const { mkdirSync, writeFileSync } = require("fs");
const path = require("path");

const distDir = path.join(process.cwd(), "backend", "dist");
const targetFile = path.join(distDir, "main.js");

const launcher = `'use strict';

require('../../scripts/start-railway.js');
`;

mkdirSync(distDir, { recursive: true });
writeFileSync(targetFile, launcher, "utf8");
console.log(`Prepared Railway launcher at ${targetFile}`);
