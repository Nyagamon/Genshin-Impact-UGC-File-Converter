/**
 * 主应用逻辑
 */

// 全局变量
let currentMode = 'decode'; // decode 或 encode
let inputFile = null;
let dtypeFile = null;
let dtypeFiles = {}; // 内置dtype文件缓存
let currentLang = 'zh';

// 翻译字典（简要）：zh / ja / en
const TRANSLATIONS = {
    zh: {
        title: '🎮 原神 UGC 文件转换器',
        subtitle: '支持 .gia / .gil / .mihoyobin ⇔ .json 格式相互转换',
        decode_title: '解码模式',
        decode_desc: '二进制 → JSON',
        encode_title: '编码模式',
        encode_desc: 'JSON → 二进制',
        file_title_input: '选择输入文件 或拖拽到此',
        file_hint_decode: '支持 .gil, .gia, .mihoyobin',
        file_hint_encode: '支持 .json',
        file_hint: '支持 .gil, .gia, .mihoyobin 或 .json',
        dtype_title: '选择 dtype 文件（可选）或拖拽到此',
        dtype_hint: '如不选择，将使用内置 dtype',
        output_label: '输出文件名（可选）',
        convert_btn: '开始转换',
        reset_btn: '重置',
        preparing: '准备转换...',
        reading_file: '正在读取文件...',
        loading_dtype: '正在加载 dtype...',
        parsing_binary: '正在解析二进制数据...',
        generating_json: '正在生成 JSON...',
        reading_json: '正在读取 JSON 文件...',
        loading_config: '正在加载配置...',
        encoding_binary: '正在编码为二进制...',
        error_no_file: '请先选择输入文件',
        error_failed: '转换失败',
        error_unrecognized_file: '无法识别的文件类型或文件路径',
        error_parse_input: '无法读取或解析输入文件',
        error_parse_json: '无法解析 JSON 文件',
        error_encoding_failed: '编码失败',
        success_downloaded: '转换成功！已下载: '
        ,
        info_header: '使用说明',
        instr_decode_title: '解码模式：',
        instr_decode: '将 .gil / .gia / .mihoyobin 文件转换为 JSON 格式',
        instr_encode_title: '编码模式：',
        instr_encode: '将 JSON 文件转换回 .gil / .gia / .mihoyobin 格式',
        instr_dtype_title: 'dtype 文件：',
        instr_dtype: '包含数据类型定义，通常会自动选择合适的 dtype',
        instr_output_title: '输出文件：',
        instr_output: '转换完成后会自动下载结果文件',
        copyright_line1: '© 2025 Genshin Impact UGC File Converter - Web版本',
        copyright_line2: '基于原 C++ 版本改编 | MIT License'
    },
    ja: {
        title: '🎮 原神 UGC ファイル コンバーター',
        subtitle: '.gia / .gil / .mihoyobin ⇔ .json の相互変換をサポート',
        decode_title: 'デコードモード',
        decode_desc: 'バイナリ → JSON',
        encode_title: 'エンコードモード',
        encode_desc: 'JSON → バイナリ',
        file_title_input: '入力ファイルを選択、またはここにドラッグ',
        file_hint_decode: '.gil, .gia, .mihoyobin に対応',
        file_hint_encode: '.json に対応',
        file_hint: '.gil, .gia, .mihoyobin または .json に対応',
        dtype_title: 'dtype ファイルを選択（任意）またはここにドラッグ',
        dtype_hint: '未選択の場合は組み込み dtype を使用します',
        output_label: '出力ファイル名（任意）',
        convert_btn: '変換開始',
        reset_btn: 'リセット',
        preparing: '変換を準備しています...',
        reading_file: 'ファイルを読み込んでいます...',
        loading_dtype: 'dtype を読み込んでいます...',
        parsing_binary: 'バイナリを解析しています...',
        generating_json: 'JSON を生成しています...',
        reading_json: 'JSON ファイルを読み込んでいます...',
        loading_config: '設定を読み込んでいます...',
        encoding_binary: 'バイナリにエンコードしています...',
        error_no_file: 'ファイルを選択してください',
        error_failed: '変換に失敗しました',
        error_unrecognized_file: 'ファイル種類またはパスを認識できません',
        error_parse_input: '入力ファイルを読み取れないか解析できません',
        error_parse_json: 'JSON ファイルを解析できません',
        error_encoding_failed: 'エンコードに失敗しました',
        success_downloaded: '変換成功！ダウンロード済: '
        ,
        info_header: '使用方法',
        instr_decode_title: 'デコードモード：',
        instr_decode: '.gil / .gia / .mihoyobin ファイルを JSON に変換します',
        instr_encode_title: 'エンコードモード：',
        instr_encode: 'JSON ファイルを .gil / .gia / .mihoyobin に変換します',
        instr_dtype_title: 'dtype ファイル：',
        instr_dtype: 'データ型定義を含み、通常は適切な dtype を自動選択します',
        instr_output_title: '出力ファイル：',
        instr_output: '変換完了後に結果ファイルが自動的にダウンロードされます',
        copyright_line1: '© 2025 Genshin Impact UGC File Converter - Web版',
        copyright_line2: '元の C++ バージョンに基づく | MIT License'
    },
    en: {
        title: '🎮 Genshin UGC File Converter',
        subtitle: 'Supports .gia / .gil / .mihoyobin ⇔ .json conversions',
        decode_title: 'Decode',
        decode_desc: 'Binary → JSON',
        encode_title: 'Encode',
        encode_desc: 'JSON → Binary',
        file_title_input: 'Select input file or drag here',
        file_hint_decode: 'Supports .gil, .gia, .mihoyobin',
        file_hint_encode: 'Supports .json',
        file_hint: 'Supports .gil, .gia, .mihoyobin or .json',
        dtype_title: 'Select dtype file (optional) or drag here',
        dtype_hint: 'If not selected, built-in dtype will be used',
        output_label: 'Output filename (optional)',
        convert_btn: 'Convert',
        reset_btn: 'Reset',
        preparing: 'Preparing...',
        reading_file: 'Reading file...',
        loading_dtype: 'Loading dtype...',
        parsing_binary: 'Parsing binary...',
        generating_json: 'Generating JSON...',
        reading_json: 'Reading JSON file...',
        loading_config: 'Loading config...',
        encoding_binary: 'Encoding to binary...',
        error_no_file: 'Please select an input file first',
        error_failed: 'Conversion failed',
        error_unrecognized_file: 'Unrecognized file type or path',
        error_parse_input: 'Cannot read or parse input file',
        error_parse_json: 'Cannot parse JSON file',
        error_encoding_failed: 'Encoding failed',
        success_downloaded: 'Success! Downloaded: '
        ,
        info_header: 'Usage',
        instr_decode_title: 'Decode:',
        instr_decode: 'Convert .gil / .gia / .mihoyobin files to JSON',
        instr_encode_title: 'Encode:',
        instr_encode: 'Convert JSON files back to .gil / .gia / .mihoyobin formats',
        instr_dtype_title: 'dtype file:',
        instr_dtype: 'Contains data type definitions; a suitable dtype is usually auto-selected',
        instr_output_title: 'Output file:',
        instr_output: 'Result will be automatically downloaded after conversion',
        copyright_line1: '© 2025 Genshin Impact UGC File Converter - Web',
        copyright_line2: 'Adapted from original C++ version | MIT License'
    }
};

