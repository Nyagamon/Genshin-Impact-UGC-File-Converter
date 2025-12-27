#!/usr/bin/env node
/**
 * convert_to_json.js
 *
 * 说明：
 *  - 递归遍历指定目录（默认 ./Json）及其子孙目录
 *  - 对每个文件尝试读取为文本并解析为 JSON
 *  - 若解析成功，则将结果写入与源文件同目录、同名但扩展名为 .json 的文件
 *  - 不修改二进制无法解析的文件，会在日志中跳过
 *
 * 用法：
 *  node convert_to_json.js [目录路径]
 *  默认目录为当前工作目录下的 "Json"
 */

const fs = require('fs').promises;
const path = require('path');

// Node 环境下为浏览器版模块提供兼容的 Util 实现，并注入全局依赖
const NodeUtil = {
  async loadFile(fileOrPath) {
    if (typeof fileOrPath === 'string') {
      return await fs.readFile(fileOrPath);
    }
    if (fileOrPath instanceof Uint8Array || Buffer.isBuffer(fileOrPath)) {
      return Buffer.from(fileOrPath);
    }
    return null;
  },
  async loadFileAsText(fileOrPath) {
    if (typeof fileOrPath === 'string') return await fs.readFile(fileOrPath, { encoding: 'utf8' });
    if (fileOrPath instanceof Uint8Array || Buffer.isBuffer(fileOrPath)) return Buffer.from(fileOrPath).toString('utf8');
    return '';
  },
  base64Encode(data) { return Buffer.from(data).toString('base64'); },
  base64Decode(str) { return new Uint8Array(Buffer.from(str, 'base64')); },
  crypt(data) { const buf = Buffer.from(data); for (let i = 0; i < buf.length; i++) buf[i] = buf[i] ^ 0xE5; return new Uint8Array(buf); },
  getFileExtension(filename) { const lastDot = filename.lastIndexOf('.'); const lastSep1 = filename.lastIndexOf('/'); const lastSep2 = filename.lastIndexOf('\\'); const lastSep = Math.max(lastSep1, lastSep2); if (lastDot === -1 || (lastSep !== -1 && lastDot < lastSep)) return ''; return filename.substring(lastDot + 1).toLowerCase(); },
  getFilePath(filename) { const lastSep1 = filename.lastIndexOf('/'); const lastSep2 = filename.lastIndexOf('\\'); const lastSep = Math.max(lastSep1, lastSep2); if (lastSep === -1) return ''; return filename.substring(0, lastSep + 1); }
};

// 注入全局类以供 Tson.js 使用（这些模块位于本目录）
global.Reader = require('./Reader');
global.Writer = require('./Writer');
global.Dtype = require('./Dtype');
global.Util = NodeUtil;
const Tson = require('./Tson');

