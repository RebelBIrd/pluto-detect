import glob from 'glob';
import minimatch from 'minimatch';
import { MissingKeyInfo } from './interface';
import { transformFileSync } from '@babel/core';

/**
 * 获取所有需要处理的文件
 * @param dir 目标目录
 * @param ignore 忽略的文件
 * @return [待处理文件，英文翻译，中文翻译，繁体翻译]
 */
export function getTargetFile(dir: string, ignore: string[]): [string[], string[], string[], string[]] {
  const files = glob.sync(dir);
  const enLocaleFiles: string[] = [];
  const cnLocaleFiles: string[] = [];
  const hkLocaleFiles: string[] = [];
  const matchedFiles = files.filter((file) => {
    const isIgnore = ignore.some((pattern) => minimatch(file, pattern));
    if (isIgnore) return false;

    if (/locales\/index\./.test(file)) {
      return false;
    }
    if (/^src\/locales\/en/.test(file)) {
      enLocaleFiles.push(file);
      return false;
    }
    if (/^src\/locales\/zh-CN/.test(file)) {
      cnLocaleFiles.push(file);
      return false;
    }
    if (/^src\/locales\/zh-HK/.test(file)) {
      hkLocaleFiles.push(file);
      return false;
    }
    const match = minimatch(file, '**/*.[jt]s{,x}'); // true/false
    return match;
  });
  return [matchedFiles, enLocaleFiles, cnLocaleFiles, hkLocaleFiles];
}

export function detectMissingKey(
  file: string,
  argument: any,
  keys: [string[], string[], string[]]
): [MissingKeyInfo | null, MissingKeyInfo | null, MissingKeyInfo | null] {
  if (argument.type === 'StringLiteral') {
    return keys.map((_keys) => {
      if (_keys.includes(argument.value)) {
        return null;
      }
      return {
        file: file,
        key: argument.value,
        begion: {
          line: argument.loc.start.line,
          column: argument.loc.start.column,
        },
        end: {
          line: argument.loc.end.line,
          column: argument.loc.end.column,
        },
      };
    }) as [MissingKeyInfo | null, MissingKeyInfo | null, MissingKeyInfo | null];
  }
  return [null, null, null];
}

export function getI18nKeys(files: string[]): string[] {
  let keys: string[] = [];
  files.forEach((file) => {
    transformFileSync(file, {
      ast: false,
      code: false,
      plugins: [
        () => {
          return {
            visitor: {
              ObjectExpression: (_path: any) => {
                const node = _path.node;
                const _keys = node.properties
                  .filter((_: any) => _.type === 'ObjectProperty')
                  .map((_: any) => _.key.value);
                keys = keys.concat(_keys);
                _path.skip();
              },
            },
          };
        },
      ],
    });
  });
  return keys;
}
