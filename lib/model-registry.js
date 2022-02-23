'use babel';

import * as monaco from '../dist/app.bundle.js';

/** 
 * Track of the active editors and their models
 * required to implement split panel
 */

export default {

  fromPath(filepath, text = "") {
    const uri = monaco.Uri.file(filepath)
    let model = monaco.editor.getModel(uri);
    if (model) {
      return model;
    }
    let language = undefined; //Auto-detect.
    return monaco.editor.createModel(text, language, uri);
  },

  registerModel(editor) {
     const model = editor.getModel();
     if (!this.models) {
       this.models = new Map();
     }
     if (!this.models.has(model)) {
       this.models.set(model, new Set());
     }
     this.models.get(model).add(editor);
  },

  disposeModel(editor) {
    // BUG: Models without uri dipose with the editor.

    const model = editor.getModel();
    const editors = this.models.get(model);
    editors.delete(editor);
    if (editors.size === 0) {
      this.models.delete(model);
      model.dispose();
    }
  },

  changeModelUri(editor, filepath) {
    // TODO: preserve history.
    const model = editor.getModel();
    let newModel = this.fromPath(filepath , editor.getValue())

    const editors = this.models.get(model);
    for (let editor1 of editors) {
      editor1.setModel(newModel);
    }
    model.dispose();
    this.models.delete(model);
    this.models.set(newModel, editors);
  },

  isMultiple(editor) {
    const model = editor.getModel();
    return this.models.get(model).size > 1;
  }
}