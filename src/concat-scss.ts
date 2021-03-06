import * as path from 'path';
import * as sass from 'node-sass';
import * as fs from 'fs-extra';
import { assetHandler } from './asset-handler';
import { fsUtils } from './fs-utils';
import {
  iConcatOptions,
  iConcatResults,
  iParseState
} from './interfaces';
export type iConcatOptions = iConcatOptions;

let state: iParseState = null;
const ignoreStartTag = 'concat-scss-ignore-start';
const ignoreEndTag = 'concat-scss-ignore-end';

interface iPossiblePathResults {
  possiblePaths: string[];
  possibleDir: string;
}

/**
 * Class used to concatenate scss / css files into one file
 *
 * @export
 * @class ConcatScss
 */
export class ConcatScss {

  /**
   * Insert a character into a string at a specific position
   *
   * @private
   * @param {string} str
   * @param {string} char
   * @param {number} pos
   * @returns
   * @memberof ConcatScss
   */
  private insertIntoString(str: string, char: string, pos: number) {
    return [str.slice(0, pos), char, str.slice(pos)].join('');
  }


  /**
   * Get a url path of an index file that may be inside a directory
   *
   * @private
   * @param {string} dirPath
   * @param {string} importPath
   * @returns {string}
   * @memberof ConcatScss
   */
  private getIndexPathInsideDirectory(dirPath: string, 
  importPath: string): string {
    let indexPath = null;
    try{
      const stats = fs.lstatSync(dirPath);
      if(stats.isDirectory()) {
        // import statement points to directory, should be index file inside
        indexPath = (importPath[importPath.length - 1] === '/')
          ? importPath + 'index' : importPath + path.sep + 'index';
      }
    } catch(ex) {}
    return indexPath;
  }


  /**
   * Get all the possible import paths for an @import statement in a scss file
   *
   * @private
   * @param {string} line
   * @returns
   * @memberof ConcatScss
   */
  private getAllPossibleImportPaths(line: string): string[] {
    const strChar = (line.indexOf("'") > -1) ? "'" : "\"";
    let importPath 
      = line.substring(line.indexOf(strChar) + 1, line.lastIndexOf(strChar));
    if(state.removeImports[importPath]) return null;
    const dirPath = path.join(state.currentDir, importPath);
    let importIndexPath = this.getIndexPathInsideDirectory(dirPath, importPath);
    importPath = importPath.replace('.scss', '').replace('.css', '');
    const underscoreScss = 
      this.insertIntoString(importPath, '_', importPath.lastIndexOf('/') + 1);
    const possiblePaths = [ 
      underscoreScss + '.scss', 
      importPath + '.scss', 
      importPath +'.css' 
    ];
    if(importIndexPath) {
      const _index = 
        this.insertIntoString(importIndexPath, '_', 
        importIndexPath.lastIndexOf('index'));
      possiblePaths.push(_index + '.scss');
      possiblePaths.push(importIndexPath + '.scss');
      possiblePaths.push(importIndexPath + '.css');
    }
    return possiblePaths;
  }


  /**
   * Iterate each line in a scss file
   *
   * @private
   * @param {number} index
   * @param {string[]} lines
   * @param {() => void} cb
   * @returns
   * @memberof ConcatScss
   */
  private iterateLinesInFile(index: number, lines: string[], cb: () => void) {
    if(index >= lines.length) { cb(); return; }
    const line = lines[index];
    if(line.indexOf(ignoreEndTag) > -1) {
      state.ignoringLines = false;
      this.iterateLinesInFile(++index, lines, cb);
    } else if(state.ignoringLines || line.indexOf(ignoreStartTag) > -1) {
      state.ignoringLines = true;
      this.iterateLinesInFile(++index, lines, cb);
    } else if(line.indexOf('@import') > -1) {
      const possiblePaths = this.getAllPossibleImportPaths(line);
      if(possiblePaths) {
        fsUtils.fetchFileContentsFromPaths(0, possiblePaths, state, 
        (filePath, contents) => {
          if(!filePath) {
            console.log('Concat-scss warning: file not found for import: '
              + line);
          }
          if(contents) {
            state.previousDirs.push(state.currentDir);
            state.currentDir = (filePath) 
              ? path.dirname(filePath) : state.currentDir;
            this.iterateLinesInFile(0, contents.split('\n'), () => {
              state.currentDir = state.previousDirs.pop();
              this.iterateLinesInFile(++index, lines, cb);
            });
          } else {
            this.iterateLinesInFile(++index, lines, cb);
          }
        });
      } else {
        // import path must be ignored
        this.iterateLinesInFile(++index, lines, cb);
      }
    } else {
      assetHandler.parseUrlAsset(state, line, (newLine) => {
        state.output += newLine + '\n';
        this.iterateLinesInFile(++index, lines, cb);
      }); 
    }
  }


