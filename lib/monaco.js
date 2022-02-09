'use babel';

import './global';
import MonacoEditorView from './monaco-editor-view';
import { CompositeDisposable } from 'atom';

export default {

  subscriptions: null,

  activate(state) {

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(atom.workspace.addOpener( (uri,options) => {
      if (uri == 'monaco://editor') {
        let monacoView = new MonacoEditorView(options.filepath);
        return monacoView;
      }
    }));

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'monaco:new-file': () => this.newFile(),
      'monaco:from-current-tab': () => this.fromCurrentTab(),
      'core:save': () => this.save(),
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  serialize() {
    return {
      // monacoViewState: this.monacoView.serialize()
    };
  },

  save() {
    let editor = atom.workspace.getActivePaneItem();
    if (editor.constructor == MonacoEditorView) {
      editor.save();
    }
  },

  fromCurrentTab() {
    let editor = atom.workspace.getActiveTextEditor();
    if (editor) {
      atom.workspace.open('monaco://editor', {filepath: editor.getPath()});
    }
  },

  newFile() {
    atom.workspace.open('monaco://editor');
  }
};
