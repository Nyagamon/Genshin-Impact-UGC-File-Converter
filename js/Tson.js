/**
 * Tson类 - 核心转换逻辑
 */
class Tson {
    constructor() {
        this._filetype = Tson.FileType.Unknown;
        this._dirtype = Tson.DirType.Unknown;
        this._info = { r1: 0, r2: 0, r3: 0, r4: 0 };
        this._dtype = new Dtype();
        this._json = {};
    }

    static FileType = {
        Unknown: 0,
        gia: 1,
        gil: 2,
        mihoyobin: 3
    };

    static DirType = {
        Unknown: 0,
        Beyond_BeyondGlobal: 1,
        Beyond_Node: 2,
        Beyond_Official_Blueprint_OfficialCompoundNode: 3,
        Beyond_Official_OfficialPrefab: 4,
        Beyond_Official_Struct: 5,
        Config_JsonConfig_ShortCutKey: 6,
        Config_JsonConfig_SynonymsLibrary: 7,
        TextMap: 8
    };

    static CodeType = {
        Int: 0,
        Data: 2,
        Float32: 5
    };

    static _filetypeTable = [
        { name: 'gia', type: Tson.FileType.gia },
        { name: 'gil', type: Tson.FileType.gil },
        { name: 'mihoyobin', type: Tson.FileType.mihoyobin }
    ];

    static _dirtypeTable = [
        { name: 'BeyondGlobal', type: Tson.DirType.Beyond_BeyondGlobal },
        { name: 'BeyondNode', type: Tson.DirType.Beyond_Node },
        { name: 'OfficialCompoundNode', type: Tson.DirType.Beyond_Official_Blueprint_OfficialCompoundNode },
        { name: 'OfficialPrefab', type: Tson.DirType.Beyond_Official_OfficialPrefab },
        { name: 'OfficialStruct', type: Tson.DirType.Beyond_Official_Struct },
        { name: 'ConfigShortCutKey', type: Tson.DirType.Config_JsonConfig_ShortCutKey },
        { name: 'ConfigSynonymsLibrary', type: Tson.DirType.Config_JsonConfig_SynonymsLibrary },
        { name: 'TextMap', type: Tson.DirType.TextMap }
    ];

    static _getFiletype(ext) {
        for (const e of Tson._filetypeTable) {
            if (e.name === ext) {
                return e.type;
            }
        }
        return Tson.FileType.Unknown;
    }

    static _getDirtype(str) {
        for (const e of Tson._dirtypeTable) {
            if (e.name === str) {
                return e.type;
            }
        }
        return Tson.DirType.Unknown;
    }

    static _toString(type, isFileType = true) {
        const table = isFileType ? Tson._filetypeTable : Tson._dirtypeTable;
        for (const e of table) {
            if (e.type === type) {
                return e.name;
            }
        }
        return 'Unknown';
    }

    static _bswap32(value) {
        return ((value & 0xFF) << 24) |
               ((value & 0xFF00) << 8) |
               ((value >> 8) & 0xFF00) |
               ((value >> 24) & 0xFF);
    }

    /**
     * 预加载二进制文件，判断文件类型
     */
    preloadBtson(filename) {
        const ext = Util.getFileExtension(filename);
        this._filetype = Tson._getFiletype(ext);
        
        if (this._filetype === Tson.FileType.Unknown) {
            return false;
        }

        if (this._filetype === Tson.FileType.mihoyobin) {
            const path = filename.replace(/\\/g, '/');
            const patterns = [
                { pattern: '/Json/Beyond/BeyondGlobal/', type: Tson.DirType.Beyond_BeyondGlobal },
                { pattern: '/Json/Beyond/Node/', type: Tson.DirType.Beyond_Node },
                { pattern: '/Json/Beyond/Official/Blueprint/OfficialCompoundNode/', type: Tson.DirType.Beyond_Official_Blueprint_OfficialCompoundNode },
                { pattern: '/Json/Beyond/Official/OfficialPrefab/', type: Tson.DirType.Beyond_Official_OfficialPrefab },
                { pattern: '/Json/Beyond/Official/Struct/', type: Tson.DirType.Beyond_Official_Struct },
                { pattern: '/Json/Config/JsonConfig/ShortCutKey/', type: Tson.DirType.Config_JsonConfig_ShortCutKey },
                { pattern: '/Json/Config/JsonConfig/SynonymsLibrary/', type: Tson.DirType.Config_JsonConfig_SynonymsLibrary },
                { pattern: '/Json/TextMap/', type: Tson.DirType.TextMap }
            ];

            this._dirtype = Tson.DirType.Unknown;
            for (const p of patterns) {
                if (path.includes(p.pattern)) {
                    this._dirtype = p.type;
                    break;
                }
            }
        }

        return true;
    }

