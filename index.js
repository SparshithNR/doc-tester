const { getCode, executeTests, parseFile } = require('./lib/util');
const fixture = require('fixturify');
const rm = require('rimraf').sync;

module.exports = async (fileName, debug) => {
  const { codeArray, importsArray } = parseFile(fileName);

  fixture.writeSync('.',{
    'test.js': getCode(codeArray, importsArray)
  });

  await executeTests();
  if(debug) {
    return;
  }
  rm('test.js');
}