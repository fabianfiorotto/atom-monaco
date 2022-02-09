'use babel';

require('./global')
import * as monaco from '../dist/app.bundle.js';

export default class MonacoView {

  constructor() {
    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('monaco');
    this.element.classList.add('native-key-bindings');

    setTimeout(() => {
      monaco.editor.create(this.element, {
        value: ['function x() {', '\tconsole.log("Hello world!");', '}'].join('\n'),
        language: 'javascript'
      });
    }, 200);
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
    return "Monaco";
  }

  getDefaultLocation() {
    return 'center';
  }

  getAllowedLocations(){
    return ['left', 'center' ,'right'];
  }

}
