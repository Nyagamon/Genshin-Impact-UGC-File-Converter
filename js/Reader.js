/**
 * Reader类 - 用于读取二进制数据
 */
class Reader {
    constructor(data) {
        if (data instanceof Uint8Array) {
            this._data = data;
        } else if (data instanceof ArrayBuffer) {
            this._data = new Uint8Array(data);
        } else {
            this._data = new Uint8Array(0);
        }
        this._ptr = 0;
        this._error = false;
    }

    get size() {
        return this._data.length;
    }

    get isEof() {
        return this._ptr >= this._data.length;
    }

    get isError() {
        return this._error;
    }

    setError() {
        this._error = true;
    }

    readUint8() {
        if (this._ptr >= this._data.length) {
            this.setError();
            return 0;
        }
        return this._data[this._ptr++];
    }

    readUint32() {
        if (this._ptr + 4 > this._data.length) {
            this.setError();
            return 0;
        }
        const view = new DataView(this._data.buffer, this._data.byteOffset + this._ptr, 4);
        this._ptr += 4;
        return view.getUint32(0, true); // little-endian
    }

    readFloat32() {
        if (this._ptr + 4 > this._data.length) {
            this.setError();
            return 0;
        }
        const view = new DataView(this._data.buffer, this._data.byteOffset + this._ptr, 4);
        this._ptr += 4;
        return view.getFloat32(0, true); // little-endian
    }

    readInt() {
        let result = 0n;
        for (let i = 0; i < 70; i += 7) {
            const v = this.readUint8();
            result |= BigInt(v & 0x7F) << BigInt(i);
            if (!(v & 0x80)) break;
        }
        // 转换为JavaScript Number（如果在安全范围内）
        if (result <= Number.MAX_SAFE_INTEGER) {
            return Number(result);
        }
        return result;
    }

    readData(size) {
        if (this._ptr + size > this._data.length) {
            this.setError();
            return new Reader(new Uint8Array(0));
        }
        const data = this._data.slice(this._ptr, this._ptr + size);
        this._ptr += size;
        return new Reader(data);
    }

    getData() {
        return this._data;
    }

    slice(start, end) {
        return this._data.slice(start, end);
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Reader;
}
