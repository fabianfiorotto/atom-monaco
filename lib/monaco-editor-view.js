'use babel';

const fs = require('fs');
const path = require('path');
const {Emitter, CompositeDisposable} = require('atom');

require('./global')
import * as monaco from '../dist/app.bundle.js';

export default class MonacoEditorView {

  constructor(options = {}) {
    this.emitter = new Emitter();
    this.subscriptions = new CompositeDisposable();
    this.filepath = options.filepath;
    this.text = options.text || "";

    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('monaco');
    this.element.classList.add('native-key-bindings');

    this.editor = monaco.editor.create(this.element, {
      value: this.text,
      automaticLayout: true,
      language: 'text/plain'
    });

    if (this.filepath) {
      const model = monaco.editor.createModel(
        this.text,
        undefined, // language
        monaco.Uri.file(this.filepath) // uri
      );
      this.editor.getModel().dispose();
      this.editor.setModel(model);
    }

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
    return this;
  }

  // Tear down any state and detach
  destroy() {
    this.editor.getModel().dispose();
    this.editor.dispose();
    this.element.remove();
    this.subscriptions.dispose();
  }

  shouldPromptToSave({ windowCloseRequested, projectHasPaths } = {}) {
    return this.isModified();
  }

  getElement() {
    return this.element;
  }

  getTitle() {
    return this.filepath ? path.basename(this.filepath) : 'untitled';
  }

  getLongTitle() {
    return this.getTitle();
  }

  isModified() {
    // TODO: Performance?
    return this.text != this.editor.getValue();
  }

  save() {
    return new Promise((resolve, reject) => {
      this.text = this.editor.getValue();
      fs.writeFile(this.filepath, this.text, (err) => {
        if(err) {
          return reject(err);
        }
        this.emitter.emit('did-change-modified');
        resolve(this.text);
      });
    });
  }

  saveAs(filepath) {
    this.filepath = filepath;
    return this.save().then((text) => {
      this.emitter.emit('did-change-title');
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

  onDidChangeCursorPosition(cb) {
    return this.emitter.on('did-change-cursor-position', cb)
  }

  onDidChangeGrammar(cb) {
    return this.emitter.on('did-change-grammar', cb)
  }
  /**
   * Custom: Code that is not part of the editor's API
   */

  runAction(id) {
    this.editor.focus();
    let action = this.editor.getAction(id);
    if(action) action.run();
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