function detectDefaultLang() {
    try {
        const nav = navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language || 'zh';
        if (!nav) return 'zh';
        const code = nav.toLowerCase();
        if (code.startsWith('ja')) return 'ja';
        if (code.startsWith('zh')) return 'zh';
        return 'en';
    } catch (e) {
        return 'zh';
    }
}

function applyLanguage(lang) {
    currentLang = lang;
    // 更新 html lang 属性
    try { document.documentElement.lang = (lang === 'zh') ? 'zh-CN' : (lang === 'ja' ? 'ja' : 'en'); } catch (e) {}

    // 替换所有 data-i18n 文本
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const txt = (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS['en'][key] || el.textContent;
        el.textContent = txt;
    });

    // 调整 mode 相关 file hint
    if (currentMode === 'decode') {
        fileHintEl.textContent = TRANSLATIONS[lang].file_hint_decode || TRANSLATIONS['en'].file_hint_decode;
    } else {
        fileHintEl.textContent = TRANSLATIONS[lang].file_hint_encode || TRANSLATIONS['en'].file_hint_encode;
    }
}

function t(key) {
    return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) || key;
}

// DOM 元素
const decodeBtn = document.getElementById('decodeBtn');
const encodeBtn = document.getElementById('encodeBtn');
const inputFileEl = document.getElementById('inputFile');
const dtypeFileEl = document.getElementById('dtypeFile');
const fileNameEl = document.getElementById('fileName');
const dtypeNameEl = document.getElementById('dtypeName');
const fileHintEl = document.getElementById('fileHint');
const dtypeWrapperEl = document.getElementById('dtypeWrapper');
const outputNameEl = document.getElementById('outputName');
const convertBtn = document.getElementById('convertBtn');
const resetBtn = document.getElementById('resetBtn');
const progressEl = document.getElementById('progress');
const progressBarEl = document.getElementById('progressBar');
const progressTextEl = document.getElementById('progressText');
const resultEl = document.getElementById('result');
const resultMessageEl = document.getElementById('resultMessage');
const errorEl = document.getElementById('error');
const errorMessageEl = document.getElementById('errorMessage');