async function isTextFile(filePath) {
  // 简单判断：读取部分内容并检查是否包含 NUL 字符
  try {
    const fd = await fs.open(filePath, 'r');
    const { buffer } = await fd.read(Buffer.alloc(512), 0, 512, 0);
    await fd.close();
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === 0) return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

function tryParseJSON(text) {
  const s = text.trim();
  if (!s) return null;
  // 若以对象或数组开头，则尝试标准 JSON 解析
  if (s[0] === '{' || s[0] === '[') {
    try {
      return JSON.parse(s);
    } catch (e) {
      return null;
    }
  }
  // 有些文件以 "string:..." 前缀（你先前的文件），我们可以去掉前缀再尝试解析
  // 但那类通常不是完整 JSON，这里不强行转换
  return null;
}

async function processFile(filePath) {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return { skipped: true, reason: 'not-file' };

    const baseName = path.basename(filePath);
    const ext = NodeUtil.getFileExtension(baseName);

    // 尝试使用 Tson 解码二进制资源（gia/gil/mihoyobin）
    const tson = new Tson();
    const preloadOk = tson.preloadBtson(baseName);
    if (preloadOk) {
      // 尝试加载 dtype 文件（工作区下的 dtype 目录）
      let dtypeText = null;
      const dtypeDir = path.resolve(process.cwd(), 'dtype');
      let key = '';
      switch (tson.filetype) {
        case Tson.FileType.gia: key = 'gia'; break;
        case Tson.FileType.gil: key = 'gil'; break;
        case Tson.FileType.mihoyobin:
          switch (tson.dirtype) {
            case Tson.DirType.Beyond_BeyondGlobal: key = 'mihoyobin_BeyondGlobal'; break;
            case Tson.DirType.Beyond_Node: key = 'mihoyobin_BeyondNode'; break;
            case Tson.DirType.Beyond_Official_Blueprint_OfficialCompoundNode: key = 'mihoyobin_OfficialCompoundNode'; break;
            case Tson.DirType.Beyond_Official_OfficialPrefab: key = 'mihoyobin_OfficialPrefab'; break;
            case Tson.DirType.Beyond_Official_Struct: key = 'mihoyobin_OfficialStruct'; break;
            case Tson.DirType.Config_JsonConfig_ShortCutKey: key = 'mihoyobin_ConfigShortCutKey'; break;
            case Tson.DirType.Config_JsonConfig_SynonymsLibrary: key = 'mihoyobin_ConfigSynonymsLibrary'; break;
            case Tson.DirType.TextMap: key = 'mihoyobin_TextMap'; break;
            default: key = '';
          }
          break;
        default:
          key = '';
      }
      if (key) {
        const candidate = path.join(dtypeDir, key + '.csv');
        try {
          const s = await fs.readFile(candidate, { encoding: 'utf8' });
          dtypeText = s;
        } catch (e) {
          dtypeText = null;
        }
      }

      // 使用 Tson 进行解码
      const loadOk = await tson.loadBtson(filePath, dtypeText);
      if (!loadOk) {
        return { skipped: true, reason: 'tson-load-failed' };
      }

      const jsonObj = tson.saveJson();
      const dir = path.dirname(filePath);
      const base = path.basename(filePath, path.extname(filePath));
      const outPath = path.join(dir, base + '.json');
      await fs.writeFile(outPath, JSON.stringify(jsonObj, null, 2), { encoding: 'utf8' });
      return { converted: true, outPath };
    }

    // 回退：若为文本且可解析为 JSON，则写出
    const textLike = await isTextFile(filePath);
    if (!textLike) return { skipped: true, reason: 'binary' };
    const text = await fs.readFile(filePath, { encoding: 'utf8' });
    const parsed = tryParseJSON(text);
    if (parsed === null) return { skipped: true, reason: 'not-json-text' };
    const outDir = path.dirname(filePath);
    const outBase = path.basename(filePath, path.extname(filePath));
    const outPath = path.join(outDir, outBase + '.json');
    await fs.writeFile(outPath, JSON.stringify(parsed, null, 2), { encoding: 'utf8' });
    return { converted: true, outPath };
  } catch (e) {
    return { skipped: true, reason: 'error', error: e.message };
  }
}

async function walkAndProcess(dir, results) {
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) {
      await walkAndProcess(full, results);
    } else if (it.isFile()) {
      const res = await processFile(full);
      results.push({ file: full, res });
      // 小批量 flush 可选
    }
  }
}

async function main() {
  const arg = process.argv[2] || 'Json';
  const root = path.resolve(arg);
  console.log(`开始处理目录: ${root}`);

  try {
    const st = await fs.stat(root);
    if (!st.isDirectory()) {
      console.error('指定路径不是目录');
      process.exit(2);
    }
  } catch (e) {
    console.error('无法访问指定目录:', e.message);
    process.exit(2);
  }

  const results = [];
  await walkAndProcess(root, results);

  // 输出汇总
  let converted = 0, skipped = 0, errors = 0;
  for (const r of results) {
    if (r.res.converted) converted++;
    else skipped++;
    if (r.res.skipped && r.res.reason === 'error') errors++;
  }

  console.log('\n处理完成');
  console.log(`转换成功: ${converted}`);
  console.log(`跳过/未转换: ${skipped}`);
  if (errors) console.log(`其中出错: ${errors}`);

  // 打印详细日志（可按需注释）
  for (const r of results) {
    if (r.res.converted) {
      console.log(`[OK]  ${r.file} -> ${r.res.outPath}`);
    } else {
      console.log(`[SKIP] ${r.file} (${r.res.reason}${r.res.error ? ': ' + r.res.error : ''})`);
    }
  }
}

if (require.main === module) {
  main().catch(e => {
    console.error('执行出错:', e);
    process.exit(1);
  });
}
