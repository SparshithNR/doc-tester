const { getCode, executeTests, parseFile } = require('./lib/util');
const fs = require('fs');
const rm = require('rimraf').sync;

module.exports = async (fileName, debug, inspect) => {
  await runTest(parseFile(fileName), fileName, debug, inspect);
}

async function runTest({ codeArray, importsArray }, fileName='test', debug=false, inspect=false) {
  try {
    fs.writeFileSync('test.js', getCode(codeArray, importsArray, fileName));
    return await executeTests(inspect);
  } finally {
    if(!debug) {
      rm('test.js');
    }
  }
}

module.exports.runTest = runTest;