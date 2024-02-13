const path  = require('path');

const getUrlReqHandler = (req, res) =>{
	// Отправляем HTML-страницу при обращении к /page
	// eslint-disable-next-line no-undef
	const dirPath = path.join(__dirname, '..', 'html', 'urlReq.html');
	res.sendFile(dirPath);
};
module.exports = getUrlReqHandler;