'use babel';

const fs = require('fs');
const path = require('path');

require('./global')
import * as monaco from '../dist/app.bundle.js';

export default class MonacoEditorView {

  constructor(filepath) {
    this.filepath = filepath;

    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('monaco');
    this.element.classList.add('native-key-bindings');

    this.text = "";
    this.editor = monaco.editor.create(this.element, {
      value: this.text,
      automaticLayout: true,
      language: 'javascript'
    });

    if (filepath) {
      this.openFile();
    }
  }

  openFile() {
    fs.readFile(this.filepath, 'utf8', (err, data) => {
      if (err) return;
      this.text = data;
      this.editor.setValue(this.text);
    });
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

  getTitle() {
    if (this.filepath) {
      return path.basename(this.filepath);
    }
    else {
      return 'untitled';
    }
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
          return console.log(err);
        }
        console.log("The file was saved!");
      });
    }
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
    return this.editor.onDidChangeModelContent(cb);
  }

}
