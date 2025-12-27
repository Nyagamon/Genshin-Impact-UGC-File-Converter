/**
 * Writer类 - 用于写入二进制数据
 */
class Writer {
    constructor() {
        this._data = [];
    }

    getData() {
        return new Uint8Array(this._data);
    }

    writeBytes(bytes) {
        if (!bytes || bytes.length === 0) {
            return true;
        }
        for (let i = 0; i < bytes.length; i++) {
            this._data.push(bytes[i]);
        }
        return true;
    }

    writeUint(value) {
        // 将Number转换为BigInt以支持大整数
        let bigValue = typeof value === 'bigint' ? value : BigInt(value);
        const bytes = [];
        
        do {
            let v = Number(bigValue & 0x7Fn);
            bigValue >>= 7n;
            if (bigValue > 0n) {
                v |= 0x80;
            }
            bytes.push(v);
        } while (bigValue > 0n && bytes.length < 10);
        
        return this.writeBytes(bytes);
    }

    writeUint32(value) {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setUint32(0, value, true); // little-endian
        return this.writeBytes(new Uint8Array(buffer));
    }

    writeFloat32(value) {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setFloat32(0, value, true); // little-endian
        return this.writeBytes(new Uint8Array(buffer));
    }

    writeData(data) {
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        return this.writeUint(bytes.length) && this.writeBytes(bytes);
    }

    writeString(str) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);
        return this.writeUint(bytes.length) && this.writeBytes(bytes);
    }

    fputc(c) {
        if (typeof c === 'string') {
            c = c.charCodeAt(0);
        }
        this._data.push(c);
        return true;
    }

    fputs(str) {
        if (!str) return true;
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);
        return this.writeBytes(bytes);
    }

    fprintf(str) {
        return this.fputs(str);
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Writer;
}
