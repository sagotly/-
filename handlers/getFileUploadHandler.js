const path  = require('path');

const getFileUploadHandler = (req, res) =>{
	// Отправляем HTML-страницу при обращении к /page
	// eslint-disable-next-line no-undef
	const dirPath = path.join(__dirname, '..', 'html', 'fileUpload.html');
	res.sendFile(dirPath);
};
module.exports = getFileUploadHandler;