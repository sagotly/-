const lodash = require('lodash');

function sanitizeFilePath(fileName) {
	// Заменить запрещенные символы на подчеркивания
	const sanitizedFileName = lodash.replace(fileName, /[\\/?<>\\:\\*\\|":,!]/g, '_');


	return sanitizedFileName;

}

module.exports = sanitizeFilePath;