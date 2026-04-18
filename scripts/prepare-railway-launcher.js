const { mkdirSync, writeFileSync } = require("fs");
const path = require("path");

const distDir = path.join(process.cwd(), "backend", "dist");
const targetFile = path.join(distDir, "main.js");

const launcher = `'use strict';

const { spawn } = require('child_process');

const port = process.env.PORT || '3000';
const host = process.env.HOSTNAME || '0.0.0.0';
const nextBin = require.resolve('next/dist/bin/next');

const child = spawn(process.execPath, [nextBin, 'start', '-p', port, '-H', host], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});

process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
`;

mkdirSync(distDir, { recursive: true });
writeFileSync(targetFile, launcher, "utf8");
console.log(`Prepared Railway launcher at ${targetFile}`);
