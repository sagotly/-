const path  = require('path');

const getMainHandler = (req, res) =>{
	// Отправляем HTML-страницу при обращении к /page
	// eslint-disable-next-line no-undef
	const dirPath = path.join(__dirname, '..', 'html', 'index.html');
	res.sendFile(dirPath);
};
module.exports = getMainHandler;