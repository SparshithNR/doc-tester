const execa = require('execa');
const { transformSync } = require('@babel/core');
const path = require('path');
const fs = require('fs');
const unified = require('unified');
const markdown = require('remark-parse');
const isBalanced = require('is-balanced');

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
      element = element.trim();
      if (element.match(/^import .*/)) {
        tempImportArray.push(element);
      } else {
        if (element.match(/.*;$/) || index == codeLines.length-1) {
          partialCode += element;
          tempCodeLines.push(partialCode);
          partialCode = '';
        } else {
          partialCode += element;
          if (isBalanced(partialCode, ['(', '[', '{'], [')', '}', ']'])) {
            partialCode += `\n`;
            tempCodeLines.push(partialCode);
            partialCode = '';
          }
        }
      }
    });
  }
  return { tempCodeLines, tempImportArray };
}

function parseImport(element) {
  return element.match(/(import[\n\s\w{},]+from .*;?)?(.+)/g);
}

function getAssertion({ code, assertion, expected }) {
  let assertionLine = '', argsValue = 'assert';
  if (/^await/.test(code)) {
    argsValue = 'async (assert)'
  }
  switch (assertion) {
    case 'equals':
      assertionLine = `it('${gaurdSingleQuote(code)}', ${argsValue} => { assert.equal(${code}, ${expected}); });`;
      break;
    case 'not-equals':
      assertionLine = `it('${gaurdSingleQuote(code)}', ${argsValue} => { assert.notEqual(${code}, ${expected}); });`;
      break;
    case 'deep-equal':
      assertionLine = `it('${gaurdSingleQuote(code)}', ${argsValue} => { assert.deepEqual(${code}, ${expected}); });`;
      break;
    case 'throws':
      assertionLine = `it('${gaurdSingleQuote(code)}', assert => { assert.throws(() => { throw ${code} }, 'Throws error'); });`;
      break;
    default:
      break;
  }
  return `${assertionLine}\n`;
}

function getCode(codeArray, importsArray, testName = 'Doc Test') {
  if (codeArray.length === 0) {
    console.log('No testable code found in the file');
    return false;
  }
  let fileContent = '';
  fileContent = importsArray.join('\n');
  fileContent += `
  const describe = QUnit.module;
  const it = QUnit.test;
  const regeneratorRuntime = require('regenerator-runtime');
  describe('${gaurdSingleQuote(testName)}', () => {
  `
  codeArray.forEach((element) => {
    let assertion = getAssertionComponents(element);
    if (assertion) {
      fileContent += cleanUpAssertion(getAssertion(assertion));
    } else {
      fileContent += element;
    }
    if (/.*[^;\n]$/.test(fileContent)) {
      fileContent += `;`;
    }
  });

  fileContent +=`
  });`
  const generatedCode = transformSync(fileContent, {
    "presets": [
      [ "@babel/preset-env"]
    ]
  });
  return generatedCode.code;
}

function gaurdSingleQuote(str) {
  return str.replace(/'/g, "\\'");
}

function cleanUpAssertion(element) {
  return element.replace(";", "");
}

function getAssertionComponents(element) {
  const regEx =/^(.*)\/\/\s*(?:([a-z\-]+:|throws:?))([^;]+)?(?:.*)/i;
  let matched = element.match(regEx);
  if(!matched) {
    return null;
  }
  let [, code, assertion, expected] = matched;
  let index = assertion.indexOf(':');
  if(index > -1) {
    assertion = assertion.slice(0, index);
  }
  code = code.trim().replace(/;/g, '');
  return { code: code.trim(), assertion: assertion.trim(), expected: expected ? expected.trim() : expected };
}

async function executeTests(inspect, testFile) {
  let args = [];
  if (inspect) {
    let inspectBrk = `--inspect-brk`;
    if (/\d/.test(inspect)) {
      inspectBrk += `=${inspect}`;
    }
    args.push(inspectBrk);
  }
  args.push.apply(args, [`node_modules/.bin/qunit`, `${testFile}`]);
  return new Promise ((res, rej) => {
    const child_proc = execa('node', args);
    const outStream = child_proc.stdout;
    const errStream = child_proc.stderr;
    outStream.pipe(process.stdout);
    errStream.pipe(process.stderr);
    child_proc.on('close', (exitCode) => {
      if(exitCode !=0) {
        rej(`Test exited with code ${exitCode}`);
      }
      res(true);
    });
  });
}

module.exports = { parseFile, parseImport, getAssertionComponents, getCode, getAssertion, executeTests, checkDupAndAddToList, parseCode, checkIfJS, gaurdSingleQuote };
