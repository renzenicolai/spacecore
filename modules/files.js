"use strict";

class Files {
    constructor(opts) {
        this._opts = Object.assign({
            database: null,
            table: "files"
        }, opts);
        if (this._opts.database === null) {
            console.log("The files module can not be started without a database!");
            process.exit(1);
        }
        this._table = this._opts.database.table(this._opts.table);
    }

    async getFileAsRecord(id) {
        if (id === null) return null;
        return (await this._table.selectRecords({"id":id}))[0];
    }

    async getFileAsBase64(id) {
        var result = await this.getFileAsRecord(id);
        if (result === null) return null;
        result = result.getFields();
        if (result.file === null) return null;
        return {
            name: result.name,
            mime: result.mime,
            size: result.file.length,
            data: result.file.toString("base64")
        };
    }

    async createFileFromBuffer(file, transaction=null) {
        if (typeof file !== "object") throw "File parameter should be an object";
        if (typeof file.mime !== "string")  throw "MIME type missing";
        if (typeof file.name !== "string")  throw "Name missing";
        if (typeof file.data !== "object")  throw "Data should be buffer object";
        if (typeof file.size !== "number")  throw "Size missing";
        if (file.data.length !== file.size) throw "File length mismatch";
        var fileRecord = this._table.createRecord();
        fileRecord.setField("name", file.name);
        fileRecord.setField("mime", file.mime);
        fileRecord.setField("file", file.data);
        await fileRecord.flush(transaction);
        return fileRecord;
    }

    async createFileFromBase64(file,transaction=null) {
        if (typeof file !== "object") throw "File parameter should be an object";
        if (typeof file.data !== "string") throw "Data should be a base64 encoded string";
        file.data = Buffer.from(file.data, "base64");
        return this.createFileFromBuffer(file, transaction);
    }

    async deleteFile(id, transaction=null) {
        if (typeof id !== "number") throw "ID should be number";
        var file = (await this._table.selectRecords({"id":id}));
        if (file.length !== 1) throw "File not found";
        return file[0].destroy(transaction);
    }

    methodListFiles(params, session) {
        return this._table.selectRecordsRaw("SELECT `id`, `name`, `mime` FROM `"+this._opts.table+"` WHERE 1;", [], false);
    }

    methodGetFile(params, session) {
        return this.getFileAsBase64(params);
    }

    async methodAddFile(params, session) {
        var operations = [];
        if (typeof params !== "object") throw "Parameter should be object with file list inside";
        if (!Array.isArray(params.file)) throw "File list should be an array";
        for (let i in params.file) {
            operations.push(this.createFileFromBase64(params.file[i]));
        }
        var files = await Promise.all(operations);
        var result = [];
        for (let i = 0; i < files.length; i++) {
            result.push(files[i].getFields());
        }
        return result;
    }

    async methodRemoveFile(params, session) {
        if (Array.isArray(params)) {
            var operations = [];
            for (var i in params) {
                operations.push(this.deleteFile(params[i]));
            }
            return Promise.all(operations);
        } else {
            try {
                return await this.deleteFile(params);
            } catch (e) {
                throw "The file can not be removed because it is in use.";
            }
        }
    }

    registerRpcMethods(rpc, prefix="file") {
        if (prefix!=="") prefix = prefix + "/";
        rpc.addMethod(
            prefix + "list",
            this.methodListFiles.bind(this),
            null,
            null
        );
        rpc.addMethod(
            prefix + "get",
            this.methodGetFile.bind(this),
            {
                type: "number"
            },
            null
        );
        rpc.addMethod(
            prefix + "add",
            this.methodAddFile.bind(this),
            {
                type: "object",
                properties: {
                    file: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                data: {
                                    type: "string"
                                },
                                mime: {
                                    type: "string"
                                },
                                name: {
                                    type: "string"
                                },
                                size: {
                                    type: "number"
                                }
                            },
                            required: ["data", "mime", "name", "size"]
                        }
                    }
                },
                required: ["file"]
            },
            null
        );
        rpc.addMethod(
            prefix + "remove",
            this.methodRemoveFile.bind(this),
            {
                type: ["number", "array"],
                items: {
                    type: "number"
                }
            },
            null
        );
    }
}

module.exports = Files;
