/* eslint-disable indent */
/* eslint-disable no-unused-vars */
require('dotenv').config();

const OpenAI =  require('openai');
// eslint-disable-next-line no-undef
const openai = new OpenAI({apiKey: process.env.API_KEY});
const officegen = require('officegen');
const fs = require('fs');
const path = require('path');
const Buffer = require('Buffer');

async function parseIdeasRequest(text) {
  if (typeof text !== 'string') {
      return [];
  }

  const regex = /\n([^:\n]+)/g;
  const matches = text.match(regex);
  
  if (matches) {
      // Удаляем ведущий символ новой строки из каждого соответствия
      const partsArray = matches.map(match => match.substring(1));

      return partsArray;
  }
  
  return [];
}

async function getIdeas (input){
  const textCompletion = await openai.chat.completions.create({
      messages: [
          { role: 'system', content: `дай темы об: ${input}`} 
      ],
      model: 'gpt-3.5-turbo-1106',   
  });
  const result = textCompletion.choices[0].message.content;
  let partsArray = await parseIdeasRequest(result);
  partsArray = partsArray.map(part => part.replace(/^\d+\.\s*/, ''));
  console.log('ideas:', partsArray);
  return partsArray;
}

function createPresentation(data) {
	console.log(data);
	const pptx = officegen('pptx');

	let titleSlide = pptx.makeTitleSlide(data.titleSlide.title, data.titleSlide.text);

	data.mainSlides.forEach(element => {
		// Создаем объекты слайдов и сохраняем их в переменной mainSlide
		let mainSlide = pptx.makeObjSlide(element.title, element.text);
	});

	// eslint-disable-next-line no-undef
	const filePath = path.join(__dirname, '..', 'presentations', '/AIpresentaition.pptx'); // Укажите путь для сохранения новой презентации
	const outputStream = fs.createWriteStream(filePath);
	pptx.generate(outputStream);
	outputStream.on('close', () => {
		console.log('Презентация успешно создана!');
	});
  
	outputStream.on('error', (err) => {
		console.log('Ошибка при создании презентации:', err);
	});
}

const openAiHandler = async (req, res) => {
	try {
		const receivedData = req.body.topic;
    const slidesCount = parseInt(req.body.slidesCount);
		console.log('Request input:', receivedData);
		console.log('Request slidesCount:', slidesCount);
    
    const 
      titleTextRequest = `напиши 1 вступительное предложение для презентации по теме: ${receivedData},`,
      ideasRequest = `дай темы об: ${receivedData}`;

    const ppData = {
      titleSlide: {title: receivedData},
      mainSlides: []
    };
    
		console.log('sending Request...');
		const startDate = Date.now();
    const ideas = await getIdeas(ideasRequest);
    console.log('ideas:', ideas);

    const TitleCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: titleTextRequest },
      ],
      model: 'gpt-3.5-turbo-1106',
    });
    ppData.titleSlide.text = TitleCompletion.choices[0].message.content;
    console.log(TitleCompletion.choices);
    
    const image = await openai.images.generate({
      model: 'dall-e-2',
      prompt: receivedData,
      n: parseInt(slidesCount),
      size: '256x256',
      style: 'natural',
      response_format: 'b64_json'
    });

    for(let i = 0; i < slidesCount; i++){
      let b64Data = image.data[i].b64_json;
      const decodedImage = Buffer.from(b64Data, 'base64');
      // eslint-disable-next-line no-undef
      const imagePath = path.join(__dirname, '..', 'images', `image${i}.jpg`);
      fs.writeFile(imagePath, decodedImage, (err) => {
        if (err) {
          console.error('Ошибка при сохранении изображения:', err);
          return;
        }
        console.log('Изображение успешно сохранено в папку images.');
      });
      console.log('sending main slide text request');
      const textCompletion = await openai.chat.completions.create({
        messages: [
          { role: 'system', content: `напиши текст по теме: ${receivedData}: ${ideas[i]}`, } 
        ],
        model: 'gpt-3.5-turbo-1106',
      });
      console.log(textCompletion.choices);
      let objResult ={
        title: ideas[i], 
        text: textCompletion.choices[0].message.content,
        image: imagePath,
        layout: Math.floor(Math.random() * 4) + 1
      };
      ppData.mainSlides[i] = objResult;
    }

		const endDate = Date.now();

		console.log('время реквста: ', endDate - startDate);

		
		createPresentation(ppData);
		// Отправляем ответ на клиентскую часть после завершения обработки
		res.status(200).json({ message: 'Завершено', result: 'презентация создана' });
	} catch (error) {
		console.error('Произошла ошибка:', error);
		res.status(500).json({ error: 'Внутренняя ошибка сервера' });
	}
};
module.exports = openAiHandler;