// 事件监听
decodeBtn.addEventListener('click', () => setMode('decode'));
encodeBtn.addEventListener('click', () => setMode('encode'));
inputFileEl.addEventListener('change', handleInputFileChange);
dtypeFileEl.addEventListener('change', handleDtypeFileChange);
convertBtn.addEventListener('click', handleConvert);
resetBtn.addEventListener('click', handleReset);

// 语言选择
const langSelectEl = document.getElementById('langSelect');
if (langSelectEl) {
    langSelectEl.addEventListener('change', () => applyLanguage(langSelectEl.value));
}

// 拖拽上传支持
const inputDropArea = document.getElementById('inputDropArea');
const dtypeDropArea = document.getElementById('dtypeDropArea');

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(area) {
    area.classList.add('dragover');
}
function unhighlight(area) {
    area.classList.remove('dragover');
}

if (inputDropArea) {
    ['dragenter', 'dragover'].forEach(event => {
        inputDropArea.addEventListener(event, e => { preventDefaults(e); highlight(inputDropArea); });
    });
    ['dragleave', 'drop'].forEach(event => {
        inputDropArea.addEventListener(event, e => { preventDefaults(e); unhighlight(inputDropArea); });
    });
    inputDropArea.addEventListener('drop', e => {
        preventDefaults(e);
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            inputFileEl.files = e.dataTransfer.files;
            handleInputFileChange({ target: inputFileEl });
        }
    });
}

if (dtypeDropArea) {
    ['dragenter', 'dragover'].forEach(event => {
        dtypeDropArea.addEventListener(event, e => { preventDefaults(e); highlight(dtypeDropArea); });
    });
    ['dragleave', 'drop'].forEach(event => {
        dtypeDropArea.addEventListener(event, e => { preventDefaults(e); unhighlight(dtypeDropArea); });
    });
    dtypeDropArea.addEventListener('drop', e => {
        preventDefaults(e);
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            dtypeFileEl.files = e.dataTransfer.files;
            handleDtypeFileChange({ target: dtypeFileEl });
        }
    });
}

// 初始化
init();

function init() {
    setMode('decode');
    loadBuiltinDtypes();
    // 语言初始化：根据浏览器区域选择默认语言
    const def = detectDefaultLang();
    if (langSelectEl) { langSelectEl.value = def; }
    applyLanguage(def);
}

/**
 * 设置模式
 */
function setMode(mode) {
    currentMode = mode;
    
    if (mode === 'decode') {
        decodeBtn.classList.add('active');
        encodeBtn.classList.remove('active');
        inputFileEl.accept = '.gil,.gia,.mihoyobin';
        // 更新输入文件提示为当前语言的解码提示
        if (fileHintEl) fileHintEl.textContent = t('file_hint_decode');
        dtypeWrapperEl.style.display = 'block';
    } else {
        decodeBtn.classList.remove('active');
        encodeBtn.classList.add('active');
        inputFileEl.accept = '.json';
        // 更新输入文件提示为当前语言的编码提示
        if (fileHintEl) fileHintEl.textContent = t('file_hint_encode');
        dtypeWrapperEl.style.display = 'none';
    }
    
    handleReset();
}

