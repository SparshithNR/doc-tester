const { getCode, executeTests, parseFile } = require('./lib/util');
const fs = require('fs');
const rm = require('rimraf').sync;

module.exports = async (fileName, debug, inspect) => {
  const { codeArray, importsArray } = parseFile(fileName);
  try {
    fs.writeFileSync('test.js', getCode(codeArray, importsArray, fileName));
    await executeTests(inspect);
  } finally {
    if(!debug) {
      rm('test.js');
    }
  }
}