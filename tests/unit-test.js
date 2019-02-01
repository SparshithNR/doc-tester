const describe = QUnit.module;
const it = QUnit.test;
const done = QUnit.testDone;
const { parseFile, parseImport, getAssertionComponenets, getCode, getAssertion, checkDupAndAddToList } = require('../lib/util');
const fixture = require('fixturify');
const rm = require('rimraf').sync;

describe('Util:', () => {
  describe('parseImport', () => {
    it('simple import', assert => {
      let importArray = [];
      let result = parseImport(`import a from './my-module';`, importArray);
      assert.equal(result, false);
      assert.deepEqual(importArray, [`import a from './my-module';`]);
    });
    it('deep destructured import', assert => {
      let importArray = [];
      let result = parseImport(`import foo, { bar: { a } } from 'my-module';`, importArray);
      assert.equal(result, false);
      assert.deepEqual(importArray, [`import foo, { bar: { a } } from 'my-module';`]);
    });
    it('skips import used as a non keyword', assert => {
      let importArray = [];
      let result = parseImport(`//lets import some libraries`, importArray);
      assert.equal(result, `//lets import some libraries`);
      assert.deepEqual(importArray, []);
    });
  });
  describe('getAssertion', () => {
    it('equals', assert => {
      let assertionCode = getAssertion({ code: 'foo(a)', assertion: 'equals', expected: 'a'});
      assert.equal(assertionCode, `assert.equal(foo(a), a);\n`);
    });
    it('not-equals', assert => {
      let assertionCode = getAssertion({ code: 'foo(a)', assertion: 'not-equals', expected: 'a'});
      assert.equal(assertionCode, `assert.notEqual(foo(a), a);\n`);
    });
    it('throws', assert => {
      let assertionCode = getAssertion({ code: 'foo(a)', assertion: 'throws'});
      assert.equal(assertionCode, `assert.throws(() => { foo(a) }, 'Throws error');\n`);
    });
    it('non listed', assert => {
      let assertionCode = getAssertion({ code: 'foo(a)', assertion: 'expect'});
      assert.equal(assertionCode, `\n`);
    });
  });
  describe('getAssertionComponenets', () => {
    it('simple parsing', assert => {
      let assertionObject = getAssertionComponenets(`foo(a) // equals: a;`);
      assert.deepEqual(assertionObject, { code: 'foo(a)', assertion: 'equals', expected: 'a'});
    });
    it('additional comments', assert => {
      let assertionObject = getAssertionComponenets(`foo(a) // equals: a;sample comment`);
      assert.deepEqual(assertionObject, { code: 'foo(a)', assertion: 'equals', expected: 'a'});
    });
    it('throw assertion', assert => {
      let assertionObject = getAssertionComponenets(`foo(a) // throws;`);
      assert.deepEqual(assertionObject, { code: 'foo(a)', assertion: 'throws', expected: undefined });
    });
    it('not-equals assertion', assert => {
      let assertionObject = getAssertionComponenets(`foo(a) // not-equals: 2;`);
      assert.deepEqual(assertionObject, { code: 'foo(a)', assertion: 'not-equals', expected: '2' });
    });
    it(`doesn't match random comments`, assert => {
      let assertionObject = getAssertionComponenets(`foo(a) // test comment;`);
      assert.equal(assertionObject, null);
    });
  });
  describe('parseFile', () => {
    fixture.writeSync('fixture', {
      'README.md':
      `\`\`\`\nimport foo from './foo';\nfoo(a); // equals: 1;\n\`\`\``,
      'README_2.md':
      `\`\`\`\nimport foo from './foo';\nfoo(a); // equals: 1;\n\`\`\`\n \`\`\`\nimport foo from './foo';\nfoo(a); // not-equals: 1;\n\`\`\``,
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
      let code = getCode([`foo(a) // equals: 1;`],[`import foo from './foo';`]);
      assert.equal(code, `\"use strict\";\n\nvar _foo = _interopRequireDefault(require(\"./foo\"));\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nvar describe = QUnit.module;\nvar it = QUnit.test;\ndescribe('Test the doc', function () {\n  it('samples', function (assert) {\n    assert.equal((0, _foo.default)(a), 1);\n    assert.expect(1);\n  });\n});`);
    });
    it('empty Readme case', assert => {
      let code = getCode([],[]);
      assert.equal(code, `\"use strict\";\n\nvar describe = QUnit.module;\nvar it = QUnit.test;\ndescribe('Test the doc', function () {\n  it('samples', function (assert) {\n    assert.expect(0);\n  });\n});`);
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
});