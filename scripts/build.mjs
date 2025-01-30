/**
 * Parcel build script
 * See https://parceljs.org/features/parcel-api/ for more info
 */

// Native
import { fileURLToPath } from 'url';
import { argv } from 'process';
import fsPromises from 'fs/promises';
import fs from 'fs';

// Packages
import { glob } from 'glob';
import { Parcel } from '@parcel/core';
import chokidar from 'chokidar';

// Ours
import debounce from './debounce.mjs';
import types from "./typesLib.mjs";


// Parse cmd line flags
function argParse(def) {
  const buildAll = argv.includes('--all');
  const buildDefault = def || argv.includes('--default');
  const cleanOnly = argv.includes("--clean-only");
  const buildBrowser = argv.includes('--browser');
  const args = {
    extension: argv.includes('--extension') || buildAll || buildDefault,
    dashboard: argv.includes('--dashboard') || buildAll || buildDefault || buildBrowser,
    graphics: argv.includes('--graphics') || buildAll || buildDefault || buildBrowser,
    shared: argv.includes('--shared') || buildAll || buildDefault, // || buildBrowser,
    schemas: argv.includes('--schemas') || argv.includes('--types') || buildAll,
    nodeModules: argv.includes('--node-modules'),
    production: argv.includes('--production'),
  }
  // If none provided, recall taking default
  if (!Object.values(args).find(v => v)) return argParse(true);

  const watch = argv.includes('--watch');
  const clean = argv.includes('--clean');
  // Log what is being built
  const selected = Object.entries(args).filter(([k, v]) => v).map(([k, v]) => k).join(", ");
  console.log(cleanOnly ? "Cleaning" : ((clean ? "Clean " : "") + (watch ? "Watching" : "Building")), selected);

  return { ...args, watch: watch, clean: clean, all: buildAll, cleanOnly: cleanOnly };
}

const build = argParse(false);

// Clean files, exit if clean only
if (build.cleanOnly || build.clean) {
  const promises = [];

  function deleteDir(path) {
    if (fs.existsSync(path)) {
      promises.push(fsPromises.rm(path, { recursive: true }));
    }
  }

  if (build.schemas) deleteDir("src/types/schemas");
  if (build.extension) deleteDir("extension");
  if (build.dashboard) deleteDir("dashboard");
  if (build.shared) deleteDir("shared");
  if (build.graphics) deleteDir("graphics");
  if (build.all || build.nodeModules) deleteDir(".parcel-cache");
  if (build.nodeModules) deleteDir("node_modules");

  await Promise.all(promises);
  console.log("Clean complete");
  if (build.cleanOnly) process.exit(0);
}


const bundlers = new Set();
const commonBrowserTargetProps = {
  engines: {
    browsers: ['last 5 Chrome versions'],
  },
  context: 'browser',
};

if (build.dashboard) {
  bundlers.add(
    new Parcel({
      entries: glob.sync('src/*/dashboard/**/*.html'),
      targets: {
        default: {
          ...commonBrowserTargetProps,
          distDir: './dashboard',
          publicUrl: `/bundles/wasd/dashboard`,
        },
      },
      defaultConfig: '@parcel/config-default',
      additionalReporters: [
        {
          packageName: '@parcel/reporter-cli',
          resolveFrom: fileURLToPath(import.meta.url),
        },
      ],
      validators: {
        "*.{ts,tsx}": ["@parcel/validator-typescript"]
      }
    }),
  );
}

if (build.graphics) {
  bundlers.add(
    new Parcel({
      entries: glob.sync('src/*/graphics/**/*.html'),
      targets: {
        default: {
          ...commonBrowserTargetProps,
          distDir: './graphics',
          publicUrl: `/bundles/wasd/graphics`,
        },
      },
      defaultConfig: '@parcel/config-default',
      additionalReporters: [
        {
          packageName: '@parcel/reporter-cli',
          resolveFrom: fileURLToPath(import.meta.url),
        },
      ],
      validators: {
        "*.{ts,tsx}": ["@parcel/validator-typescript"]
      }
    }),
  );
}

if (build.shared) {
  bundlers.add(
    new Parcel({
      entries: glob.sync('src/*/shared/**/*.html'),
      targets: {
        default: {
          ...commonBrowserTargetProps,
          distDir: './shared',
          publicUrl: `/bundles/wasd/shared`,
        },
      },
      defaultConfig: '@parcel/config-default',
      additionalReporters: [
        {
          packageName: '@parcel/reporter-cli',
          resolveFrom: fileURLToPath(import.meta.url),
        },
      ],
      validators: {
        "*.{ts,tsx}": ["@parcel/validator-typescript"]
      }
    }),
  );
}

if (build.extension) {
  bundlers.add(
    new Parcel({
      entries: 'src/index.extension.ts',
      targets: {
        default: {
          context: 'node',
          distDir: 'extension',
          distEntry: "index.js"
        },
      },
      defaultConfig: '@parcel/config-default',
      additionalReporters: [
        {
          packageName: '@parcel/reporter-cli',
          resolveFrom: fileURLToPath(import.meta.url),
        },
      ],
    }),
  );
}

try {
  if (build.watch) {
    if (build.schemas) {
      watchSchemas();
    }

    const watchPromises = [];
    for (const bundler of bundlers.values()) {
      watchPromises.push(
        bundler.watch((err) => {
          if (err) {
            // fatal error
            throw err;
          }
        }),
      );
    }

    await Promise.all(watchPromises);
  } else {
    if (build.schemas) {
      await doBuildSchemas();
    }

    const buildPromises = [];
    for (const bundler of bundlers.values()) {
      buildPromises.push(bundler.run()); //.then(({ bundleGraph, buildTime }) => console.log(`Built ${bundleGraph.getBundles().length} bundles`)));
    }

    await Promise.all(buildPromises);
  }

  console.log('Bundle build completed successfully');
} catch (e) {
  // throw e;
  // the reporter-cli package will handle printing errors to the user
  console.log(e);
  process.exit(1);
}

async function doBuildSchemas() {
  await types();
  process.stdout.write(`🔧 Built Replicant schema types!\n`);
}

function watchSchemas() {
  chokidar.watch('schemas/**/*.json').on('all', () => {
    debounce('compileSchemas', doBuildSchemas);
  });
}