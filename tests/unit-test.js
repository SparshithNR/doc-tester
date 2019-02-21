const describe = QUnit.module;
const it = QUnit.test;
const done = QUnit.testDone;
const { parseFile, parseImport, getAssertionComponents, getCode, getAssertion, checkDupAndAddToList, parseCode, checkIfJS, gaurdSingleQuote } = require('../lib/util');
const fixture = require('fixturify');
const rm = require('rimraf').sync;
const { runTest } = require('../index');

describe('Util:', () => {
  describe('parseImport', () => {
    it('simple import', assert => {
      let importsArray = parseImport(`import a from './my-module';`);
      assert.deepEqual(importsArray, [`import a from './my-module';`]);
    });
    it('deep destructured import', assert => {
      let importsArray = parseImport(`import foo, { bar: { a } } from 'my-module';`);
      assert.deepEqual(importsArray, [`import foo, { bar: { a } } from 'my-module';`]);
    });
    it('skips import used as a non keyword', assert => {
      let result = parseImport(`//lets import some libraries`);
      assert.equal(result, `//lets import some libraries`);
    });
  });
  describe('getAssertion', () => {
    it('equals', assert => {
      let assertionCode = getAssertion({ code: 'foo(a)', assertion: 'equals', expected: 'a'});
      assert.equal(assertionCode, `it('foo(a)', assert => { assert.equal(foo(a), a); });\n`);
    });
    it('not-equals', assert => {
      let assertionCode = getAssertion({ code: 'foo(a)', assertion: 'not-equals', expected: 'a'});
      assert.equal(assertionCode, `it('foo(a)', assert => { assert.notEqual(foo(a), a); });\n`);
    });
    it('throws', assert => {
      let assertionCode = getAssertion({ code: 'foo(a)', assertion: 'throws'});
      assert.equal(assertionCode, `it('foo(a)', assert => { assert.throws(() => { throw foo(a) }, 'Throws error'); });\n`);
    });
    it('non listed', assert => {
      let assertionCode = getAssertion({ code: 'foo(a)', assertion: 'expect'});
      assert.equal(assertionCode, `\n`);
    });
    it('code with \'', assert => {
      let assertionCode = getAssertion({ code: "foo(a, 'b')", assertion: 'equals', expected: 'a'});
      assert.equal(assertionCode, `it('foo(a, \\'b\\')', assert => { assert.equal(foo(a, 'b'), a); });\n`);
    });
  });
  describe('getAssertionComponents', () => {
    it('simple parsing', assert => {
      let assertionObject = getAssertionComponents(`foo(a) // equals: a;`);
      assert.deepEqual(assertionObject, { code: 'foo(a)', assertion: 'equals', expected: 'a'});
    });
    it('additional comments', assert => {
      let assertionObject = getAssertionComponents(`foo(a) // equals: a;sample comment`);
      assert.deepEqual(assertionObject, { code: 'foo(a)', assertion: 'equals', expected: 'a'});
    });
    it('throw assertion', assert => {
      let assertionObject = getAssertionComponents(`foo(a) // throws;`);
      assert.deepEqual(assertionObject, { code: 'foo(a)', assertion: 'throws', expected: undefined });
    });
    it('not-equals assertion', assert => {
      let assertionObject = getAssertionComponents(`foo(a) // not-equals: 2;`);
      assert.deepEqual(assertionObject, { code: 'foo(a)', assertion: 'not-equals', expected: '2' });
    });
    it(`doesn't match random comments`, assert => {
      let assertionObject = getAssertionComponents(`foo(a) // test comment;`);
      assert.equal(assertionObject, null);
    });
  });
  describe('parseFile', () => {
    fixture.writeSync('fixture', {
      'README.md':
      `\`\`\`js\nimport foo from './foo';\nfoo(a); // equals: 1;\n\`\`\``,
      'README_2.md':
      `\`\`\`js\nimport foo from './foo';\nfoo(a); // equals: 1;\n\`\`\`\n \`\`\`js\nimport foo from './foo';\nfoo(a); // not-equals: 1;\n\`\`\``,
      'sample.js':`import foo from './foo';
      foo(a); // equals: 1;`,
      'empty.md': ``
    });
    it('simple parsing', assert => {
      let { codeArray, importsArray } = parseFile('./fixture/README.md');
      assert.deepEqual(codeArray, [`foo(a); // equals: 1;`]);
      assert.deepEqual(importsArray, [`import foo from './foo';`]);
    });
    it('parses two blocks of code with duplicate imports', assert => {
      let { codeArray, importsArray } = parseFile('./fixture/README_2.md');
      assert.deepEqual(codeArray, [`foo(a); // equals: 1;`, `foo(a); // not-equals: 1;`]);
      assert.deepEqual(importsArray, [`import foo from './foo';`]);
    });
    it('non .md file', assert => {
      assert.throws(() => { parseFile('./fixture/sample.js'); }, function(err) {
        return err.message == `.js is not yet supported. If you have ideas feel free to create PR`;
      });
    });
    it('invalid path', assert => {
      assert.throws( () => { parseFile('./fixture/invalidFile.md'); },function (err) {
        return err.message == `Path ./fixture/invalidFile.md doesn't exist`;
      });
    });
    it(`empty .md file`, assert => {
      let { codeArray, importsArray } = parseFile('./fixture/empty.md');
      assert.deepEqual(codeArray, []);
      assert.deepEqual(importsArray, []);
      done(() => {
        rm('fixture');
      });
    });
  });
  describe('getCode', () => {
    it('simple code', assert => {
      let code = getCode([`foo(a) // equals: 1;`],[`import foo from './foo';`], 'README.md');
      assert.equal(code.replace(/\s/g, ''), `\"use strict\";\n\nvar _foo = _interopRequireDefault(require(\"./foo\"));\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nvar describe = QUnit.module;\nvar it = QUnit.test;\ndescribe('README.md', function () {\n  it('foo(a)', function (assert) {\n    assert.equal((0, _foo.default)(a), 1);\n  });\n});`.replace(/\s/g, ''));
    });
    it('empty Readme case', assert => {
      let code = getCode([],[], 'README.md');
      assert.equal(code.replace(/\s/g, ''), `\"use strict\";\n\nvar describe = QUnit.module;\nvar it = QUnit.test;\ndescribe('README.md', function () {});`.replace(/\s/g, ''));
    });
    it('ends with non assertion code', assert => {
      let code = getCode([`foo(a) // equals: 1;`, `console.log('a')`],[`import foo from './foo';`], 'README.md');
      assert.equal(code.replace(/\s/g, ''), `\"use strict\";\n\nvar _foo = _interopRequireDefault(require(\"./foo\"));\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nvar describe = QUnit.module;\nvar it = QUnit.test;\ndescribe('README.md', function () {\n  it('foo(a)', function (assert) {\n    assert.equal((0, _foo.default)(a), 1);\n  });  console.log('a');\n});`.replace(/\s/g, ''));
    });
    it('contains non assertion code in center', assert => {
      let code = getCode([`foo(a) // equals: 1;`, `console.log('a')`, `foo(b) // equals: 3;`],[`import foo from './foo';`], 'README.md');
      assert.equal(code.replace(/\s/g, ''), `\"use strict\";\n\nvar _foo = _interopRequireDefault(require(\"./foo\"));\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nvar describe = QUnit.module;\nvar it = QUnit.test;\ndescribe('README.md', function () {\n  it('foo(a)', function (assert) {\n    assert.equal((0, _foo.default)(a), 1);\n  });  console.log('a');\n  it('foo(b)', function (assert) {\n  assert.equal((0, _foo.default)(b), 3);\n });\n});`.replace(/\s/g, ''));
    });
  });
  describe('checkDupAndAddToList', () => {
    it('removes duplicates', assert => {
      assert.deepEqual(checkDupAndAddToList([1, 2, 3], [2, 3, 4]), [1, 2, 3, 4]);
    });
    it('return concatinated array if no duplicates', assert => {
      assert.deepEqual(checkDupAndAddToList([1, 2, 3], [4, 5, 6]), [1, 2, 3, 4, 5, 6]);
    });
  });
  describe('parseCode', () => {
    it('Returns imports', assert => {
      let { tempCodeLines, tempImportArray } = parseCode(`import foo, { bar: { a } } from 'my-module';`);
      assert.deepEqual(tempImportArray, [`import foo, { bar: { a } } from 'my-module';`]);
      assert.deepEqual(tempCodeLines, []);
    });
    it('Returns simple codelines', assert => {
      let { tempCodeLines, tempImportArray } = parseCode(`add(a,b);`);
      assert.deepEqual(tempImportArray, []);
      assert.deepEqual(tempCodeLines, [`add(a,b);`]);
    });
    it('Returns multiline codelines', assert => {
      let { tempCodeLines, tempImportArray } = parseCode(`add( { \na: 4\n }.a, b);`);
      assert.deepEqual(tempImportArray, []);
      assert.deepEqual(tempCodeLines, [`add( { a: 4 }.a, b);`]);
    });
    it('Returns multiline imports', assert => {
      let { tempCodeLines, tempImportArray } = parseCode(`import {\nsubtract\n} from './add';`);
      assert.deepEqual(tempImportArray, [`import {\nsubtract\n} from './add';`]);
      assert.deepEqual(tempCodeLines, []);
    });
  });
  describe('checkIfJS', () => {
    it('js', assert => {
      assert.ok(checkIfJS('js'), 'smallcase');
      assert.ok(checkIfJS('JS'), 'uppercase');
    });
    it('javascript', assert => {
      assert.ok(checkIfJS('javascript'), 'smallcase');
      assert.ok(checkIfJS('JAVASCRIPT'), 'uppercase');
    });
    it('camelcase', assert => {
      assert.ok(checkIfJS('javaScript'), 'capital s');
      assert.ok(checkIfJS('Javascript'), 'capital J');
      assert.ok(checkIfJS('JavaScript'), 'capital J and S');
    });
    it('No Match', assert => {
      assert.notOk(checkIfJS('java'), 'java');
      assert.notOk(checkIfJS('sh'), 'sh');
      assert.notOk(checkIfJS('JAVA'), 'JAVA');
      assert.notOk(checkIfJS('python'), 'python');
    });
  });
  describe('gaurdSingleQuote', () =>{
    it('gaurds string', assert => {
      assert.equal(gaurdSingleQuote("String's problems"), `String\\'s problems`);
    });
    it('Nothing to gaurd', assert => {
      assert.equal(gaurdSingleQuote("String problems"), `String problems`);
    });
  });
});

describe('Index', async () => {
  fixture.writeSync('tests', {
    'add.js':`exports.add = (a, b) => {
      return a + b;
    }`
  });
  describe('runTest', () => {
    it('test passes', async (assert) => {
      assert.ok(await runTest({ codeArray: ['add(3,4) // equals: 7;'], importsArray: ['import { add } from \'./tests/add\''] }));
    });
    it('test fails with error', async (assert) => {
      assert.rejects(runTest({ codeArray: ['add(3,4) // equals: 8;'], importsArray: ['import { add } from \'./tests/add\''] }), function (error) {
        rm('tests/add.js');
        return error == `Test exited with code 1`;
      }, 'threw error');
    });
  })
});