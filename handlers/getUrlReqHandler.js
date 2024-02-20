const path  = require('path');
/**
 * GET handler for url request html page
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {void}
 */
const getUrlReqHandler = (req, res) =>{
	// eslint-disable-next-line no-undef
	const dirPath = path.join(__dirname, '..', 'html', 'urlReq.html');
	res.sendFile(dirPath);
};
module.exports = getUrlReqHandler;