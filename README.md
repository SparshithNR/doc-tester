
# DocTester

This library is used to test the code samples in the docments. Using this library you can always ensure that code samples in docments always work and avoids issues created for document update.

## Installation
```sh
npm install sparshithNR/doc-tester#master --save-dev
```
## Usage
### From commandline
```sh
node_modules/.bin/doc-tester -f fileName
```
### From code
```js
import { runTest } from 'doc-tester';
await runTest({ codeArray: ['add(3,4) // equals: 7;'], importsArray: [`import { add } from './add'`] });
```