'use strict';

const GenericFile = require('./genericFile.js');

class ImageFile extends GenericFile {
	/*
	 * An image file
	 */
	
	constructor(input=null) {
		super();
		if (input !== null) {
			this.deserialize(input);
		}
	}
}

ImageFile.prototype.allowedMimeTypes = [
	"image/apng",    // Animated Portable Network Graphics
	"image/bmp",     // Bitmap file
	"image/gif",     // Graphics Interchange Format
	"image/x-icon",  // Microsoft Icon
	"image/jpeg",    // Joint Photographic Expert Group image
	"image/png",     // Portable Network Graphics
	"image/svg+xml", // Scalable Vector Graphics
	"image/webp",    // Web Picture format
];

module.exports = ImageFile;
