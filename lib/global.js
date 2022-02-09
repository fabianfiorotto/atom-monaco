const path = require('path');
window.atomMonacoResourceBasePath = path.dirname(require.resolve("../dist/app.bundle.js")) + '/';
