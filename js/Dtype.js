/**
 * Dtype类 - 处理数据类型定义（CSV格式）
 */
class Dtype {
    constructor() {
        this._nodes = new Map();
    }

    /**
     * DtypeNode - 数据类型节点
     */
    static Node = class {
        constructor() {
            this.isInt32 = false;
            this.isInt64 = false;
            this.isFloat32 = false;
            this.isFloat64 = false;
            this.isObject = false;
            this.isString = false;
            this.isData = false;
            this.referenceCount = 0;
            this.dataSize = 0;
            this.dataBytes = new Uint8Array(16);
        }

        isMultipleKeys() {
            return this.referenceCount >= 2;
        }

        isIntUnknown() {
            return this.isInt32 && this.isInt64;
        }

        isFloatUnknown() {
            return this.isFloat32 && this.isFloat64;
        }

        isDataUnknown() {
            return this.isObject && this.isString && this.isData;
        }
    };

    /**
     * 获取节点
     */
    get(path) {
        const key = JSON.stringify(path);
        return this._nodes.get(key);
    }

    /**
     * 设置节点
     */
    set(path, node) {
        const key = JSON.stringify(path);
        this._nodes.set(key, node);
    }

    /**
     * 判断是否是错误的二进制数据
     */
    _isError(reader) {
        while (!reader.isEof) {
            const id = reader.readInt();
            const type = Number(id) & 7;
            
            switch (type) {
                case 0: // Int
                    reader.readInt();
                    break;
                case 2: // Data
                    reader.readData(reader.readInt());
                    break;
                case 5: // Float32
                    reader.readFloat32();
                    break;
                default:
                    return true;
            }
        }
        return reader.isError;
    }

    /**
     * 分析二进制数据并提取类型信息
     */
    analyze(reader, parentId = []) {
        const path = [];
        const ids = [];

        while (!reader.isEof) {
            const id = reader.readInt();
            const type = Number(id) & 7;
            const fieldId = Number(typeof id === 'bigint' && id > Number.MAX_SAFE_INTEGER ? id >> 3n : Number(id) >> 3);

            const currentPath = [...parentId, fieldId];
            ids.push([...currentPath]);

            let node = this.get(currentPath);
            if (!node) {
                node = new Dtype.Node();
                node.isInt32 = true;
                node.isInt64 = true;
                node.isFloat32 = true;
                node.isFloat64 = true;
                node.isObject = true;
                node.isString = true;
                node.isData = true;
                this.set(currentPath, node);
            }

            node.referenceCount++;

            switch (type) {
                case 0: { // Int
                    const v = reader.readInt();
                    node.isFloat32 = false;
                    node.isFloat64 = false;
                    node.isObject = false;
                    node.isString = false;
                    node.isData = false;
                    
                    const numV = Number(v);
                    if (numV > 0xFFFFFFFF) {
                        node.isInt32 = false;
                    } else if (numV === 0xFFFFFFFF) {
                        node.isInt64 = false;
                    }
                    break;
                }
                case 2: { // Data
                    const dataReader = reader.readData(reader.readInt());
                    node.isInt32 = false;
                    node.isInt64 = false;
                    node.isFloat32 = false;
                    node.isFloat64 = false;

                    if (node.isObject) {
                        if (!this._isError(dataReader)) {
                            if (dataReader.size > 0) {
                                node.isString = false;
                                node.isData = false;
                            }
                            if (!this.analyze(new Reader(dataReader.getData()), currentPath)) {
                                return false;
                            }
                            break;
                        }
                        node.isObject = false;
                        node.isString = true;
                        node.isData = true;
                    }

                    const data = dataReader.getData();
                    node.dataSize = data.length;
                    const copySize = Math.min(data.length, node.dataBytes.length);
                    for (let i = 0; i < copySize; i++) {
                        node.dataBytes[i] = data[i];
                    }

                    // 检查是否是有效的UTF-8字符串
                    if (node.isString && !this._isValidUtf8(data)) {
                        node.isString = false;
                    }
                    break;
                }
                case 5: { // Float32
                    reader.readFloat32();
                    node.isInt32 = false;
                    node.isInt64 = false;
                    node.isFloat64 = false;
                    node.isObject = false;
                    node.isString = false;
                    node.isData = false;
                    break;
                }
                default:
                    return false;
            }
        }

        // 更新引用计数
        for (const id of ids) {
            const node = this.get(id);
            if (node) {
                node.referenceCount = node.referenceCount < 2 ? 0 : 2;
            }
        }

        return !reader.isError;
    }

