'use babel'

import * as monaco from '../dist/app.bundle.js';

export default snippets = {


  loadAsync(func) {
    return new Promise((resolve) => func(resolve));
  },

  async loadAll(module) {
    const loaders = [
      module.loadBundledSnippets,
      module.loadUserSnippets,
      module.loadPackageSnippets,
    ];

    const snippetSet = await Promise.all(
      loaders.map(l => this.loadAsync(l.bind(module)))
    );
    const allSnippets = {};
    for (let snippets of snippetSet) {
      for (let [file, value] of Object.entries(snippets)) {
        allSnippets[file] = value;
      }
    }

    const allLangSpittest = {};
    for (var [, file] of Object.entries(allSnippets)) {
      for (let [lang, snippets] of Object.entries(file)) {

        let grammars = lang.split(',').map((l) => l.trim());
        let grammar = grammars[0].split('.');

        if (grammar[1] != 'source') {
          continue;
        }
        lang = grammar.pop();
        if (lang == 'js') {
          lang = 'javascript';
        }
        if (!allLangSpittest[lang]) {
          allLangSpittest[lang] = [];
        }
        const monacoSnippets = this.toMonacoSnippets(snippets);

        allLangSpittest[lang].push(...monacoSnippets);
      }
    }

    return allLangSpittest;
  },

  activate(thePackage) {
    this.loadAll(thePackage.mainModule).then((allLangSpittest) => {
      for (let [lang, snippets] of Object.entries(allLangSpittest)) {
        this.registerSnippet(lang, snippets);
      }
    });
  },

  toMonacoSnippets(atomSnippets) {
    const snippets = [];

    for (let [name, atomSnippet] of Object.entries(atomSnippets)) {
      const snippet = {
        label: atomSnippet.prefix,
        kind: monaco.languages.CompletionItemKind.Snippet, //???
        documentation: name,
        insertText: atomSnippet.body,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      }
      snippets.push(snippet);
    }
    return snippets;
  },

  registerSnippet(lang, snippets) {
    monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems: () => {
        return {
          suggestions: snippets
        };
      }
    });
  }

}
