/* eslint-disable indent */
/* eslint-disable no-unused-vars */
require('dotenv').config();
const createPresentation = require('../utils/createPresentation');
const OpenAI =  require('openai');
// eslint-disable-next-line no-undef
const openai = new OpenAI({apiKey: process.env.API_KEY});
const fs = require('fs');
const path = require('path');
const Buffer = require('Buffer');

async function parseThemesRequest(text) {
  
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
  let partsArray = await parseThemesRequest(result);
  partsArray = partsArray.map(part => part.replace(/^\d+\.\s*/, ''));
  console.log('ideas:', partsArray);
  return partsArray;
}



const openAiHandler = async (req, res) => {
	try {
		const receivedData = req.body.topic;
    const slidesCount = parseInt(req.body.slidesCount);
		console.log('Request input:', receivedData);
		console.log('Request slidesCount:', slidesCount);
    
    const 
      titleTextRequest = `Напиши 1 речення для презентації на обрану тему: ${receivedData},`,
      ideasRequest = `(пиши украинською мовою) дай мені теми: ${receivedData}`;

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
    
    
    for(let i = 0; i < slidesCount; i++){
      const layout = Math.floor(Math.random() * 2) + 1;
      let size;
      let parNum;
      let max_tok;
      switch (layout){
        case 1: {
          size = '1024x1792';
          parNum = 1;
          max_tok = 520;
          break;
        }
        case 2:{
          size = '1792x1024';
          parNum = 1;
          max_tok = 240;
        }
      }
      // const image = await openai.images.generate({
      //   model: 'dall-e-3',
      //   prompt: receivedData,
      //   n: 1,
      //   size: size,
      //   style: 'vivid',
      //   response_format: 'b64_json'
      // });
      // let b64Data = image.data[0].b64_json;
      // const decodedImage = Buffer.from(b64Data, 'base64');
      // eslint-disable-next-line no-undef
      const imagePath = path.join(__dirname, '..', 'images', `image${i}.jpg`);
      // fs.writeFile(imagePath, decodedImage, (err) => {
      //   if (err) {
      //     console.error('Ошибка при сохранении изображения:', err);
      //     return;
      //   }
      //   console.log('Изображение успешно сохранено в папку images.');
      // });
      console.log('sending main slide text request');
      const textCompletion = await openai.chat.completions.create({
        messages: [
          { role: 'system', content: `напиши ${parNum} абзаців по теме: ${receivedData}: ${ideas[i]}`, } 
        ],
        max_tokens: max_tok,
        model: 'gpt-3.5-turbo-1106',
      });
      console.log(textCompletion.choices);
      let objResult ={
        title: ideas[i], 
        text: textCompletion.choices[0].message.content,
        image: imagePath,
        layout: layout
      };
      ppData.mainSlides[i] = objResult;
    }

		const endDate = Date.now();

		console.log('время реквста: ', endDate - startDate);

		
		createPresentation(ppData);
		// Отправляем ответ на клиентскую часть после завершения обработки
		res.status(200).json({ message: 'Завершено', result: 'презентація зроблена' });
	} catch (error) {
		console.error('Произошла ошибка:', error);
		res.status(500).json({ error: 'Внутренняя ошибка сервера' });
	}
};
module.exports = openAiHandler;