const { getCode, executeTests, parseFile } = require('./lib/util');
const fs = require('fs-extra');
const rm = require('rimraf').sync;

module.exports = async (file, cleanup, inspect, output) => {
  await runTest(parseFile(file), { testName: file, cleanup, inspect, output });
}

async function runTest({ codeArray, importsArray }, options) {
  let { testName = 'Doc Test' , cleanup = true, inspect = false, output = `test.js` } = options || {};
  try {
    fs.ensureFileSync(output);
    fs.writeFileSync(output, getCode(codeArray, importsArray, testName));
    return await executeTests(inspect, output);
  } finally {
    if(cleanup) {
      rm(output);
    }
  }
}

module.exports.runTest = runTest;