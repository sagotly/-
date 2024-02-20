const path  = require('path');
/**
 * GET handler for main html page
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {void}
 */
const getMainHandler = (req, res) =>{
	// eslint-disable-next-line no-undef
	const dirPath = path.join(__dirname, '..', 'html', 'index.html');
	res.sendFile(dirPath);
};
module.exports = getMainHandler;