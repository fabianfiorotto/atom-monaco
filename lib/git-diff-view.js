'use babel';
/**
 * See as reference
 * https://github.com/atom/atom/blob/master/packages/git-diff/lib/git-diff-view.js
 */

import { CompositeDisposable } from 'atom';
import * as monaco from '../dist/app.bundle.js';

const MAX_BUFFER_LENGTH_TO_DIFF = 2 * 1024 * 1024;

export default class MonacoGitDiffView {

  constructor(editor, editorElement) {
    this.subscriptions = new CompositeDisposable();
    this.editor = editor;
    this.editorElement = editorElement;
    this.repository = null;
    this._repoSubs = null;
    this.markers = [];

    this.subscribeToRepository();
    this.subscriptions.add(
      atom.project.onDidChangePaths(this.subscribeToRepository.bind(this))
    );
  }

  async subscribeToRepository() {
    if (this._repoSubs !== null) {
      this._repoSubs.dispose();
      this.subscriptions.remove(this._repoSubs);
    }

    let editorPath = this.editor.getPath();

    this.repository = await this.repositoryForPath(editorPath);
    if (this.repository !== null) {

      this._repoSubs = new CompositeDisposable(
        this.editor.onDidStopChanging(this.updateDiffs.bind(this)),
        this.editor.onDidChangePath(this.updateDiffs.bind(this)),
        atom.commands.add(
          this.editorElement,
          'git-diff:move-to-next-diff',
          this.moveToNextDiff.bind(this)
        ),
        atom.commands.add(
          this.editorElement,
          'git-diff:move-to-previous-diff',
          this.moveToPreviousDiff.bind(this)
        ),
      );

      this.subscriptions.add(this._repoSubs);

      this.updateDiffs();
    }
    else {
      this._repoSubs = null;
    }
  }

  moveToNextDiff() {
    const cursorLineNumber = this.editor.getCursorBufferPosition().row + 1;
    let nextDiffLineNumber = null;
    let firstDiffLineNumber = null;

    for (const { newStart } of this.diffs) {
      if (newStart > cursorLineNumber) {
        if (nextDiffLineNumber == null) nextDiffLineNumber = newStart - 1;

        nextDiffLineNumber = Math.min(newStart - 1, nextDiffLineNumber);
      }

      if (firstDiffLineNumber == null) firstDiffLineNumber = newStart - 1;

      firstDiffLineNumber = Math.min(newStart - 1, firstDiffLineNumber);
    }

    // Wrap around to the first diff in the file
    if (
      atom.config.get('git-diff.wrapAroundOnMoveToDiff') &&
      nextDiffLineNumber == null
    ) {
      nextDiffLineNumber = firstDiffLineNumber;
    }

    this.moveToLineNumber(nextDiffLineNumber);
  }

  moveToPreviousDiff() {
    const cursorLineNumber = this.editor.getCursorBufferPosition().row + 1;
    let previousDiffLineNumber = null;
    let lastDiffLineNumber = null;
    for (const { newStart } of this.diffs) {
      if (newStart < cursorLineNumber) {
        previousDiffLineNumber = Math.max(newStart - 1, previousDiffLineNumber);
      }
      lastDiffLineNumber = Math.max(newStart - 1, lastDiffLineNumber);
    }

    // Wrap around to the last diff in the file
    if (
      atom.config.get('git-diff.wrapAroundOnMoveToDiff') &&
      previousDiffLineNumber === null
    ) {
      previousDiffLineNumber = lastDiffLineNumber;
    }

    this.moveToLineNumber(previousDiffLineNumber);
  }


  moveToLineNumber(lineNumber) {
    if (lineNumber !== null) {
      this.editor.setCursorBufferPosition([lineNumber, 0]);
      // this.editor.moveToFirstCharacterOfLine(); ???
    }
  }

  async repositoryForPath(goalPath) {
    for (const directory of atom.project.getDirectories()) {
      if (goalPath === directory.getPath() || directory.contains(goalPath)) {
        return atom.project.repositoryForDirectory(directory);
      }
    }
    return null;
  }

  // reference
  // https://github.com/atom/atom/blob/master/packages/git-diff/lib/git-diff-view.js
  async updateDiffs() {
    if (!this.repository || this.editor.getText().lenght < MAX_BUFFER_LENGTH_TO_DIFF) {
      return;
    }

    let markers = [];

    this.diffs = this.repository.getLineDiffs(this.editor.getPath(), this.editor.getText()) || [];

    for (const diff of this.diffs) {
      const { newStart, oldLines, newLines } = diff;
      const startRow = newStart - 1;
      const endRow = newStart + newLines - 1;

      let mark;

      if (oldLines === 0 && newLines > 0) {
        mark = this.markRange(startRow, endRow, 'git-line-added');
      } else if (newLines === 0 && oldLines > 0) {
        if (startRow < 0) {
          mark = this.markRange(0, 0, 'git-previous-line-removed');
        } else {
          mark = this.markRange(startRow, startRow + 1, 'git-line-removed');
        }
      } else {
        mark = this.markRange(startRow, endRow, 'git-line-modified');
      }

      markers.push(mark);
    }

    this.markers = this.editor.editor.deltaDecorations(this.markers, markers);
  }

  markRange(startRow, endRow, className) {
    return {
      range: new monaco.Range(startRow + 1, 1, endRow, 1),
      options: {
        isWholeLine: true,
        className: 'myContentClass',
        linesDecorationsClassName: className
      }
    };
  }
}
