'use babel';

/**
 * See as reference
 * https://github.com/atom/atom/blob/master/src/text-editor.js
 */

const fs = require('fs');
const path = require('path');
const {Emitter, CompositeDisposable, File} = require('atom');

require('./global')
import * as monaco from '../dist/app.bundle.js';

const modelRegistry = require('./model-registry');
const monacoWorkspace = require('./workspace');

export default class MonacoEditorView {

  constructor(options = {}) {
    this.emitter = new Emitter();
    this.subscriptions = new CompositeDisposable();
    this.filepath = options.filepath;
    this.text = options.text || "";

    let model = options.model;
    if (this.filepath) {
      model = modelRegistry.fromPath(this.filepath, this.text);
    }
    this._subscribeToFile();

    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('monaco');
    this.element.classList.add('native-key-bindings');

    const minimap = atom.config.get('monaco.minimap');
    this.editor = monaco.editor.create(this.element, {
      value: this.text,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      minimap,
      model,
    });

    modelRegistry.registerModel(this.editor);

    this._updateOptions();
    this.subscriptions.add(atom.config.observe('editor', (fontSize) => {
      this._updateOptions();
    }));

    this.subscriptions.add(atom.config.observe('monaco.minimap', (minimap) => {
      this.editor.updateOptions({minimap});
    }));

    this.subscriptions.add(
      this.editor.onDidChangeModelContent(() => this.emitter.emit('did-change-modified'))
    );

    this.subscriptions.add(
      this.editor.onDidChangeModelLanguage(() => {
        this.emitter.emit('did-change-grammar', {});
      })
    );

    this.subscriptions.add(
      this.editor.onDidChangeCursorPosition(() => {
        let event = {};
        this.emitter.emit('did-change-cursor-position', event);
        event.position = this.getCursorBufferPosition();
      })
    )
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    let serialized = {
      deserializer: 'MonacoEditorView',
      filepath: this.filepath || null,
      language: this.editor.getModel().getLanguageId(),
      viewState: this.editor.saveViewState(), 
      text: this.text,
    };
    if (this.isModified()) {
      serialized.current_text = this.editor.getValue();
    }
    return serialized;
  }

  deserialize(data) {
    let modified = typeof data.current_text !== 'undefined';
    let fileExists = this.filepath && fs.existsSync(this.filepath);
    this.editor.getModel().setMode(data.language || 'plaintext');
    if (!modified && this.filepath && !fileExists) {
      this.destroy();
      return null;
    }
    if (modified) {
      this.setText(data.current_text);
    }
    if (fileExists) {
      try {
        this.text = fs.readFileSync(this.filepath, {encoding:'utf8', flag:'r'});
        if (!modified) {
          this.setText(this.text);
        }
      }
      catch(err) {
        console.error(err)
      }
    }
    if (data.viewState) {
      this.editor.restoreViewState(data.viewState);
    }
    return this;
  }

  // Tear down any state and detach
  destroy() {
    modelRegistry.disposeModel(this.editor);
    this.editor.dispose();
    this.element.remove();
    this.subscriptions.dispose();

    this.emitter.emit('did-destroy');
    this.emitter.clear();
  }

  shouldPromptToSave({ windowCloseRequested, projectHasPaths } = {}) {
    return this.isModified() && !modelRegistry.isMultiple(this.editor);
  }

  getElement() {
    return this.element;
  }

  copy() {
    return new MonacoEditorView({
      filepath: this.filepath,
      text: this.text,
      model: this.editor.getModel(),
    });
  }

  getTitle() {
    return this.filepath ? path.basename(this.filepath) : 'untitled';
  }

  getLongTitle() {
    if (this.getPath()) {
      const fileName = this.getFileName();

      let myPathSegments;
      const openEditorPathSegmentsWithSameFilename = [];
      const atomEditors = atom.workspace.getTextEditors();
      const monacoEditors = monacoWorkspace.getTextEditors();

      for (const textEditor of [...atomEditors, ...monacoEditors]) {
        if (textEditor.getFileName() === fileName) {
          const pathSegments = textEditor.getDirectoryPath().split(path.sep);
          // Atom's version uses tildify that requires fs-plus. Does it worth it?
          openEditorPathSegmentsWithSameFilename.push(pathSegments);
          if (textEditor === this) myPathSegments = pathSegments;
        }
      }

      if (
        !myPathSegments ||
        openEditorPathSegmentsWithSameFilename.length === 1
      )
        return fileName;

      let commonPathSegmentCount;
      for (let i = 0, { length } = myPathSegments; i < length; i++) {
        const myPathSegment = myPathSegments[i];
        if (
          openEditorPathSegmentsWithSameFilename.some(
            segments =>
              segments.length === i + 1 || segments[i] !== myPathSegment
          )
        ) {
          commonPathSegmentCount = i;
          break;
        }
      }

      return `${fileName} \u2014 ${path.join(
        ...myPathSegments.slice(commonPathSegmentCount)
      )}`;
    } else {
      return 'untitled';
    }
  }

  isModified() {
    // TODO: Performance?
    return this.text !== this.editor.getValue();
  }