    /**
     * 检查是否是有效的UTF-8字符串
     */
    _isValidUtf8(bytes) {
        try {
            const decoder = new TextDecoder('utf-8', { fatal: true });
            decoder.decode(bytes);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * 读取CSV格式的dtype数据
     */
    readCsv(csvString) {
        this._nodes.clear();

        const lines = csvString.split(/\r?\n/);
        
        for (let line of lines) {
            line = line.trim();
            
            // 跳过空行和注释
            if (!line || line.startsWith('#')) {
                continue;
            }

            const cols = line.split(',').map(c => c.trim());
            if (cols.length < 3) {
                continue;
            }

            const [col1, col2, col3, ...rest] = cols;
            const node = new Dtype.Node();

            // 解析路径
            const path = [];
            const pathParts = col1.split('/');
            for (const part of pathParts) {
                const num = parseInt(part);
                if (!isNaN(num)) {
                    path.push(num);
                }
            }

            // 解析是否是多键
            node.referenceCount = (col2 === '*') ? 2 : 0;

            // 解析类型
            if (col3 === 'int') {
                node.isInt32 = true;
                node.isInt64 = true;
            } else if (col3 === 'int32') {
                node.isInt32 = true;
            } else if (col3 === 'int64') {
                node.isInt64 = true;
            } else if (col3 === 'float') {
                node.isFloat32 = true;
                node.isFloat64 = true;
            } else if (col3 === 'float32') {
                node.isFloat32 = true;
            } else if (col3 === 'float64') {
                node.isFloat64 = true;
            } else if (col3 === 'unknown') {
                node.isObject = true;
                node.isString = true;
                node.isData = true;
            } else if (col3 === 'object') {
                node.isObject = true;
            } else if (col3 === 'string') {
                node.isString = true;
            } else if (col3 === 'data') {
                node.isData = true;
            }

            this.set(path, node);
        }

        return true;
    }

    /**
     * 写入CSV格式的dtype数据
     */
    writeCsv(writer) {
        // 将Map转换为数组并排序
        const nodes = Array.from(this._nodes.entries()).map(([key, value]) => {
            return { path: JSON.parse(key), node: value };
        });

        nodes.sort((a, b) => {
            for (let i = 0; i < Math.max(a.path.length, b.path.length); i++) {
                const aVal = a.path[i] || 0;
                const bVal = b.path[i] || 0;
                if (aVal !== bVal) {
                    return aVal - bVal;
                }
            }
            return 0;
        });

        writer.fputs("# Path, Multiple keys, Type, Details\r\n");

        for (const { path, node } of nodes) {
            // 写入路径
            writer.fputs(path.join('/'));
            writer.fputc(',');

            // 写入是否多键
            if (node.referenceCount >= 2) {
                writer.fputc('*');
            }
            writer.fputc(',');

            // 写入类型
            if (node.isIntUnknown()) {
                writer.fputs("int");
            } else if (node.isInt32) {
                writer.fputs("int32");
            } else if (node.isInt64) {
                writer.fputs("int64");
            } else if (node.isFloatUnknown()) {
                writer.fputs("float");
            } else if (node.isFloat32) {
                writer.fputs("float32");
            } else if (node.isFloat64) {
                writer.fputs("float64");
            } else if (node.isDataUnknown()) {
                writer.fputs("unknown,EmptyData");
            } else if (node.isObject) {
                writer.fputs("object");
            } else if (node.isString) {
                writer.fputs("string");
            } else if (node.isData) {
                writer.fputs("data");
                if (node.dataSize > 0) {
                    writer.fputs(`,size=0x${node.dataSize.toString(16).toUpperCase()}:`);
                    const size = Math.min(node.dataSize, node.dataBytes.length);
                    for (let i = 0; i < size; i++) {
                        writer.fputs(` ${node.dataBytes[i].toString(16).toUpperCase().padStart(2, '0')}`);
                    }
                }
            }

            writer.fputs("\r\n");
        }

        return true;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dtype;
}
