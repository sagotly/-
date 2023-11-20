/* eslint-disable linebreak-style */
const bodyParser = require('body-parser');
const express = require('express');
const openAiHandler = require('./handlers/inputHandler');
const getHandler = require('./handlers/getHandler');
const route = express();
route.use(bodyParser.json());

route.get('/api/process_data', getHandler);
route.post('/api/process_data', openAiHandler);
route.listen(3000, () => {
	console.log('Сервер запущен');
});