/**
 * 处理输入文件变化
 */
function handleInputFileChange(e) {
    inputFile = e.target.files[0];
    
    if (inputFile) {
        fileNameEl.textContent = `已选择: ${inputFile.name}`;
        fileNameEl.classList.add('show');
        convertBtn.disabled = false;
        
        // 自动设置输出文件名
        const baseName = inputFile.name.substring(0, inputFile.name.lastIndexOf('.'));
        if (currentMode === 'decode') {
            outputNameEl.placeholder = `${baseName}.json`;
        } else {
            const ext = getOutputExtension();
            outputNameEl.placeholder = `${baseName}.${ext}`;
        }
    } else {
        fileNameEl.classList.remove('show');
        convertBtn.disabled = true;
    }
    
    hideMessages();
}

/**
 * 处理dtype文件变化
 */
function handleDtypeFileChange(e) {
    dtypeFile = e.target.files[0];
    
    if (dtypeFile) {
        dtypeNameEl.textContent = `已选择: ${dtypeFile.name}`;
        dtypeNameEl.classList.add('show');
    } else {
        dtypeNameEl.classList.remove('show');
    }
    
    hideMessages();
}

/**
 * 获取输出文件扩展名
 */
function getOutputExtension() {
    // 从JSON文件中读取filetype
    return 'mihoyobin'; // 默认
}

/**
 * 主转换函数
 */
async function handleConvert() {
    if (!inputFile) {
        showError(t('error_no_file'));
        return;
    }
    
    hideMessages();
    showProgress(t('preparing'));
    convertBtn.disabled = true;
    
    try {
        if (currentMode === 'decode') {
            await convertDecode();
        } else {
            await convertEncode();
        }
    } catch (error) {
        console.error('转换错误:', error);
        showError(`${t('error_failed')}: ${error.message}`);
    } finally {
        hideProgress();
        convertBtn.disabled = false;
    }
}

/**
 * 解码：二进制 → JSON
 */
async function convertDecode() {
    showProgress(t('reading_file'));
    
    const tson = new Tson();
    
    // 预加载文件类型
    if (!tson.preloadBtson(inputFile.name)) {
        throw new Error(t('error_unrecognized_file'));
    }
    
    showProgress(t('loading_dtype'));
    
    // 获取dtype文本
    let dtypeText = null;
    if (dtypeFile) {
        dtypeText = await Util.loadFileAsText(dtypeFile);
    } else {
        // 使用内置dtype
        dtypeText = await getBuiltinDtype(tson.filetype, tson.dirtype);
    }
    
    showProgress(t('parsing_binary'));
    
    // 加载并转换
    if (!await tson.loadBtson(inputFile, dtypeText)) {
        throw new Error(t('error_parse_input'));
    }
    
    showProgress(t('generating_json'));
    
    // 导出JSON
    const jsonObj = tson.saveJson();
    const jsonStr = JSON.stringify(jsonObj, null, 2);
    
    // 下载
    const outputName = outputNameEl.value || outputNameEl.placeholder;
    const blob = new Blob([jsonStr], { type: 'application/json' });
    Util.downloadFile(blob, outputName);
    
    showSuccess(t('success_downloaded') + outputName);
}

/**
 * 编码：JSON → 二进制
 */
async function convertEncode() {
    showProgress(t('reading_json'));
    
    const jsonText = await Util.loadFileAsText(inputFile);
    const jsonObj = JSON.parse(jsonText);
    
    const tson = new Tson();
    
    showProgress(t('loading_config'));
    
    if (!tson.loadJson(jsonObj)) {
        throw new Error(t('error_parse_json'));
    }
    
    showProgress(t('encoding_binary'));
    
    const binaryData = tson.saveBtson();
    if (!binaryData) {
        throw new Error(t('error_encoding_failed'));
    }
    
    // 确定输出文件名
    let outputName = outputNameEl.value;
    if (!outputName) {
        const ext = Tson._toString(tson.filetype, true);
        const baseName = inputFile.name.substring(0, inputFile.name.lastIndexOf('.'));
        outputName = `${baseName}.${ext}`;
    }
    
    // 下载
    Util.downloadFile(binaryData, outputName);
    
    showSuccess(t('success_downloaded') + outputName);
}

