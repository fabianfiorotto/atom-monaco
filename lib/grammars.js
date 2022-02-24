'use babel';

import * as monaco from '../dist/app.bundle.js';

export default {
  getGrammars() {
    return monaco.languages.getLanguages().map((mod) => {
        return {
          name: mod.aliases ? mod.aliases[0] : null,
          fileTypes: mod.extensions,
          scopeName: mod.id
        }
    })
  },
  assignGrammar(editor, grammar) {
    const model = editor.editor.getModel();
    monaco.editor.setModelLanguage(model, grammar.scopeName);
  }
}
