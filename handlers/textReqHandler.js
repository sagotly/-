/* eslint-disable indent */
/* eslint-disable no-unused-vars */
require('dotenv').config();
const createPresentation = require('../utils/createPresentation');
const OpenAI =  require('openai');
// eslint-disable-next-line no-undef
const openai = new OpenAI();
const fs = require('fs');
const path = require('path');
const Buffer = require('Buffer');
/**
 * Parses GPT output using regular expressions to extract themes.
 *
 * @param {string} text - The input text containing GPT output.
 * @returns {string[]} An array of themes extracted from the input text.
 * @throws {Error} If there is an issue with the regular expression or parsing.
 * @async
 * @example
 * const gptOutput = '1. Вплив комп'ютерних ігор на розвиток дітей\n2. Історія та еволюція настільних ігор';
 * const themes = await parseThemesRequest(gptOutput);
 * console.log(themes); /* 
 * 0[
 * 'Вплив комп'ютерних ігор на розвиток дітей',
 * 'Історія та еволюція настільних ігор'
 * ]
 */
async function parseThemesRequest(text) {
  console.log(text);
	const regex = /\n([^:\n]+)/g;
	const matches = text.match(regex);
    
	if (matches) {
		// Удаляем ведущий символ новой строки из каждого соответствия
		const partsArray = matches.map(match => match.substring(1));
  
		return partsArray;
	}
    
	return [];
}

/**
 * Retrieves ideas based on the input.
 *
 * @param {string} input - The input to generate ideas from.
 * @returns {Array<string>} - A promise that resolves to an array of ideas.
 */
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

/**
 * Represents data structure for presentation.
 * @typedef {Object} PpData
 * @property {Object} titleSlide - Object representing the title slide.
 * @property {string} titleSlide.title - The title of the title slide.
 * @property {string} titleSlide.text - The text of the title slide.
 * @property {Array<Object>} mainSlides - Array of objects representing main slides.
 * @property {string} mainSlides.title - The title of a main slide.
 * @property {string} mainSlides.text - The text of a main slide.
 * @property {string} mainSlides.image - The path to the image for a main slide.
 * @property {string} mainSlides.layout - The layout of a main slide (as a string or int).
 */

/**
 * POST handler for theme-based presentation request (/api/procces_data)
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {ppData} - A promise that resolves to the response object.
 * @throws {Error} - If an error occurs during the request handling.
 */
const openAiHandler = async (req, res) => {
	try {
		const receivedData = req.body.topic;
    const slidesCount = parseInt(req.body.slidesCount);
		console.log('Request input:', receivedData);
		console.log('Request slidesCount:', slidesCount);
    
    const 
      titleTextPrompt = `Напиши 1 речення для презентації на обрану тему: ${receivedData},`,
      ideasPrompt = `(пиши украинською мовою) дай мені теми: ${receivedData}`;

    const ppData = {
      titleSlide: {title: receivedData},
      mainSlides: []
    };
    
		console.log('sending Request...');
		const startDate = Date.now();
    const ideas = await getIdeas(ideasPrompt);
    console.log('ideas:', ideas);

    const TitleCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: titleTextPrompt },
      ],
      model: 'gpt-3.5-turbo-1106',
    });
    ppData.titleSlide.text = TitleCompletion.choices[0].message.content;
    console.log(TitleCompletion.choices);
    
    // Loop for generating main slides info
    for(let i = 0; i < slidesCount; i++){

      const layout = Math.floor(Math.random() * 2) + 1;
      let size;
      let parNum;
      let max_tok;
      switch (layout){
        case 1: {
          size = '1024x1792'; //size of the image
          parNum = 1;
          max_tok = 520; //max tokens that gpt model will generate
          break;
        }
        case 2:{
          size = '1792x1024';
          parNum = 1;
          max_tok = 240;
        }
      }
      const image = await openai.images.generate({ //image request
        model: 'dall-e-3',
        prompt: receivedData,
        n: 1,
        size: size,
        style: 'vivid',
        response_format: 'b64_json'
      });
      //decoding from base64 and saving into ../images
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
      const textCompletion = await openai.chat.completions.create({ //main slide text request
        messages: [
          { role: 'system', content: `напиши ${parNum} абзаців по теме: ${receivedData}: ${ideas[i]}`, } 
        ],
        max_tokens: max_tok,
        model: 'gpt-3.5-turbo-1106',
      });
      console.log(textCompletion.choices);
      /**
       * main slide obj @see{PpData}
       */
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
		// sending answer
		res.status(200).json({ message: 'Завершено', result: 'презентація зроблена' });
	} catch (error) {
		console.error('Произошла ошибка:', error);
		res.status(500).json({ error: 'Внутренняя ошибка сервера' });
	}
};
module.exports = openAiHandler;