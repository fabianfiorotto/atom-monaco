'use babel';

import MonacoEditorView from './monaco-editor-view';


export default {

  getActiveTextEditor() {
    let editor = atom.workspace.getCenter().getActivePaneItem();
    if (editor && editor instanceof MonacoEditorView) {
      return editor;
    }
    return null;
  },

  onDidChangeActiveTextEditor(cb) {
    return atom.workspace.onDidChangeActivePaneItem( (item) => {
      if (atom.workspace.getActivePaneContainer() !== atom.workspace.getCenter()) {
        return;
      }
      let hadActiveTextEditor = this.hasActiveTextEditor;
      this.hasActiveTextEditor = item instanceof MonacoEditorView;
      if (this.hasActiveTextEditor || hadActiveTextEditor) {
        cb(item);
      }
    });
  },
  observeActiveTextEditor(callback) {
    callback(this.getActiveTextEditor());

    return this.onDidChangeActiveTextEditor(callback);
  }

}
