'use babel'
/**
 * See as reference
 * https://github.com/atom/atom/blob/master/packages/grammar-selector/lib/grammar-status-view.js
 */
 const monacoWorkspace = require('../workspace');

 export default class MonacoGrammarSelectorView {
   constructor() {
     this.element = document.createElement('grammar-selector-status');
     this.element.classList.add('grammar-status', 'inline-block');
     this.grammarLink = document.createElement('a');
     this.grammarLink.classList.add('inline-block');
     this.element.appendChild(this.grammarLink);

     this.activeItemSubscription = monacoWorkspace.observeActiveTextEditor(
        this.subscribeToActiveTextEditor.bind(this)
     );

     // TODO use this config
     // this.configSubscription = atom.config.observe(
     //   'grammar-selector.showOnRightSideOfStatusBar',
     //   this.attach.bind(this)
     // );

     this.element.addEventListener('click', () => {
       atom.commands.dispatch(
         atom.views.getView(monacoWorkspace.getActiveTextEditor()),
         'grammar-selector:show'
       );
     });


   }

   subscribeToActiveTextEditor() {
     if (this.grammarSubscription) {
       this.grammarSubscription.dispose();
       this.grammarSubscription = null;
     }

     const editor = monacoWorkspace.getActiveTextEditor();
     if (editor) {
       this.grammarSubscription = editor.onDidChangeGrammar(
         this.updateGrammarText.bind(this)
       );
     }
     this.updateGrammarText();
   }

   updateGrammarText() {
     const editor = monacoWorkspace.getActiveTextEditor();
     const grammar = editor ? editor.getGrammar() : null;

     if (this.tooltip) {
       this.tooltip.dispose();
       this.tooltip = null;
     }

     if (grammar) {
       grammarName = grammar.name || grammar.scopeName;

       this.grammarLink.textContent = grammarName;
       this.grammarLink.dataset.grammar = grammarName;
       this.element.style.display = '';

       this.tooltip = atom.tooltips.add(this.element, {
         title: `File uses the ${grammarName} grammar`
       });
     } else {
       this.element.style.display = 'none';
     }
   };
 }
