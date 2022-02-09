'use babel';

import './global';
import MonacoView from './monaco-view';
import { CompositeDisposable } from 'atom';

export default {

  subscriptions: null,

  activate(state) {

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(atom.workspace.addOpener( (uri,options) => {
      if (uri == 'monaco://editor') {
        let monacoView = new MonacoView(state.monacoViewState);
        return monacoView;
      }
    }));

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'monaco:toggle': () => this.toggle(),
      'monaco:activate': () => {}
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  serialize() {
    return {
      // monacoViewState: this.monacoView.serialize()
    };
  },

  toggle() {
    atom.workspace.open('monaco://editor');
  }

};
