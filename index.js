const fs = require('fs');
const unified = require('unified');
const markdown = require('remark-parse');
// const fixture = require('fixturify');
// const execa = require('execa');
// const rm = require('rimraf').sync;

markdownTest = () => {
  const content = fs.readFileSync('README.md', 'utf8');
  let tree = unified().use(markdown, {commonmark: true}).parse(content);
  let codeArray = [], commentArray = [], importsArray = [];
  tree.children.forEach(function (element) {
    if (element.type == 'code') {
      codeArray.push(element);
    } else if(element.type == 'html' && element.value.includes('@result')) {
      commentArray.push(element);
    }
    else if(element.type == 'html' && element.value.includes('@imports')) {
      importsArray.push(element);
    }
  });
  /* fixture.writeSync('tests', {
    'test.js': getCode(codeArray, commentArray, importsArray)
  });

  (async () => {
    try {
      const { stdout } = await execa('node', [`node_modules/.bin/qunit`, `tests/test.js`]);
      console.log(stdout);
      rm('tests');
    } catch (err) {
      console.error(err.stdout);
    }
  })(); */
  runTest(codeArray, commentArray, importsArray);
}

/* function getCode(codeArray, commentArray, importsArray) {
  let fileContent = `
  const describe = QUnit.module;
  const it = QUnit.test;
  describe('Test the doc', () => {
    it('samples', assert => {
  `
  fileContent = importsArray.reduce((fileContent, element) => {
    let imports = element.value.split(' | ');
    return fileContent += `const ${imports[1]} = require('${imports[2].split('.js')[0]}');\n`;
  }, fileContent);
  fileContent = codeArray.reduce((fileContent, element) => {
    return fileContent += element.value + '\n';
  }, fileContent);
  fileContent = commentArray.reduce((fileContent, element) => {
    let expected = element.value.split(' | ');
    return fileContent +=`assert.ok(${expected[1]});\n`;
  }, fileContent);
  fileContent += `
    });
  });`
  return fileContent;
} */

function runTest(codeArray, commentArray, importsArray) {
  const Mocha = require('mocha');
  const Test = Mocha.Test;
  const Suite = Mocha.Suite;
  const mocha = new Mocha();
  const { expect } = require('chai');
  let suite =  Suite.create(mocha.suite, 'Doc Test');
  let testCode = importsArray.reduce((fileContent, element) => {
    let imports = element.value.split(' | ');
    return fileContent += `const ${imports[1]} = require('${imports[2].split('.js')[0]}');\n`;
  }, '');
  testCode = codeArray.reduce((fileContent, element) => {
    return fileContent += element.value + '\n';
  }, testCode);
  suite.addTest(new Test('Testing code snippet', () => {
    testCode = commentArray.reduce((fileContent, element) => {
      let expected = element.value.split(' | ');
      return fileContent +=`expect(${expected[1]}).to.be.true;\n`;
    }, testCode);
    eval(testCode);
  }));
  mocha.run();
}

markdownTest();