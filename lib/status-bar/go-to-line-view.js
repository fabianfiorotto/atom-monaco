'use babel';


/**
 * See as reference
 * https://github.com/atom/status-bar/blob/master/lib/cursor-position-view.coffee
 */

const monacoWorkspace = require('../workspace');

export default class MonacoGoToLineView {
  constructor() {
    this.element = document.createElement('status-bar-cursor')
    this.element.classList.add('cursor-position', 'inline-block')
    this.goToLineLink = document.createElement('a')
    this.goToLineLink.classList.add('inline-block')
    this.element.appendChild(this.goToLineLink)

    this.activeItemSubscription = monacoWorkspace.onDidChangeActiveTextEditor((activeEditor) => {
      this.subscribeToActiveTextEditor()
    });

    this.formatString = atom.config.get('status-bar.cursorPositionFormat') || '%L:%C'

    this.element.addEventListener('click', () => {
      this.scheduleUpdate();
    })

    this.subscribeToConfig()
    this.subscribeToActiveTextEditor()

    this.tooltip = atom.tooltips.add(this.element, {title: () => `Line #{this.row}, Column #{this.column}`})

    this.handleClick();
  }

  destroy() {
    this.activeItemSubscription.dispose()
    if(this.cursorSubscription) this.cursorSubscription.dispose()
    this.tooltip.dispose()
    this.configSubscription.dispose()
  }

  subscribeToActiveTextEditor() {
    if (this.cursorSubscription) this.cursorSubscription.dispose();
    let editor = monacoWorkspace.getActiveTextEditor();
    if (editor) {
      this.cursorSubscription = editor.onDidChangeCursorPosition(()=> this.scheduleUpdate());
    }
    this.scheduleUpdate();
  }


  subscribeToConfig() {
     this.configSubscription = atom.config.observe('status-bar.cursorPositionFormat', (value) =>{
       this.formatString = value ? value : '%L:%C';
       this.scheduleUpdate()
     })
  }

  handleClick() {
    this.goToLineLink.addEventListener('click', () => {
      editor = monacoWorkspace.getActiveTextEditor();
      editor.runAction('editor.action.gotoLine');
    });
  }

  scheduleUpdate() {
    let position;
    let editor = monacoWorkspace.getActiveTextEditor();
    if (editor) {
      position = editor.getCursorBufferPosition();
    }
    if (editor && position) {
      this.row = position.row + 1
      this.column = position.column + 1
      this.goToLineLink.textContent = this.formatString.replace('%L', this.row).replace('%C', this.column)
      this.element.classList.remove('hide')
    }
    else {
      this.goToLineLink.textContent = ''
      this.element.classList.add('hide')
    }
  }

}