  save() {
    this.saving = true;
    this.text = this.editor.getValue();
    this.file.write(this.text).then(() => {
      this.saving = false;
      this.emitter.emit('did-change-modified');
      this.emitter.emit('did-save', {path: this.filepath});
      return this.text;
    });
  }

  saveAs(filepath) {
    this.filepath = filepath;
    return this.save().then((text) => {
      modelRegistry.changeModelUri(this.editor, filepath);
      this._subscribeToFile();
      this.emitter.emit('did-change-title');
      this.emitter.emit('did-change-path');
      return text;
    });
  }

  getSaveDialogOptions() {
    return {};
  }

  getText() {
    return this.editor.getValue();
  }

  setText(text, options) {
    this.editor.setValue(text);
    this.emitter.emit('did-change-modified');
  }

  getPath() {
    return this.filepath;
  }

  getDirectoryPath() {
    const fullPath = this.getPath();
    if (fullPath) return path.dirname(fullPath);
  }

  getFileName() {
    const fullPath = this.getPath();
    if (fullPath) return path.basename(fullPath);
  }

  getURI() {
    return this.filepath;
  }

  getDefaultLocation() {
    return 'center';
  }

  getCursorBufferPosition() {
    let position = this.editor.getPosition();
    return {
      row: position.lineNumber - 1,
      column: position.column - 1
    }
  }

  setCursorBufferPosition(position) {
      let lineNumber, column;
      if (Array.isArray(position)) {
        lineNumber = position[0] + 1,
        column = position[1] + 1
      }
      else {
        lineNumber = position.row + 1,
        column = position.column + 1
      }
      this.editor.focus();
      this.editor.setPosition({lineNumber, column})
  }

  getGrammar() {
    let name = this.editor.getModel().getLanguageId();

    id = monaco.languages.getEncodedLanguageId(name)
    mod = monaco.languages.getLanguages()[id - 1];

    return {
      name: mod.aliases ? mod.aliases[0] : null,
      fileTypes: mod.extensions,
      scopeName: name
    }
  }

  getAllowedLocations(){
    return ['center'];
  }

  /**
   * Events
   */

  onDidChangeModified(cb) {
    return this.emitter.on('did-change-modified', cb);
  }

  onDidChangeTitle(cb) {
    return this.emitter.on('did-change-title', cb);
  }

  onDidChangePath(cb) {
    return this.emitter.on('did-change-path', cb);
  }

  onDidChangeCursorPosition(cb) {
    return this.emitter.on('did-change-cursor-position', cb)
  }

  onDidChangeGrammar(cb) {
    return this.emitter.on('did-change-grammar', cb)
  }

  onDidStopChanging(callback) {
    return this.editor.getModel().onDidChangeContent(callback);
  }

  onDidSave(callback) {
    return this.emitter.on('did-save', callback);
  }

  onDidDestroy(callback) {
    return this.emitter.once('did-destroy', callback);
  }

  /**
   * Custom: Code that is not part of the editor's API
   */

  _subscribeToFile() {
      if (!this.filepath) {
        return;
      }
      if (this.fileSubscriptions) {
        this.fileSubscriptions.dispose();
        this.subscriptions.remove(this.fileSubscriptions);
      }
      this.file = new File(this.filepath);
      this.fileSubscriptions = new CompositeDisposable();
      this.fileSubscriptions.add(
        this.file.onDidChange(this._handleFileChanged.bind(this)),
        this.file.onDidDelete(this._handleFileDeleted.bind(this))
      )
      this.subscriptions.add(this.fileSubscriptions);
  }

  _handleFileDeleted() {
    this.text = null;
    this.emitter.emit('did-change-modified');
  }

  _handleFileChanged() { 
    if (this.saving) {
      return;
    }
    fs.readFile(this.filepath, 'utf8', (err, data) => {
      if(err) {
        console.log(err);
        return;
      }
      const modified = this.isModified();
      if (data == this.text) {
        return;
      }
      this.text = data;
      if (!modified) {
        this.setText(data);
      }
      this.emitter.emit('did-change-modified');
    });
  }

  runAction(id) {
    this.editor.focus();
    let action = this.editor.getAction(id);
    if(action) action.run();
  }

  _updateOptions() {
    const editorConfig = atom.config.get('editor');
    this.editor.updateOptions({
      renderWhitespace:    editorConfig.showInvisibles ? "boundary" : "none",
      lineNumbers:         editorConfig.showLineNumbers ? "on" : "off",
      autoIndent:          editorConfig.autoIndent ? "advanced" : "none",
      renderIndentGuides:  editorConfig.showIndentGuide,
      wordWrap:            editorConfig.softWrap ? "on" : "off",
      lineHeight:          editorConfig.lineHeight,
      fontSize:            editorConfig.fontSize,
    });
  }

  static openFile(filepath, options = {}) {
    return new Promise((resolve, reject) => {
      fs.readFile(filepath, 'utf8', (err, data) => {
        if(err) {
          reject(err);
          return;
        }
        options.filepath = filepath;
        options.text = data;
        const editor = new MonacoEditorView(options)
        resolve(editor);
      });
    });
  }

}