/**
 * 重置表单
 */
function handleReset() {
    inputFile = null;
    dtypeFile = null;
    inputFileEl.value = '';
    dtypeFileEl.value = '';
    fileNameEl.classList.remove('show');
    dtypeNameEl.classList.remove('show');
    outputNameEl.value = '';
    convertBtn.disabled = true;
    hideMessages();
}

/**
 * 显示进度
 */
function showProgress(message) {
    progressTextEl.textContent = message;
    progressEl.style.display = 'block';
    
    // 简单的进度动画
    let width = 0;
    const interval = setInterval(() => {
        if (width >= 90) {
            clearInterval(interval);
        } else {
            width += 10;
            progressBarEl.style.width = width + '%';
        }
    }, 100);
}

/**
 * 隐藏进度
 */
function hideProgress() {
    progressEl.style.display = 'none';
    progressBarEl.style.width = '0%';
}

/**
 * 显示成功消息
 */
function showSuccess(message) {
    resultMessageEl.textContent = message;
    resultEl.style.display = 'block';
    errorEl.style.display = 'none';
}

/**
 * 显示错误消息
 */
function showError(message) {
    errorMessageEl.textContent = message;
    errorEl.style.display = 'block';
    resultEl.style.display = 'none';
}

/**
 * 隐藏所有消息
 */
function hideMessages() {
    resultEl.style.display = 'none';
    errorEl.style.display = 'none';
}

/**
 * 加载内置dtype文件
 */
async function loadBuiltinDtypes() {
    // 这里应该加载内置的dtype文件
    // 由于我们没有实际的dtype文件，这里使用空对象
    dtypeFiles = {
        'gia': '',
        'gil': '',
        'mihoyobin_BeyondGlobal': '',
        'mihoyobin_BeyondNode': '',
        'mihoyobin_OfficialCompoundNode': '',
        'mihoyobin_OfficialPrefab': '',
        'mihoyobin_OfficialStruct': '',
        'mihoyobin_ConfigShortCutKey': '',
        'mihoyobin_ConfigSynonymsLibrary': '',
        'mihoyobin_TextMap': ''
    };
}

/**
 * 获取内置dtype
 */
async function getBuiltinDtype(filetype, dirtype) {
    let key = '';
    
    switch (filetype) {
        case Tson.FileType.gia:
            key = 'gia';
            break;
        case Tson.FileType.gil:
            key = 'gil';
            break;
        case Tson.FileType.mihoyobin:
            switch (dirtype) {
                case Tson.DirType.Beyond_BeyondGlobal:
                    key = 'mihoyobin_BeyondGlobal';
                    break;
                case Tson.DirType.Beyond_Node:
                    key = 'mihoyobin_BeyondNode';
                    break;
                case Tson.DirType.Beyond_Official_Blueprint_OfficialCompoundNode:
                    key = 'mihoyobin_OfficialCompoundNode';
                    break;
                case Tson.DirType.Beyond_Official_OfficialPrefab:
                    key = 'mihoyobin_OfficialPrefab';
                    break;
                case Tson.DirType.Beyond_Official_Struct:
                    key = 'mihoyobin_OfficialStruct';
                    break;
                case Tson.DirType.Config_JsonConfig_ShortCutKey:
                    key = 'mihoyobin_ConfigShortCutKey';
                    break;
                case Tson.DirType.Config_JsonConfig_SynonymsLibrary:
                    key = 'mihoyobin_ConfigSynonymsLibrary';
                    break;
                case Tson.DirType.TextMap:
                    key = 'mihoyobin_TextMap';
                    break;
            }
            break;
    }
    
    // 尝试从dtype目录加载
    if (key) {
        try {
            const response = await fetch(`../dtype/${key}.csv`);
            if (response.ok) {
                return await response.text();
            }
        } catch (e) {
            console.warn('无法加载内置dtype文件:', e);
        }
    }
    
    return dtypeFiles[key] || '';
}
