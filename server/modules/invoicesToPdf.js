"use strict";

const PDFDocument = require('pdfkit');

class PdfInvoice {
	constructor(opts={}) {
		//Nothing to do.
	}
	
	render(outputStream, clientAddress, businessAddress, products, totals, identifier, date) {
		const doc = new PDFDocument({autoFirstPage: false, bufferPages: true});
		doc.pipe(outputStream);
		this._addPage(doc);

		var offset = 70;
		offset = this._renderHeader(doc, offset, businessAddress, clientAddress, identifier, date);
		offset = this._renderTable(doc, offset, [
			{text: "Description", width: doc.page.width-120-180},
			{text: "Price",       width: 60},
			{text: "Amount",      width: 60},
			{text: "Subtotal",    width: 60}
			], products);
		this._renderTotals(doc, offset, totals);
		this._renderFooter(doc);
		doc.flushPages();
		doc.end();
	}
	
	// Internal rendering functions
	_addPage(doc) {
		doc.addPage({layout: 'portrait', size: 'A4', margin: 0});
	}
	
	_renderHeader(doc, offset, businessAddress, clientAddress, identifier, date) {	
		//Row 1 left: Logo
		doc.image('images/logo.png', 60, offset,  {});
		
		//Row 1 right: Business address
		doc.font('fonts/Roboto-Regular.ttf').fontSize(10).text(businessAddress, doc.page.width-235, offset);
		
		//Separator between row 1 and row 2
		doc.strokeColor("#FFE700");
		doc.moveTo(55,offset+65).lineTo(doc.page.width-55,offset+65).stroke();
		
		//Row 2 left: Client address
		doc.font('fonts/Roboto-Regular.ttf').fontSize(10).text(clientAddress, 60, offset+85);

		//Row 2 right: Invoice type, reference and date
		doc.font('fonts/Roboto-Bold.ttf'   ).fontSize(18).text('Invoice',    doc.page.width-235, offset+80);
		doc.font('fonts/Roboto-Regular.ttf').fontSize(10).text('Reference',  doc.page.width-235, offset+100);
		doc.font('fonts/Roboto-Regular.ttf').fontSize(10).text(identifier,   doc.page.width-165, offset+100);
		doc.font('fonts/Roboto-Regular.ttf').fontSize(10).text('Date',       doc.page.width-235, offset+110);
		doc.font('fonts/Roboto-Regular.ttf').fontSize(10).text(date,         doc.page.width-165, offset+110);

		//Separator between row 2 and rest of document
		doc.strokeColor("#FFE700");
		doc.moveTo(55,offset+170).lineTo(doc.page.width-55,offset+170).stroke();
		
		//Return the offset the next part of the page should use
		return offset+190;
	}
	
	_renderFooter(doc) {
		const range = doc.bufferedPageRange(); // => { start: 0, count: 2 }

		var end = range.start + range.count;
		for (var i = range.start; i < end; i++) {

			doc.switchToPage(i);

			doc.strokeColor("#FFE700");
			doc.moveTo(55,doc.page.height-70).lineTo(doc.page.width-55,doc.page.height-70).stroke();
			doc.fillColor("#000000");
			doc.font('fonts/Roboto-Regular.ttf').fontSize(12).text('Page '+(i+1)+' of '+(range.count), 60, doc.page.height-60);
		}
	}
	
	_calcTableRow(columns) {
		var height     = 20;
		var lineHeight = 12;
		var maxLines   = 0;
		
		for (var i in columns) {
			var column = columns[i];
			var lineCount    = column.text.split("\n").length;
			if (lineCount > maxLines) maxLines = lineCount;
			var columnHeight = 10+lineHeight*lineCount;
			if (columnHeight > height) height = columnHeight;
		}
		return [height, lineHeight, maxLines];
	}
	
	_renderTableRow(doc, yOffset, even, header, columns, font='fonts/Roboto-Regular.ttf') {
		var xOffset    = 60;
		
		const _calc = this._calcTableRow(columns);
		var height = _calc[0];
		const lineHeight = _calc[1];
		const maxLines = _calc[2];
		
		for (var i in columns) {
			var column = columns[i];
			var lines = column.text.split("\n").length;		
			var currLineOffset = 5 + lineHeight*((maxLines-lines) / 2);
			
			if (header) {
				doc.fillColor("#000000");
				doc.rect(xOffset, yOffset, column.width, height).fill();
				doc.fillColor("#FFFFFF");
				doc.font('fonts/Roboto-Bold.ttf').fontSize(10).text(column.text, xOffset+5, yOffset+currLineOffset);
				doc.strokeColor("#FFE700");
				doc.moveTo(xOffset,yOffset+height-0.5).lineTo(xOffset+column.width,yOffset+height-0.5).stroke();
			} else {
				if (even) {
					doc.fillColor("#FFFFFF");
				} else {
					doc.fillColor("#F2F2F2");
				}
				doc.rect(xOffset, yOffset, column.width, height).fill();
				doc.fillColor("#000000");
				doc.font(font).fontSize(10).text(column.text, xOffset+5, yOffset+currLineOffset);
			}
			xOffset += column.width;
		}
		return yOffset+height;
	}
	
	_renderTable(doc, offset, headerColumns, data) {
		var lastColumns = [{text: "(Continues on the next page...)", width: doc.page.width-120}];
		
		var even = true;
		var first = true;
		for (var i in data) {
			var row = data[i];
			var newHeight = offset+this._calcTableRow(row)[0];
			if (first) newHeight += this._calcTableRow(headerColumns)[0];
			if (newHeight > (doc.page.height-70)) {
				//offset = renderTableRow(doc, offset, even, false, lastColumns, 'fonts/Roboto-Italic.ttf');
				offset = 70;
				this._addPage(doc);
				first = true;
			}
			
			if (first) {
				offset = this._renderTableRow(doc, offset, even, true, headerColumns);
				first = false;
			}
			
			for (var i in row) {
				if (typeof row[i].width != "Number") row[i].width = headerColumns[i].width;
			}
			
			offset = this._renderTableRow(doc, offset, even, false, row);
			//doc.moveTo(0,offset).lineTo(10,offset).stroke();
			even = !even;
		}
		return offset;
	}
	
	_renderTotals(doc, offset, data) {
		offset += 14;
		var totalsHeight = 0;
		for (var i in data) {
			var row = data[i];
			var linesText = row.text.split("\n").length;
			var linesValue = row.value.split("\n").length;
			var lines = linesText;
			if (linesValue > linesText) lines = linesValue;
			totalsHeight = lines * 12;
		}
		
		if (doc.page.height-70-totalsHeight < offset) {
			offset = 70;
			this._addPage(doc);
		}
		
		for (var i in data) {
			var row = data[i];
			var xOffset = doc.page.width - 55 - 150;
			var font = 'fonts/Roboto-Regular.ttf';
			if ((typeof row.bold != "undefined") && (row.bold)) font = 'fonts/Roboto-Bold.ttf';
			doc.font(font).fontSize(12).text(row.text, xOffset, offset);
			doc.font('fonts/Roboto-Regular.ttf').fontSize(12).text(row.value, xOffset + 100, offset);
			offset += 14;
		}
		return offset;
	}
}

module.exports  = PdfInvoice;
