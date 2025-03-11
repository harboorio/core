'use strict';

var path = require('node:path');
var promises = require('node:fs/promises');

async function fileFinder(possibleFileNames, possiblePaths) {
  const possibleAbsPaths = possiblePaths.map(_p => _p.startsWith('/') ? _p : path.resolve(process.cwd(), _p));
  const possibleFiles = createLoadingOrder(possibleFileNames, possibleAbsPaths);
  return findFile(possibleFiles);
}
function createLoadingOrder(filenames, possibleAbsPaths) {
  return possibleAbsPaths.reduce((memo, _path) => {
    memo = memo.concat(filenames.map(_name => path.resolve(_path, _name)));
    return memo;
  }, []);
}
async function findFile(possibleFiles) {
  for await (const file of possibleFiles) {
    if (await verifyFile(file)) {
      return file;
    }
  }
  return null;
}
async function verifyFile(_filepath) {
  try {
    await promises.access(_filepath, promises.constants.R_OK);
    return true;
  } catch (e) {
    return false;
  }
}

async function readTsConfig(possiblePaths, possibleFileNames = ['tsconfig.json']) {
  const location = await fileFinder(possibleFileNames, possiblePaths);
  if (!location) return null;
  return JSON.parse(await promises.readFile(location, 'utf-8'));
}
function isAliasPath(filepath, tsconfig) {
  const aliases = findAliases(tsconfig);
  return Object.keys(aliases).some(pattern => filepath.startsWith(pattern.replace('*', '')));
}
function resolveAlias(alias, tsconfig, projectPath) {
  const _searchPath = projectPath ?? process.cwd();
  const aliases = findAliases(tsconfig);
  const pattern = Object.keys(aliases).find(_pattern => alias.startsWith(_pattern.replace('*', '')));
  if (!pattern.includes('*')) {
    return aliases[pattern].map(p => path.resolve(_searchPath, p));
  }
  const _input = alias.replace(pattern.replace('*', ''), '');
  return aliases[pattern].map(p => path.resolve(_searchPath, p.replace('*', _input)));
}
function findAliases(tsconfig) {
  return tsconfig ? tsconfig?.compilerOptions?.paths ?? {} : {};
}

function pathv(relativePath) {
  return relativePath;
}
const rePathvCalls = `(pathv\\(('|")(.*)('|"))\\)`;
const rePathvCallsGM = new RegExp(rePathvCalls, 'gm');
const rePathvCallsNoFlag = new RegExp(rePathvCalls, '');
function findProjectPath(sourceRelativePath) {
  const _src = path.normalize(sourceRelativePath);
  const cwd = process.cwd();
  return cwd.endsWith(_src) ? path.resolve(cwd, _src.split('/').map(() => '..').join('/')) : cwd;
}
async function processPathvCalls(content, fileAbsPath, sourceRelativePath, distRelativePath) {
  const projectPath = findProjectPath(sourceRelativePath);
  const tsconfig = await readTsConfig([path.resolve(projectPath, sourceRelativePath), projectPath]);
  const analysis = analysePaths(content, fileAbsPath, projectPath, tsconfig, sourceRelativePath, distRelativePath);
  await distAnalysedFiles(analysis, projectPath);
  return formatSourceContent(content, analysis);
}
function formatSourceContent(content, analysis) {
  return Object.keys(analysis).reduce((memo, token) => memo.replace(token, analysis[token].pathvExp), content);
}
async function distAnalysedFiles(analysis, projectPath) {
  for await (const {
    realRelPath,
    relDistPath
  } of Object.values(analysis)) {
    await promises.copyFile(path.resolve(projectPath, realRelPath), path.resolve(projectPath, relDistPath));
  }
}
function analysePaths(content, fileAbsPath, projectPath, tsconfig, sourceRelativePath, distRelativePath) {
  const matches = content.match(rePathvCallsGM);
  if (!matches) {
    return {};
  }
  const matchesFormatted = matches.map(text => text.match(rePathvCallsNoFlag));
  const result = {};
  for (const _matches of matchesFormatted) {
    if (!_matches) continue;
    const input = _matches[3];
    const inputType = findInputType(input);
    const realRelPath = findRealRelativePath(input, inputType);
    const relDistPath = findCorrespondingDistPath(realRelPath, inputType);
    result[_matches[0]] = {
      realRelPath,
      relDistPath,
      pathvExp: `path.resolve(import.meta.dirname, '${'./' + path.relative(distRelativePath, relDistPath)}')`
    };
  }
  return result;
  function findRealRelativePath(input, inputType) {
    switch (inputType) {
      case "PROJECT_RELATIVE_OUTSIDE_SOURCE":
        return input;
      case "PROJECT_RELATIVE_IN_SOURCE":
        return input;
      case "ALIAS":
        const resolved = resolveAlias(input, tsconfig, projectPath)[0];
        return './' + path.relative(projectPath, resolved);
      case "ABSOLUTE":
        return input.includes(projectPath) ? path.relative(path.resolve(projectPath, sourceRelativePath), input) : input;
    }
  }
  function findCorrespondingDistPath(projectRelativeFilePath, inputType) {
    if (projectRelativeFilePath.startsWith('/')) {
      return path.join(projectPath, distRelativePath, projectRelativeFilePath);
    }
    if (inputType === 'PROJECT_RELATIVE_OUTSIDE_SOURCE') {
      return './' + path.join(distRelativePath, projectRelativeFilePath);
    }
    return './' + path.join(distRelativePath, path.relative(sourceRelativePath, projectRelativeFilePath));
  }
  function findInputType(input) {
    if (input.startsWith('/')) {
      return 'ABSOLUTE';
    } else if (tsconfig && isAliasPath(input, tsconfig)) {
      return 'ALIAS';
    } else if (path.normalize(input).includes(path.normalize(sourceRelativePath))) {
      return 'PROJECT_RELATIVE_IN_SOURCE';
    } else {
      return 'PROJECT_RELATIVE_OUTSIDE_SOURCE';
    }
  }
}

exports.pathv = pathv;
exports.processPathvCalls = processPathvCalls;
//# sourceMappingURL=index.cjs.map
