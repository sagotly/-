const lodash = require('lodash');

/**
 * Replaces forbidden characters in a file name with an underscore.
 *
 * @param {string} fileName - The name of the file to sanitize.
 * @returns {string} The sanitized file name.
 */
function sanitizeFilePath(fileName) {
	const sanitizedFileName = lodash.replace(fileName, /[\\/?<>\\:\\*\\|":,!]/g, '_');
	return sanitizedFileName;
}

module.exports = sanitizeFilePath;