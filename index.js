/* eslint-disable linebreak-style */
const multer = require('multer');
const bodyParser = require('body-parser');
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });
const express = require('express');
const openAiHandler = require('./handlers/textReqHandler');
const getfile_uploadHandler = require('./handlers/getFileUploadHandler');
const getHandler = require('./handlers/getMainHandler');
const fileReqHandler = require('./handlers/fileReqHandler');
const getUrlReqHandler = require('./handlers/getUrlReqHandler');
const urlReqHandler = require('./handlers/urlReqHandler');

const route = express();
route.use(bodyParser.json());
route.get('/api/process_data', getHandler);
route.post('/api/process_data', openAiHandler);
route.post('/api/file_upload', upload.single('file'), fileReqHandler);
route.get('/api/file_upload', getfile_uploadHandler);
route.get('/api/url_req', getUrlReqHandler);
route.post('/api/url_req', urlReqHandler);
route.listen(3000, () => {
	console.log('Сервер запущен');
});
