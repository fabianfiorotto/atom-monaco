'use babel';

import './global';
import MonacoEditorView from './monaco-editor-view';
import { CompositeDisposable } from 'atom';

export default {

  subscriptions: null,

  config: {
    extensions: {
      type: 'string',
      default: '',
      title: 'Open extensions',
      description: 'Extensions separed by comma'
    }
  },

  openExtension(uri) {
    let extensions = atom.config.get('monaco.extensions');
    if (!extensions) return false;
    extensions = extensions.split(',').map(s => s.trim());
    return extensions.some(e => uri.endsWith(e))
  },

  activate(state) {

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(atom.workspace.addOpener( (uri,options) => {
      if (options.monaco || this.openExtension(uri)) {
        let monacoView = new MonacoEditorView(uri, options);
        return monacoView;
      }
    }));

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'monaco:new-file': () => this.newFile(),
      'monaco:tree-view-open': () => this.treeViewOpen(),
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

  newFile() {
    atom.workspace.open('monaco://editor');
  },

  fromCurrentTab() {
    let editor = atom.workspace.getActiveTextEditor();
    if (editor) {
      let path = editor.getPath();
      editor.destroy();
      atom.workspace.open(path, {monaco: true});
    }
  },

  treeViewOpen() {
    var treeView = atom.packages.getActivePackage('tree-view');
    if(!treeView) return;
    treeView = treeView.mainModule.getTreeViewInstance();
    selectedPaths = treeView.selectedPaths();
    for(let path of selectedPaths) {
      atom.workspace.open(path, {monaco: true});
    }
  }
};
