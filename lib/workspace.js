'use babel';

import MonacoEditorView from './monaco-editor-view';

const {Emitter} = require('atom');

export default workspace = {

  init() {
    this.emmiter = new Emitter();

    atom.workspace.onDidChangeActivePaneItem( (item) => {
      if (atom.workspace.getActivePaneContainer() !== atom.workspace.getCenter()) {
        return;
      }
      let hadActiveTextEditor = this.hasActiveTextEditor;
      this.hasActiveTextEditor = item instanceof MonacoEditorView;
      if (this.hasActiveTextEditor || hadActiveTextEditor) {
        this.emmiter.emit('did-change-active-text-editor', item);
      }
    });
  },

  getActiveTextEditor() {
    let editor = atom.workspace.getCenter().getActivePaneItem();
    if (editor && editor instanceof MonacoEditorView) {
      return editor;
    }
    return null;
  },

  onDidChangeActiveTextEditor(cb) {
    return this.emmiter.on('did-change-active-text-editor', cb);
  },

  observeActiveTextEditor(callback) {
    callback(this.getActiveTextEditor());

    return this.onDidChangeActiveTextEditor(callback);
  }
};

workspace.init();
