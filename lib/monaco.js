'use babel';

import './global';
import MonacoEditorView from './monaco-editor-view';
import MonacoGoToLineView from './status-bar/go-to-line-view';
import MonacoGrammarSelectorView from './status-bar/grammar-selector-view';
import MonacoGrammarListView from './status-bar/grammar-list-view';
import MonacoGitDiffView from './git-diff-view';
import * as monaco from '../dist/app.bundle.js';
import { CompositeDisposable } from 'atom';

const monacoWorkspace = require('./workspace');
const monacoSnippets = require('./snippets');
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
    minimap: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          default: true,
          title: 'Enabled'
        },
        renderCharacters: {
          type: 'boolean',
          default: true,
          title: 'Render Characters'
        },
        side: {
          type: 'string',
          title: 'Side',
          default: 'right',
          enum: [
            {value: 'right', description: 'Right'},
            {value: 'left', description: 'Left'},
          ],
        },
        scale: {
          type: 'integer',
          default: 1,
          enum: [1, 2, 3]
        }
      }
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
      if (options.monaco === false) {
        return;
      }
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

    // Git Integration
    this.diffViews = new Set();
    this.subscriptions.add(
      monacoWorkspace.observeTextEditors((editor) => {
        const diffView = new MonacoGitDiffView(editor, editor.getElement());
        this.diffViews.add(diffView);

        editor.onDidDestroy(() => {
          diffView.destroy();
          this.diffViews.delete(diffView);
        })
      })
    );

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'monaco:new-file': () => this.newFile(),
      'monaco:tree-view-open': () => this.treeViewOpen(),
      'monaco:from-current-tab': () => this.fromCurrentTab(),
      'grammar-selector:show': () => this.toggleGrammarListView(),
      'find-and-replace:show': () => this.openFind(),
      'go-to-line:toggle': () => this.openGoToLine(),
    }));
    this.subscriptions.add(atom.commands.add('.monaco', {
      'monaco:switch-back': () => this.switchBack(),
    }));
    this.goToLine = new MonacoGoToLineView();
    this.grammarSelector = new MonacoGrammarSelectorView();

    atom.packages.onDidActivatePackage( (package) => {
      if (package.name == 'snippets') {
        monacoSnippets.activate(package);
      }
    });

  },

  consumeStatusBar(statusBar) {
    this.statusBarTile = statusBar.addLeftTile({item: this.goToLine, priority: 11});
    this.statusBarTile2 = statusBar.addRightTile({item: this.grammarSelector, priority: 11});
  },

  deactivate() {
    for (const diffView of this.diffViews) diffView.destroy();
    this.diffViews.clear();

    this.subscriptions.dispose();
    this.statusBarTile.remove();
    this.statusBarTile2.remove();
  },

  serialize() {
    return {
      // monacoViewState: this.monacoView.serialize()
    };
  },

  deserializeMonacoEditorView(data) {
    let editor = new MonacoEditorView(data);
    return editor.deserialize(data);
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

  openFind() {
    const editor = monacoWorkspace.getActiveTextEditor();
    if (editor) {
      editor.runAction('actions.find');
      // Close Atom's find and replace
      atom.commands.dispatch(atom.workspace.element, 'core:cancel');
    }
  },

  openGoToLine() {
    const editor = monacoWorkspace.getActiveTextEditor();
    if (editor) {
      editor.runAction('editor.action.gotoLine');
    }
  },

  fromCurrentTab() {
    let editor = atom.workspace.getActiveTextEditor();
    if (editor) {
      let path = editor.getPath();
      let text = editor.getText();
      let cursor = editor.getCursorBufferPosition();
      editor.destroy();
      let editorPromise;
      if(path) {
        editorPromise = atom.workspace.open(path, {monaco: true});
      }
      else {
        editorPromise = atom.workspace.open('monaco://new-file');
      }
      editorPromise.then((monacoEditor) => {
        monacoEditor.setText(text);
        monacoEditor.setCursorBufferPosition(cursor);
      });
    }
  },

  switchBack() {
    let editor = monacoWorkspace.getActiveTextEditor();
    if (editor) {
      let path = editor.getPath();
      let text = editor.getText();
      let cursor = editor.getCursorBufferPosition();
      editor.destroy();
      let editorPromise;
      if(path) {
        editorPromise = atom.workspace.open(path, {monaco: false});
      }
      else {
        editorPromise = atom.workspace.open('application:new-file');
      }
      editorPromise.then((atomEditor) => {
        atomEditor.setText(text);
        atomEditor.setCursorBufferPosition(cursor);
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
