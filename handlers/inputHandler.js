/* eslint-disable indent */
/* eslint-disable no-unused-vars */
require('dotenv').config();

const OpenAI =  require('openai');
// eslint-disable-next-line no-undef
const openai = new OpenAI({apiKey: process.env.API_KEY});
const fs = require('fs');
const path = require('path');
const Buffer = require('Buffer');
const pptxgen = require('pptxgenjs');
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

function createPresentation(data){
	const pptx = new pptxgen();
	
	const titleSlide = pptx.addSlide();
	
	titleSlide.addText(data.titleSlide.title, { x: 0, y: 1, w: '100%', h: 1.5, fontSize: 48, align: 'center', color: '363636', bold: true});
	
	// Добавляем подзаголовок
	titleSlide.addText(data.titleSlide.text, { x: 1, y: 3, w: '80%', h: 1.5, fontSize: 24, align: 'center', color: '757575',});
	data.mainSlides.forEach(mainSlide => {
		let mainWorkSlide = pptx.addSlide();
		switch(mainSlide.layout){
		case 1: {
			mainWorkSlide.addImage({path: mainSlide.image, x: '65.5%', y: '5%', w:'30%', h: '90%'});
			mainWorkSlide.addText(mainSlide.title, {x: '5%', y:'5%', w:'60%', h: '18.5%', color: '363636', fontSize: 30, bold: true});
			mainWorkSlide.addText(mainSlide.text, {x: '5%', y:'18.75%', h: '75.5%', w:'60.5%', color:'757575', fontSize: 16});		
			break;
		}
		case 2: {
			mainWorkSlide.addImage({path: mainSlide.image, x: '35%', y: '22.5%', w:'60%', h: '66.5%'});
			mainWorkSlide.addText(mainSlide.title, {x: '5%', y: '2.5%', w: '90%', h: '20%', color: '363636', fontSize: 34, bold: true});
			mainWorkSlide.addText(mainSlide.text, {x: '5%', y: '22.5%', h: '66.5%', w: '30%', color: '757575', fontSize: 16 });	
		}
		}
		// Сохраняем презентацию
	});
	pptx.writeFile(`presentations\\презентація_${data.titleSlide.title}`, (error) => {
		if (error) {
			console.log(error);
		} else {
			console.log('Презентация успешно создана!');
		}
	});
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
      switch (layout){
        case 1: {
          size = '1024x1792';
          parNum = 1;
          break;
        }
        case 2:{
          size = '1792x1024';
          parNum = 2;
        }
      }
      const image = await openai.images.generate({
        model: 'dall-e-3',
        prompt: receivedData,
        n: 1,
        size: size,
        style: 'vivid',
        response_format: 'b64_json'
      });
      let b64Data = image.data[0].b64_json;
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
          { role: 'system', content: `напиши ${parNum} абзаців по теме: ${receivedData}: ${ideas[i]}`, } 
        ],
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