    /**
     * 从二进制数据加载
     */
    _loadBtson(jsonParent, reader, dtypeParentId = []) {
        while (!reader.isEof) {
            const id = reader.readInt();
            const type = Number(id) & 7;
            const fieldId = Number(typeof id === 'bigint' && id > Number.MAX_SAFE_INTEGER ? id >> 3n : Number(id) >> 3);

            const path = [...dtypeParentId, fieldId];
            const dtype = this._dtype.get(path);
            
            if (!dtype) {
                return false;
            }

            let node = null;

            switch (type) {
                case Tson.CodeType.Int: {
                    const v = reader.readInt();
                    if (dtype.isIntUnknown() || dtype.isInt64) {
                        node = Number(v);
                    } else if (dtype.isInt32) {
                        node = Number(v) | 0; // 转换为32位整数
                    } else {
                        return false;
                    }
                    break;
                }
                case Tson.CodeType.Data: {
                    const dataReader = reader.readData(reader.readInt());
                    if (dtype.isDataUnknown()) {
                        node = '';
                    } else if (dtype.isString) {
                        const decoder = new TextDecoder('utf-8');
                        const str = decoder.decode(dataReader.getData());
                        node = 'string:' + str;
                    } else if (dtype.isData) {
                        node = 'base64:' + Util.base64Encode(dataReader.getData());
                    } else if (dtype.isObject) {
                        node = {};
                        if (!this._loadBtson(node, dataReader, path)) {
                            return false;
                        }
                    } else {
                        return false;
                    }
                    break;
                }
                case Tson.CodeType.Float32: {
                    const v = reader.readFloat32();
                    if (dtype.isFloat32) {
                        node = v;
                    } else {
                        return false;
                    }
                    break;
                }
                default:
                    return false;
            }

            const key = fieldId.toString();
            if (dtype.isMultipleKeys()) {
                if (!jsonParent[key]) {
                    jsonParent[key] = [];
                }
                jsonParent[key].push(node);
            } else {
                jsonParent[key] = node;
            }
        }

        return true;
    }

    /**
     * 保存为二进制数据
     */
    _saveBtson(writer, jsonNode, dtypeParentId = []) {
        if (typeof jsonNode !== 'object' || jsonNode === null) {
            return false;
        }

        // 获取所有键并排序
        const keys = Object.keys(jsonNode).map(k => {
            return { id: parseInt(k), key: k };
        }).filter(k => !isNaN(k.id)).sort((a, b) => a.id - b.id);

        for (const { id, key } of keys) {
            const path = [...dtypeParentId, id];
            const dtype = this._dtype.get(path);
            
            if (!dtype) {
                return false;
            }

            const value = jsonNode[key];

            if (dtype.isMultipleKeys()) {
                if (!Array.isArray(value)) {
                    return false;
                }
                
                for (const item of value) {
                    if (!this._saveBtsonValue(writer, item, dtype, id, path)) {
                        return false;
                    }
                }
            } else {
                if (!this._saveBtsonValue(writer, value, dtype, id, path)) {
                    return false;
                }
            }
        }

        return true;
    }

    _saveBtsonValue(writer, value, dtype, id, path) {
        if (dtype.isIntUnknown() || dtype.isInt32 || dtype.isInt64) {
            writer.writeUint((id << 3) | Tson.CodeType.Int);
            writer.writeUint(value);
        } else if (dtype.isFloat32) {
            writer.writeUint((id << 3) | Tson.CodeType.Float32);
            writer.writeFloat32(value);
        } else if (dtype.isDataUnknown() || dtype.isData) {
            let data = value;
            if (typeof data === 'string' && data.startsWith('base64:')) {
                data = Util.base64Decode(data.substring(7));
            } else if (typeof data === 'string') {
                const encoder = new TextEncoder();
                data = encoder.encode(data);
            }
            writer.writeUint((id << 3) | Tson.CodeType.Data);
            writer.writeData(data);
        } else if (dtype.isString) {
            let str = value;
            if (typeof str === 'string' && str.startsWith('string:')) {
                str = str.substring(7);
            }
            const encoder = new TextEncoder();
            const data = encoder.encode(str);
            writer.writeUint((id << 3) | Tson.CodeType.Data);
            writer.writeData(data);
        } else if (dtype.isObject) {
            const w2 = new Writer();
            if (!this._saveBtson(w2, value, path)) {
                return false;
            }
            writer.writeUint((id << 3) | Tson.CodeType.Data);
            writer.writeData(w2.getData());
        } else {
            return false;
        }
        
        return true;
    }

