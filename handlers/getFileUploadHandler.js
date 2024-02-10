const getFileUploadHandler = (req, res) =>{
	// Отправляем HTML-страницу при обращении к /page
	res.sendFile('C:/Users/User/Desktop/МАН2023/html/fileUpload.html');
};
module.exports = getFileUploadHandler;