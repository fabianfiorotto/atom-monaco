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

    setTimeout(() => {
      if (this.filepath) {
        this.openFile();
      }
      else {
        this.newFile();
      }
    }, 200);
  }

  openFile() {
    fs.readFile(this.filepath, 'utf8', (err, data) => {
      if (err) return;
      this.editor = monaco.editor.create(this.element, {
        value: data,
        language: 'javascript'
      });
    });
  }

  newFile() {
    this.editor = monaco.editor.create(this.element, {
      value: '',
      language: 'javascript'
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

  save() {
    if (this.editor && this.filepath) {
      fs.writeFile(this.filepath, this.editor.getValue(), (err) => {
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

}