    /**
     * 加载二进制文件
     */
    async loadBtson(file, dtypeText = null) {
        const data = new Uint8Array(await Util.loadFile(file));
        let reader = new Reader(data);

        switch (this._filetype) {
            case Tson.FileType.gia:
            case Tson.FileType.gil:
                if (reader.size < 0x14) {
                    return false;
                }
                const dataSize1 = Tson._bswap32(reader.readUint32());
                this._info.r1 = Tson._bswap32(reader.readUint32());
                this._info.r2 = Tson._bswap32(reader.readUint32());
                this._info.r3 = Tson._bswap32(reader.readUint32());
                const dataSize2 = Tson._bswap32(reader.readUint32());
                
                if (reader.size < dataSize1 + 4 || reader.size < dataSize2 + 0x14) {
                    return false;
                }
                
                const actualData = reader.readData(dataSize2);
                this._info.r4 = Tson._bswap32(reader.readUint32());
                reader = actualData;
                break;
                
            case Tson.FileType.mihoyobin:
                const decrypted = Util.crypt(data);
                reader = new Reader(decrypted);
                break;
                
            default:
                return false;
        }

        // 如果提供了dtype文本，先读取
        if (dtypeText) {
            this._dtype.readCsv(dtypeText);
        }

        // 分析并加载
        this._json = {};
        return this._dtype.analyze(new Reader(reader.getData())) && 
               this._loadBtson(this._json, new Reader(reader.getData()));
    }

    /**
     * 保存为二进制文件
     */
    saveBtson() {
        const writer = new Writer();

        switch (this._filetype) {
            case Tson.FileType.gia:
            case Tson.FileType.gil: {
                const dataWriter = new Writer();
                if (!this._saveBtson(dataWriter, this._json)) {
                    return null;
                }
                
                const d = dataWriter.getData();
                writer.writeUint32(Tson._bswap32(d.length + 0x14));
                writer.writeUint32(Tson._bswap32(this._info.r1));
                writer.writeUint32(Tson._bswap32(this._info.r2));
                writer.writeUint32(Tson._bswap32(this._info.r3));
                writer.writeUint32(Tson._bswap32(d.length));
                writer.writeBytes(d);
                writer.writeUint32(Tson._bswap32(this._info.r4));
                break;
            }
            case Tson.FileType.mihoyobin: {
                if (!this._saveBtson(writer, this._json)) {
                    return null;
                }
                const encrypted = Util.crypt(writer.getData());
                return encrypted;
            }
            default:
                return null;
        }

        return writer.getData();
    }

    /**
     * 从JSON加载
     */
    loadJson(jsonObj) {
        this._filetype = Tson._getFiletype(jsonObj.filetype);
        this._dirtype = Tson._getDirtype(jsonObj.dirtype);
        
        if (jsonObj.info) {
            this._info.r1 = jsonObj.info['1'] || 0;
            this._info.r2 = jsonObj.info['2'] || 0;
            this._info.r3 = jsonObj.info['3'] || 0;
            this._info.r4 = jsonObj.info['4'] || 0;
        }

        if (jsonObj.dtype_csv) {
            if (!this._dtype.readCsv(jsonObj.dtype_csv)) {
                return false;
            }
        }

        if (jsonObj.json) {
            this._json = jsonObj.json;
        }

        return true;
    }

    /**
     * 保存为JSON
     */
    saveJson() {
        const dtypeCsvWriter = new Writer();
        this._dtype.writeCsv(dtypeCsvWriter);
        const decoder = new TextDecoder('utf-8');
        const dtypeCsv = decoder.decode(dtypeCsvWriter.getData());

        return {
            filetype: Tson._toString(this._filetype, true),
            dirtype: Tson._toString(this._dirtype, false),
            info: {
                '1': this._info.r1,
                '2': this._info.r2,
                '3': this._info.r3,
                '4': this._info.r4
            },
            json: this._json,
            dtype_csv: dtypeCsv
        };
    }

    get filetype() {
        return this._filetype;
    }

    get dirtype() {
        return this._dirtype;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Tson;
}
