'use babel';

/**
 * See as reference
 * https://github.com/atom/atom/blob/master/src/workspace.js
 */

import MonacoEditorView from './monaco-editor-view';

const {Emitter} = require('atom');

export default workspace = {

  init() {
    this.emitter = new Emitter();

    atom.workspace.onDidChangeActivePaneItem( (item) => {
      if (atom.workspace.getActivePaneContainer() !== atom.workspace.getCenter()) {
        return;
      }
      let hadActiveTextEditor = this.hasActiveTextEditor;
      this.hasActiveTextEditor = item instanceof MonacoEditorView;
      if (this.hasActiveTextEditor || hadActiveTextEditor) {
        this.emitter.emit('did-change-active-text-editor', item);
      }
    });

    atom.workspace.onDidAddPaneItem(({ item, pane, index }) => {
      if (item instanceof MonacoEditorView) {
        this.emitter.emit('did-add-text-editor', {
          textEditor: item,
          pane,
          index
        });
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

  getTextEditors() {
    return atom.workspace.getPaneItems().filter(item => item instanceof MonacoEditorView);
  },

  onDidChangeActiveTextEditor(cb) {
    return this.emitter.on('did-change-active-text-editor', cb);
  },

  onDidAddTextEditor(callback) {
    return this.emitter.on('did-add-text-editor', callback);
  },

  observeActiveTextEditor(callback) {
    callback(this.getActiveTextEditor());

    return this.onDidChangeActiveTextEditor(callback);
  },

  observeTextEditors(callback) {
    for (let textEditor of this.getTextEditors()) {
      callback(textEditor);
    }
    return this.onDidAddTextEditor(({ textEditor }) => callback(textEditor));
  },
};

workspace.init();
