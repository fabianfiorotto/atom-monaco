'use babel';

import './global';
import MonacoEditorView from './monaco-editor-view';
import MonacoGoToLineView from './status-bar/go-to-line-view';
import MonacoGrammarSelectorView from './status-bar/grammar-selector-view';
import MonacoGrammarListView from './status-bar/grammar-list-view';
import * as monaco from '../dist/app.bundle.js';
import { CompositeDisposable } from 'atom';

export default {

  subscriptions: null,

  config: {
    extensions: {
      type: 'string',
      default: '',
      title: 'Open extensions',
      description: 'Extensions separed by comma (eg: .js, .php, .html, .css)'
    },
    theme: {
      type: 'string',
      title: 'Theme',
      default: 'vs',
      enum: [
        {value: 'vs', description: 'VSCode Light'},
        {value: 'vs-dark', description: 'VSCode Dark'},
        {value: 'hc-black', description: 'High Contrast'},
      ],
    },
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
        return MonacoEditorView.openFile(uri, options);
      }
      if (uri == 'monaco://new-file') {
        return new MonacoEditorView();
      }
    }));

    monaco.editor.setTheme(atom.config.get('monaco.theme'));
    this.subscriptions.add(atom.config.observe('monaco.theme', (value) =>{
        monaco.editor.setTheme(value)
    }));

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'monaco:new-file': () => this.newFile(),
      'monaco:tree-view-open': () => this.treeViewOpen(),
      'monaco:from-current-tab': () => this.fromCurrentTab(),
      'grammar-selector:show': () => this.toggleGrammarListView(),
      'core:save': () => this.save(),
    }));
    this.goToLine = new MonacoGoToLineView();
    this.grammarSelector = new MonacoGrammarSelectorView();
  },

  consumeStatusBar(statusBar) {
    this.statusBarTile = statusBar.addLeftTile({item: this.goToLine, priority: 11});
    this.statusBarTile2 = statusBar.addRightTile({item: this.grammarSelector, priority: 11});
  },

  deactivate() {
    this.subscriptions.dispose();
    this.statusBarTile.remove();
    this.statusBarTile2.remove();
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
    atom.workspace.open('monaco://new-file');
  },

  toggleGrammarListView() {
    if (!this.grammarListView) {
      this.grammarListView = new MonacoGrammarListView();
    }
    this.grammarListView.toggle();
  },

  fromCurrentTab() {
    let editor = atom.workspace.getActiveTextEditor();
    if (editor) {
      let path = editor.getPath();
      let text = editor.getText();
      editor.destroy();
      atom.workspace.open(path, {monaco: true}).then((monacoEditor) => {
        monacoEditor.setText(text);
      });
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