  /**
   * Reset the parse state object back to default
   *
   * @private
   * @memberof ConcatScss
   */
  private resetState(options: iConcatOptions) {
    const rootDir = (options.rootDir) ? options.rootDir : process.cwd();
    const paths = fsUtils.getAbsoluteSrcAndDestPaths(options.src, 
      options.dest, rootDir);
    state = {
      srcFile: paths.src,
      destFile: paths.dest,
      currentDir: '',
      previousDirs: [],
      output: '',
      ignoringLines: false,
      rootDir: rootDir,
      removeImports: {},
      copyAssetsToDest: (options.copyAssetsToDest) 
        ? options.copyAssetsToDest : false
    };
  }


  /**
   * Convert the remove imports from an array into an object
   *
   * @private
   * @param {string[]} imports
   * @memberof ConcatScss
   */
  private setRemoveImports(imports: string[]) {
    if(imports) {
      for(let i = 0; i < imports.length; i++) {
        state.removeImports[imports[i]] = true;
      }
    }
  }


  private compileSass(dest: string, cb: () => void) {
    const cssDest = dest.replace('.scss', '.css');
    sass.render({
      file: dest
    }, function(err, result) {
      if(err) throw err;
      fs.writeFile(cssDest, result.css.toString(), {}, function(err) {
        cb();
      });
    });
  }


  /**
   * Add auto generated comment
   *
   * @private
   * @memberof ConcatScss
   */
  private addAutoGeneratedComment() {
    const message = `/**
 * IMPORTANT: Auto generated by concat-scss. 
 * Do not make changes to this file.
 */ 

`;
    state.output = message + state.output;
  }


  /**
   * Write output to destination file
   *
   * @private
   * @param {string} dest
   * @param {boolean} outputCss
   * @param {() => void} cb
   * @memberof ConcatScss
   */
  private writeOutput(dest: string, outputCss: boolean, cb: () => void) {
    fsUtils.writeOutputToFile(state.output, dest, (err) => {
      if(err) throw err;
      if(outputCss) {
        this.compileSass(dest, () => {
          cb();
        });
      } else {
        cb();
      }
    });
  }


  /**
   * Concat multiple scss / css file contents into one file
   *
   * @param {iConcatOptions} options
   * @returns {Promise<iConcatResults>}
   * @memberof ConcatScss
   */
  concat(options: iConcatOptions): Promise<iConcatResults> {
    return new Promise((resolve, reject) => {
      if(!options.src || !options.dest) {
        reject(new Error('Please provide the src & dest options')); return;
      }
      this.resetState(options);
      this.setRemoveImports(options.removeImports);
      fsUtils.fetchFileContents(state.srcFile, (err, fileContents) => {
        if(err) throw err;
        state.currentDir = path.dirname(state.srcFile);
        this.iterateLinesInFile(0, fileContents.split('\n'), () => {
          if(options.addAutoGeneratedComment) this.addAutoGeneratedComment();
          this.writeOutput(state.destFile, options.outputCss, () => {
            resolve({
              output: state.output
            });
          });
        });
      });
    });
  }
}