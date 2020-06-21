'use strict';

const GenericFileRecord = require('../file.js');

class ImageFileRecord extends GenericFileRecord {
	/*
	 * An image file
	 */
	
	constructor(input=null) {
		super(input);
	}
}

ImageFileRecord.prototype.allowedMimeTypes = [
	"image/apng",    // Animated Portable Network Graphics
	"image/bmp",     // Bitmap file
	"image/gif",     // Graphics Interchange Format
	"image/x-icon",  // Microsoft Icon
	"image/jpeg",    // Joint Photographic Expert Group image
	"image/png",     // Portable Network Graphics
	"image/svg+xml", // Scalable Vector Graphics
	"image/webp",    // Web Picture format
];

module.exports = ImageFileRecord;
