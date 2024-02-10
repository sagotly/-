const getMainHandler = (req, res) =>{
	// Отправляем HTML-страницу при обращении к /page
	res.sendFile('C:/Users/User/Desktop/МАН2023/html/index.html');
};
module.exports = getMainHandler;