const execa = require('execa');
const { transformSync } = require('@babel/core');
const path = require('path');
const fs = require('fs');
const unified = require('unified');
const markdown = require('remark-parse');

function parseFile(fileName) {
  if(!fs.existsSync(fileName)) {
    throw new Error(`Path ${fileName} doesn't exist`);
  }
  let fileExtension = path.extname(fileName);
  if (fileExtension == '.md') {
    const content = fs.readFileSync(fileName, 'utf8');
    let tree = unified().use(markdown, { commonmark: true }).parse(content);
    let codeArray = [], importsArray = [];
    tree.children.forEach(function (element) {
      if (element.type == 'code') {
        codeArray.push(element);
      }
    });
    let codeLines = [];
    codeArray.reduce((codeLines, element) => {
      codeLines.push.apply(codeLines, element.value.split('\n'));
    }, codeLines);

    codeLines = codeLines.filter((element) => parseImport(element,importsArray));
    return { codeArray: codeLines, importsArray: importsArray };
  }
  throw new Error(`${fileExtension} is not yet supported. If you have ideas feel free to create PR`);
}

function parseImport(element, importsArray) {
  if(element.match(/import.*from.*;?/)) {
    importsArray.push(element);
    return false;
  }
  return element;
}

function getAssertion({ code, assertion, expected }) {
  let assertionLine = '';
  switch (assertion) {
    case 'equals':
      assertionLine = `assert.equal(${code}, ${expected});`;
      break;
    case 'not-equals':
      assertionLine = `assert.notEqual(${code}, ${expected});`;
      break;
    case 'throws':
      assertionLine = `assert.throws(() => { ${code} }, 'Throws error');`;
    default:
      break;
  }
  return `${assertionLine}\n`;
}

function getCode(codeArray, importsArray) {
  let fileContent = '', assertCount = 0;
  fileContent = importsArray.join('\n');
  fileContent += `
  const describe = QUnit.module;
  const it = QUnit.test;
  describe('Test the doc', () => {
    it('samples', assert => {
  `
  codeArray.forEach((element) => {
    let assertion = getAssertionComponenets(element);
    if (assertion) {
      fileContent += getAssertion(assertion);
      assertCount++;
    }
  });

  fileContent += `assert.expect(${assertCount});`
  fileContent +=`
    });
  });`
  const generatedCode = transformSync(fileContent, {
    "presets": [
      [ "@babel/preset-env"]
    ]
  });
  return generatedCode.code;
}

function getAssertionComponenets(element) {
  let matched = element.match(/(.*)\/\/\s(\w+)(:\s(.+))?;/);
  if(!matched) {
    return null;
  }
  let [, code, assertion, , expected] = matched;
  return { code: code.trim(), assertion: assertion.trim(), expected: expected ? expected.trim() : expected };
}

async function executeTests() {
  const { stdout } = await execa('node', [`node_modules/.bin/qunit`, `test.js`]);
  console.log(stdout);
}

module.exports = { parseFile, parseImport, getAssertionComponenets, getCode, getAssertion, executeTests};
