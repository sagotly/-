const path  = require('path');
/**
 * GET handler for file upload html page
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {void}
 */
const getFileUploadHandler = (req, res) =>{
	// eslint-disable-next-line no-undef
	const dirPath = path.join(__dirname, '..', 'html', 'fileUpload.html');
	res.sendFile(dirPath);
};
module.exports = getFileUploadHandler;