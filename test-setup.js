const fs = require('fs-extra');
try {
  fs.symlinkSync(__dirname, `./node_modules/doc-tester`);
} catch(err) {
  if (err.code == 'EEXIST') {
    console.log('doc-tester already symlinked to node_modules');
  } else {
    throw err;
  }
}