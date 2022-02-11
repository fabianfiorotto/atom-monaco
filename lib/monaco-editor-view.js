'use babel';

const fs = require('fs');
const path = require('path');
const {Emitter, CompositeDisposable} = require('atom');

require('./global')
import * as monaco from '../dist/app.bundle.js';

export default class MonacoEditorView {

  constructor(filepath) {
    this.emitter = new Emitter();
    this.subscriptions = new CompositeDisposable;
    this.filepath = filepath;

    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('monaco');
    this.element.classList.add('native-key-bindings');

    this.text = "";
    this.editor = monaco.editor.create(this.element, {
      value: this.text,
      automaticLayout: true,
      language: 'text/plain'
    });

    this.subscriptions.add(
      this.editor.onDidChangeModelContent(() => this.emitter.emit('did-change-modified'))
    );

    if (filepath) {
      this.__openFile();
    }
  }

  __openFile() {
    fs.readFile(this.filepath, 'utf8', (err, data) => {
      if(err) {
        console.log(err);
        return;
      }
      const model = monaco.editor.createModel(
        data,
        undefined, // language
        monaco.Uri.file(this.filepath) // uri
      );

      this.editor.setModel(model);

      this.text = data;
      this.editor.setValue(this.text);
    });
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove();
    this.subscriptions.dispose();
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
    return this.text && this.editor && this.text != this.editor.getValue();
  }

  save() {
    if (this.editor && this.filepath) {
      this.text = this.editor.getValue();
      fs.writeFile(this.filepath, this.text, (err) => {
        if(err) {
          console.log(err);
          return;
        }
        this.emitter.emit('did-change-modified');
      });
    }
  }

  setText() {
    return this.editor.getValue();
  }

  setText(text, options) {
    this.editor.setValue(text);
  }

  getPath() {
    return this.filepath;
  }

  getDefaultLocation() {
    return 'center';
  }

  getAllowedLocations(){
    return ['left', 'center' ,'right'];
  }

  onDidChangeModified(cb) {
    return this.emitter.on('did-change-modified', cb);
  }

}
