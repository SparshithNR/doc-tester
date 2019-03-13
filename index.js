const { getCode, executeTests, parseFile } = require('./lib/util');
const fs = require('fs-extra');
const rm = require('rimraf').sync;

module.exports = async (file, cleanup, inspect, output) => {
  await runTest(parseFile(file), { testName: file, cleanup, inspect, output });
}

async function runTest({ codeArray, importsArray }, options) {
  let { testName = 'Doc Test' , cleanup = true, inspect = false, output = `test.js` } = options || {};
  try {
    let testCode = getCode(codeArray, importsArray, testName);
    if (testCode) {
      fs.ensureFileSync(output);
      fs.writeFileSync(output, testCode);
      return await executeTests(inspect, output);
    }
    return true;
  } finally {
    if(cleanup) {
      rm(output);
    }
  }
}

module.exports.runTest = runTest;