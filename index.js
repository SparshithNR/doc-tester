const { getCode, executeTests, parseFile } = require('./lib/util');
const fs = require('fs');
const rm = require('rimraf').sync;

module.exports = async (file, debug, inspect, output) => {
  await runTest(parseFile(file), { testName: file, debug, inspect, testFile: output });
}

async function runTest({ codeArray, importsArray }, options) {
  let { testName = 'Doc Test' , debug = false, inspect = false, testFile = `test.js` } = options || {};
  try {
    fs.writeFileSync(testFile, getCode(codeArray, importsArray, testName));
    return await executeTests(inspect, testFile);
  } finally {
    if(!debug) {
      rm(testFile);
    }
  }
}

module.exports.runTest = runTest;