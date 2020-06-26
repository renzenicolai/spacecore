'use strict';

const env = require('./environment.js');

async function print(database, table) {
	let [records, fields] = await database.query("select * from information_schema.columns where table_schema=? and table_name=?;", [database.getName(), table]);
	console.log('{');
	let nameLength = 0;
	for (let i = 0; i < records.length; i++) {
		let curLength = records[i].COLUMN_NAME.length;
		if (curLength > nameLength) {
			nameLength = curLength;
		}
	}
	let typeLength = 0;
	for (let i = 0; i < records.length; i++) {
		let curLength = records[i].COLUMN_TYPE.length;
		if (curLength > typeLength) {
			typeLength = curLength;
		}
	}
	let defaultLength = 0;
	for (let i = 0; i < records.length; i++) {
		let value = records[i].COLUMN_DEFAULT;
		if (value === null) value = 'null';
		let curLength = value.length;
		if (curLength > defaultLength) {
			defaultLength = curLength;
		}
	}
	for (let i = 0; i < records.length; i++) {
		let record = records[i];
		console.log('    '+(record.COLUMN_NAME+':').padEnd(nameLength+2)+'{ '+
		('index: '+((record.COLUMN_KEY==='PRI')?'true,  ':'false, '))+
		('type: \''+record.COLUMN_TYPE+'\', ').padEnd(typeLength+10)+
		('isNullable: '+((record.IS_NULLABLE==='YES')?'true,  ':'false, '))+
		(((record.COLUMN_DEFAULT !== null)?('default: '+((record.COLUMN_DEFAULT==='NULL')?'null':record.COLUMN_DEFAULT)):'').padEnd(defaultLength+9))+
		' }'+(i < (records.length-1)?',':''));
	}
	console.log('}');
}

let table = process.argv[process.argv.length-1];
console.log("Schema for table '"+table+"'");
env.start();
print(env.database(), table).then(() => {
	env.stop();
}).catch((error) => {
	env.stop();
	throw error;
});
