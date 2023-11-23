const getHandler = (req, res) =>{
	// Отправляем HTML-страницу при обращении к /page
	res.sendFile('C:/Users/User/Desktop/projects/МАН2023/index.html');
};
module.exports = getHandler;