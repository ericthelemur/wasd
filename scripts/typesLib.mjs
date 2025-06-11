// Taken from https://github.com/nodecg/nodecg-cli/blob/master/src/commands/schema-types.ts

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Packages
import chalk from 'chalk';
import fse from 'fs-extra';
import { compileFromFile } from 'json-schema-to-typescript';

const writeFilePromise = promisify(fs.writeFile);
const deleteFilePromise = promisify(fs.rm);

const style = {
    singleQuote: true,
    useTabs: true,
};

const newFiles = [];
const rootIndexFile = [];
const targetDir = "src/types/schemas";


// Generate configschema.json
function config() {
    const processCwd = process.cwd();
    const configSchemaPath = path.join(processCwd, 'configschema.json');
    const configSchemaTarget = path.resolve(targetDir, 'configschema.d.ts');

    if (fs.existsSync(configSchemaPath)) {
        rootIndexFile.push('// @ts-ignore');
        rootIndexFile.push(`export * from './configschema';`);

        newFiles.push(configSchemaTarget);

        return compileFromFile(configSchemaPath, {
            processCwd,
            declareExternallyReferenced: true,
            enableConstEnums: true,
            style,
        }).then((ts) => writeFilePromise(configSchemaTarget, ts))
            .then(() => console.log(configSchemaTarget))
            .catch((err) => console.error(err));
    }
}


// Generate schema for a subdir
// TODO: Also copy schemas to extensions/schemas and reference from there
function action(inDir) {
    console.log(inDir);
    const processCwd = process.cwd();
    const schemasDir = path.resolve(processCwd, "src", inDir, "schemas");
    if (!fs.existsSync(schemasDir)) {
        console.error(chalk.red('Error:') + ' Input directory ("%s") does not exist', inDir);
        return;
    }

    const outDir = path.resolve(processCwd, `${targetDir}/${inDir}`);
    if (!fs.existsSync(outDir)) {
        fse.mkdirpSync(outDir);
    }

    const schemas = fs.readdirSync(schemasDir).filter((f) => f.endsWith('.json'));

    const compilePromises = [];
    const compile = (input, output, cwd = processCwd) => {
        const promise = compileFromFile(input, {
            cwd,
            declareExternallyReferenced: true,
            enableConstEnums: true,
            style,
        })
            .then((ts) => writeFilePromise(output, ts))
            .then(() => console.log(output))
            .catch((err) => console.error(err));
        compilePromises.push(promise);
        newFiles.push(output);
    };

    const indexFiles = ['/* eslint-disable */'];

    for (const schema of schemas) {
        indexFiles.push('// @ts-ignore');
        indexFiles.push(`export * from './${schema.replace(/\.json$/i, '')}';`);

        compile(
            path.resolve(schemasDir, schema),
            path.resolve(outDir, schema.replace(/\.json$/i, '.d.ts')),
            schemasDir,
        );
    }

    // Build subdir index file
    const indexPath = path.resolve(outDir, 'index.d.ts');
    const indexPromise = writeFilePromise(indexPath, `${indexFiles.join('\n')}\n`);
    newFiles.push(indexPath);

    rootIndexFile.push('// @ts-ignore');
    rootIndexFile.push(`export * from './${inDir}';`);

    return Promise.all([indexPromise, ...compilePromises]);
}


export default function main() {
    // Build definitions for all sub dirs
    const processCwd = process.cwd();
    const srcDir = path.resolve(processCwd, 'src');
    const hasSchemas = (dirent) => fs.existsSync(path.join(srcDir, dirent.name, "schemas"));

    const promises = fs.readdirSync(srcDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && dirent.name != "types" && hasSchemas(dirent))
        .map(dirent => action(dirent.name))

    // Build config definition
    promises.push(config());

    // Build root index file
    const rootPath = path.resolve(targetDir, 'index.d.ts');
    const rootPromise = writeFilePromise(rootPath, `${rootIndexFile.join('\n')}\n`);
    newFiles.push(rootPath);
    promises.push(rootPromise);

    // Remove outdated files
    const existingFiles = fs.readdirSync(targetDir, { recursive: true })
        .filter(n => n.endsWith(".d.ts")).map(n => path.resolve(targetDir, n));

    const diff = existingFiles.filter(x => !newFiles.includes(x));
    diff.map(f => deleteFilePromise(f).then(_ => console.log("Removed", f)));
    promises.concat(diff);

    // Wait for all promises
    return Promise.all(promises).then(() => process.emit('schema-types-done'));
}