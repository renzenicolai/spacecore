"use strict";

const mime   = require("mime-types");
const fs     = require("fs");
const stream = require("stream");
const chalk  = require("chalk");

class Reports {
    constructor(opts) {
        this._opts = Object.assign({
            database: null,
            table: "invoices",
            table_rows: "invoice_rows",
            table_rows_stock_mapping: "product_stock_mapping",
            persons: null,
            products: null,
            invoices: null
        }, opts);
        if (this._opts.database === null) {
            console.log("The reports module can not be started without a database!");
            process.exit(1);
        }
        this._table                    = this._opts.database.table(this._opts.table);
        this._table_rows               = this._opts.database.table(this._opts.table_rows);
    }

    async transactions(year, session) {
        let timestamp_start = Math.floor(Date.parse("01 Jan " + (year    ) + " 00:00:00 UTC+1") / 1000);
        let timestamp_end   = Math.floor(Date.parse("01 Jan " + (year + 1) + " 00:00:00 UTC+1") / 1000);
        let transactions = await this._opts.invoices.list({"timestamp": {">=": timestamp_start, "<": timestamp_end}}, session);

        let relation_rows = await this._opts.persons.list({}, session);
        let relations = {};
        for (let index = 0; index < relation_rows.length; index++) {
            let relation = relation_rows[index];
            relations[relation.id] = relation;
        }

        let doc = "id;timestamp;relation_nickname;relation_name;total;row_id;description;price;amount\n";
        for (let index = 0; index < transactions.length; index++) {
            let transaction = transactions[index];
            doc += transaction.id + ";" + transaction.timestamp + ";" +
            relations[transaction.person_id].nick_name.replace(";","_") + ";" +
            relations[transaction.person_id].first_name.replace(";","_") + " " +
            relations[transaction.person_id].last_name.replace(";","_") + ";" +
            transaction.total + ";";
            if (transaction.rows.length < 1) {
                doc += ";;;\n";
                continue;
            }
            for (let row_index = 0; row_index < transaction.rows.length; row_index++) {
                let row = transaction.rows[row_index];
                if (row_index > 0) doc += transaction.id + ";;;;;";
                doc += row.id + ";" +
                       row.description.replace(";","_") + ";" +
                       row.price + ";" +
                       row.amount + "\n";
            }
        }
        let file = Buffer.from(doc, "utf-8");
        return {
            name: "transactions-" + year + ".csv",
            mime: "text/csv",
            size: file.length,
            data: file.toString("base64")
        };
    }

    async summary(year, session) {
        let timestamp_start = Math.floor(Date.parse("01 Jan " + (year    ) + " 00:00:00 UTC+1") / 1000);
        let timestamp_end   = Math.floor(Date.parse("01 Jan " + (year + 1) + " 00:00:00 UTC+1") / 1000);
        let relation_rows = await this._opts.persons.list({}, session);
        let relations = {};
        let transaction_this_year_promises = [];
        let transaction_after_promises = [];
        for (let index = 0; index < relation_rows.length; index++) {
            let relation = relation_rows[index];
            relations[relation.id] = relation;
            relations[relation.id].transactions_this_year_promise = this._opts.invoices.list({"person_id": {"=": relation.id}, "timestamp": {">=": timestamp_start, "<": timestamp_end}}, session);
            relations[relation.id].transactions_after_promise = this._opts.invoices.list({"person_id": {"=": relation.id}, "timestamp": {">=": timestamp_end}}, session);
        }
        for (let index in relations) {
            let transactions_this_year = await relations[index].transactions_this_year_promise;
            let total_this_year = 0;
            let total_deposit = 0;
            let total_spent = 0;
            for (let index_transaction = 0; index_transaction < transactions_this_year.length; index_transaction++) {
                total_this_year += transactions_this_year[index_transaction].total;
                for (let index_row = 0; index_row < transactions_this_year[index_transaction].rows.length; index_row++) {
                    let row = transactions_this_year[index_transaction].rows[index_row];
                    if (row.description === "Deposit") {
                        total_deposit -= row.price * row.amount;
                    } else {
                        total_spent += row.price * row.amount;
                    }
                }
            }
            relations[index].total_this_year = total_this_year;
            relations[index].total_deposit = total_deposit;
            relations[index].total_spent = total_spent;
        }
        for (let index in relations) {
            let transactions_after = await relations[index].transactions_after_promise;
            let total_after = 0;
            for (let index_transaction = 0; index_transaction < transactions_after.length; index_transaction++) {
                total_after += transactions_after[index_transaction].total;
            }
            relations[index].total_after = total_after;
        }
        let doc = "id;nickname;name;balance_start;balance_end;amount_deposited;amount_spent\n";
        for (let index in relations) {
            relations[index].balance_end_of_year = relations[index].balance + relations[index].total_after;
            relations[index].balance_start_of_year = relations[index].balance_end_of_year + relations[index].total_this_year;
            if ((relations[index].total_deposit === 0) && (relations[index].total_spent === 0) && (relations[index].balance_end_of_year === 0) && (relations[index].balance_start_of_year === 0)) continue;
            doc += relations[index].id + ";" +
                   relations[index].nick_name + ";" +
                   relations[index].first_name + " " + relations[index].last_name + ";" +
                   relations[index].balance_start_of_year + ";" +
                   relations[index].balance_end_of_year + ";" +
                   relations[index].total_deposit + ";" +
                   relations[index].total_spent + "\n";
        }

        let file = Buffer.from(doc, "utf-8");
        return {
            name: "summary-" + year + ".csv",
            mime: "text/csv",
            size: file.length,
            data: file.toString("base64")
        };
    }

    registerRpcMethods(rpc, prefix="report") {
        if (prefix!=="") prefix = prefix + "/";
        rpc.addMethod(
            prefix + "transactions",
            this.transactions.bind(this),
            {},
            {}
        );
        rpc.addMethod(
            prefix + "summary",
            this.summary.bind(this),
            {},
            {}
        );
    }
}

module.exports = Reports;
