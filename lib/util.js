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
      if (element.type == 'code' && checkIfJS(element.lang)) {
        codeArray.push(element);
      }
    });
    let codeLines = [];
    codeArray.forEach((element) => {
      let { tempCodeLines, tempImportArray } = parseCode(element.value);
      checkDupAndAddToList(codeLines, tempCodeLines);
      checkDupAndAddToList(importsArray, tempImportArray);
    });
    return { codeArray: codeLines, importsArray: importsArray };
  }
  throw new Error(`${fileExtension} is not yet supported. If you have ideas feel free to create PR`);
}

function checkIfJS(lang) {
  const regex = /(js|javascript)/gi;
  return regex.test(lang);
}

function checkDupAndAddToList(lastValue, newValues) {
  if(lastValue.length) {
    newValues.forEach((element) => {
      if (lastValue.indexOf(element) == -1) {
        lastValue.push(element);
      }
    });
  } else {
    lastValue.push.apply(lastValue, newValues);
  }
  return lastValue;
}

function parseCode(element) {
  let codeLines = parseImport(element);
  let tempCodeLines = [], tempImportArray = [];
  let partialCode = '';
  if(codeLines.length) {
    codeLines.forEach((element, index) => {
      if (element.search('import') > -1) {
        tempImportArray.push(element);
      } else {
        if (element.match(/.*;$/) || index == codeLines.length-1) {
          partialCode += element;
          tempCodeLines.push(partialCode);
          partialCode = '';
        } else {
          partialCode += element;
        }
      }
    });
  }
  debugger
  return { tempCodeLines, tempImportArray };
}

function parseImport(element) {
  return element.match(/(import[\n\s\w{},]+from .*;?)?(.+)/g);
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
      assertionLine = `assert.throws(() => { throw ${code} }, 'Throws error');`;
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
    let assertion = getAssertionComponents(element);
    if (assertion) {
      fileContent += getAssertion(assertion);
      assertCount++;
    } else {
      fileContent += element;
    }
  });

  fileContent += `;assert.expect(${assertCount});`
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

function getAssertionComponents(element) {
  let matched = element.match(/(.*)\/\/\s(\w+-?\w+?)(:\s(.+))?;/);
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

module.exports = { parseFile, parseImport, getAssertionComponents, getCode, getAssertion, executeTests, checkDupAndAddToList, parseCode, checkIfJS };
