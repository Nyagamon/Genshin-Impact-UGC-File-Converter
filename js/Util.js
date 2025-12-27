/**
 * Util工具类 - 提供Base64编码等实用功能
 */
class Util {
    /**
     * Base64编码
     */
    static base64Encode(data) {
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Base64解码
     */
    static base64Decode(str) {
        const binary = atob(str);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * 异或加密/解密
     */
    static crypt(data) {
        const result = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            result[i] = data[i] ^ 0xE5;
        }
        return result;
    }

    /**
     * 从文件读取为ArrayBuffer
     */
    static async loadFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * 从文件读取为文本
     */
    static async loadFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file, 'utf-8');
        });
    }

    /**
     * 下载数据为文件
     */
    static downloadFile(data, filename) {
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 获取文件扩展名
     */
    static getFileExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        const lastSep1 = filename.lastIndexOf('/');
        const lastSep2 = filename.lastIndexOf('\\');
        const lastSep = Math.max(lastSep1, lastSep2);
        
        if (lastDot === -1 || (lastSep !== -1 && lastDot < lastSep)) {
            return '';
        }
        return filename.substring(lastDot + 1).toLowerCase();
    }

    /**
     * 获取文件路径
     */
    static getFilePath(filename) {
        const lastSep1 = filename.lastIndexOf('/');
        const lastSep2 = filename.lastIndexOf('\\');
        const lastSep = Math.max(lastSep1, lastSep2);
        
        if (lastSep === -1) {
            return '';
        }
        return filename.substring(0, lastSep + 1);
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Util;
}
