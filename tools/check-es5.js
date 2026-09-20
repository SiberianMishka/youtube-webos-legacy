const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const projectRoot = path.resolve(__dirname, '..');
const artifactRoot = path.join(projectRoot, 'dist');

function findJavaScriptFiles(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .reduce((files, entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return files.concat(findJavaScriptFiles(entryPath));
      }

      if (entry.isFile() && path.extname(entry.name) === '.js') {
        files.push(entryPath);
      }

      return files;
    }, []);
}

if (!fs.existsSync(artifactRoot)) {
  console.error(
    'ES5 syntax check failed: dist directory does not exist; run the build first.'
  );
  process.exit(1);
}

const artifactFiles = findJavaScriptFiles(artifactRoot).sort();

if (artifactFiles.length === 0) {
  console.error(
    'ES5 syntax check failed: no JavaScript artifacts found in dist.'
  );
  process.exit(1);
}

let failed = false;

artifactFiles.forEach((file) => {
  try {
    acorn.parse(fs.readFileSync(file, 'utf8'), {
      ecmaVersion: 5,
      sourceType: 'script'
    });
  } catch (error) {
    failed = true;
    console.error(
      `ES5 syntax check failed: ${path.relative(projectRoot, file)}:${
        error.loc.line
      }:${error.loc.column + 1} ${error.message}`
    );
  }
});

if (failed) {
  process.exit(1);
}

console.log(
  `ES5 syntax check passed for ${artifactFiles.length} JavaScript artifacts.`
);
