#!/usr/bin/env node
import minimist from 'minimist';
import { transformFileSync } from '@babel/core';
import { detectMissingKey, getI18nKeys, getTargetFile } from './utils';
import console from 'console';

const args = minimist(process.argv.slice(2));
const ignore: string[] = args['ignore']?.split(',') || [];
const [targetDir] = args['_'];

if (!targetDir) {
  console.error('目标文件目录不能为空。ex: pluto-escape app/javascript');
  process.exit();
}

const [targetFiles, en, cn, hk] = getTargetFile(targetDir, ignore);

const enKeys = getI18nKeys(en);
const cnKeys = getI18nKeys(cn);
const hkKeys = getI18nKeys(hk);

// process.exit()

const missingKey = (file: string, argument: any) => detectMissingKey(file, argument, [enKeys, cnKeys, hkKeys]);

let hasMissing = false;
let hasCN = false;

targetFiles.forEach((file) => {
  transformFileSync(file, {
    ast: false,
    code: false,
    plugins: [
      () => {
        return {
          visitor: {
            CallExpression: (_path: any) => {
              const node = _path.node;
              if (node.callee.type === 'Identifier' && node.callee.name === 't') {
                const missings = missingKey(file, node.arguments[0]);
                if (missings.some((_) => _ !== null)) {
                  hasMissing = true;
                  const [en, cn, hk] = missings;
                  if (en) {
                    console.error('英文缺失：', en);
                  }
                  if (cn) {
                    console.error('简体缺失：', cn);
                  }
                  if (hk) {
                    console.error('翻译缺失：', hk);
                  }
                }
              }
              _path.skip();
            },
            /**
             * 内嵌在标签中的 文本
             * <div>我是文本</div>
             */
            JSXText: (_path: any) => {
              const node = _path.node;
              const value = node.value;
              if (/\p{Unified_Ideograph}/u.test(value)) {
                hasCN = true;
                console.error('存在中文:', file, value);
              }
              _path.skip();
            },
            /**
             * 第一种 const person = { name: "大黄" }; "大黄" -> t("js.xxx.xxx.xxx")
             * 第二种 const Item = () => <Label title="全干工程师" />; "全干工程师" -> {t("js.xxx.xxx.xxx")}
             * 根据 父节点 type === JSXAttribute 判定
             */
            StringLiteral: (_path: any) => {
              const node = _path.node;
              const value = node.value;
              if (/\p{Unified_Ideograph}/u.test(value)) {
                hasCN = true;
                console.error('存在中文:', file, value);
              }
              _path.skip();
            },
            TemplateLiteral: (_path: any) => {
              const node = _path.node;
              const _hasCN = node.quasis.some((_node: any) => {
                const value = typeof _node.value === 'object' ? _node.value.cooked || _node.value.raw : _node.value;
                return /\p{Unified_Ideograph}/u.test(value);
              });
              if (_hasCN) {
                hasCN = true;
                console.error('存在中文:', file, node.quasis);
              }
              _path.skip();
            },
          },
        };
      },
    ],
  });
});
if (hasMissing) {
  process.exit(1);
}
if (hasCN) {
  process.exit(1);
}
