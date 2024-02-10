const getUrlReqHandler = (req, res) =>{
	// Отправляем HTML-страницу при обращении к /page
	res.sendFile('C:/Users/User/Desktop/МАН2023/html/urlReq.html');
};
module.exports = getUrlReqHandler;