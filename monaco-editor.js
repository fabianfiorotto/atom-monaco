__webpack_public_path__ = window.atomMonacoResourceBasePath;
const monaco = require('monaco-editor');

self.MonacoEnvironment = {
	getWorkerUrl: function (moduleId, label) {
		if (label === 'json') {
			return __webpack_public_path__ + 'json.worker.bundle.js';
		}
		if (label === 'css' || label === 'scss' || label === 'less') {
			return __webpack_public_path__ + './css.worker.bundle.js';
		}
		if (label === 'html' || label === 'handlebars' || label === 'razor') {
			return __webpack_public_path__ + './html.worker.bundle.js';
		}
		if (label === 'typescript' || label === 'javascript') {
			return __webpack_public_path__ + '/ts.worker.bundle.js';
		}
		return __webpack_public_path__ + '/editor.worker.bundle.js';
	}
};

module.exports = monaco;
