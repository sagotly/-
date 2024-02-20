/* eslint-disable indent */
const OpenAI =  require('openai');
const fs = require('fs');
const Buffer = require('Buffer');
const path = require('path');
const parseSentence = require('../utils/parseSentence');
const createPresentation = require('../utils/createPresentation');
const pdf = require('pdf-parse');
// eslint-disable-next-line no-undef
const openai = new OpenAI();
let counter =0;


/**
 * @typedef {Object} partObj - object that contains name and description of thwe part 
 * @property {string} name - name of the part
 * @property {string} desc - description of the part
 */

/**
 * Parses request for didvision text into parts with description.
 *
 * @function
 * @param {string} themesPrompt - The prompt for themes.
 * @param {string} fileContent - The content of the file.
 * @returns {Array<partObj>} - An array of objects containing name and description of themes.
 * @throws {Error} - If the counter exceeds 3.
 */
async function createPartsRequest(themesPrompt, fileContent) {
	if (counter > 3) return Error;
	const PartsCompletion = await openai.chat.completions.create({
		messages: [
			{ role: 'system', content: themesPrompt + fileContent},
		],
		model: 'gpt-3.5-turbo-0125',
	});
	// console.log(PartsCompletion.choices[0].message.content);
	const text = PartsCompletion.choices[0].message.content;
	console.log('RAW TEXT: ', text);
	// splitting text into array 
	let result;
	const textArray = text.split('\n');
	let resultArray = [];
	try{
		textArray.forEach(e => {
			if (e != ''){ //do nothing if element is empty 
				parseSentence(e); 
				const regexExpression = /(.+): (.+)/; //spliting element into 2 element array  
				result = regexExpression.exec(e);
				let obj = {
					name: result[1],
					desc: result[2],
				};
				resultArray.push(obj);
			}
		});
	} catch {
    //handling errors
		counter++;
		console.log('parsing themes failed, trying again...', `\ntry number ${counter}`);
		return await createPartsRequest(themesPrompt, fileContent);
	}
	console.log(resultArray);
	return resultArray;
	// Поиск совпадений в тексте
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
 * POST handler for file-based presentation request (/api/file_req)
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {ppData} - The data structure for the presentation
 * @throws {Error} - If an error occurs during the request handling.
 */
const fileReqHandler = async(req, res)=> {
  try{
		const startDate = Date.now();
		const file = req.file;
		let fileContent = '';
		console.log(path.extname(file.originalname));
    switch (path.extname(file.originalname)) { // Switching based on the file extension of the uploaded file's original name.
      case '.txt': {
        fileContent = file.buffer.toString('utf8'); // Read and store the content of the text file
        break;
      }
      case '.pdf': {
        // Extract text content from the PDF buffer using a PDF processing library.
        const pdfBuffer = file.buffer;
        const pdfObject = await pdf(pdfBuffer);
        fileContent = pdfObject.text;
        break;
      }
      default: {
        res.status(500).json({ error: 'Wrong extension' });
      }
    }

		const slidesCount = req.body.slidesCount;
		console.log(`file content: ${fileContent}\nslide count: ${slidesCount}`);
		const authorCompletion = await openai.chat.completions.create({ // title slide text request(author request)
			messages: [
				{ role: 'system', content: `відповиси у 2 слова, хто автор цього творення \n ${fileContent}` },
			],
			model: 'gpt-3.5-turbo-1106',
		});
		console.log('автор: ' + authorCompletion.choices[0].message.content);
    // getting fist line of the text, line is more than 40 char. generate name for the text
    const tsAuthor = authorCompletion.choices[0].message.content; 
		const trimmedText = fileContent.trim();
		const firstNewlineIndex = trimmedText.indexOf('\n');
		let  tsTitle = firstNewlineIndex !== -1 ? trimmedText.substring(0, firstNewlineIndex) : trimmedText;
		tsTitle = tsTitle.trim();
		if (tsTitle.length > 40) {
			const TitleCompletion = await openai.chat.completions.create({
				messages: [
					{ role: 'system', content: `дай коротку назву даному твореню \n ${fileContent}` },
				],
				model: 'gpt-3.5-turbo-1106',
			});
			tsTitle = TitleCompletion.choices[0].message.content;
		}
		const ppData = {
			titleSlide: {
				title: tsTitle,
				text: tsAuthor
			},
			mainSlides: []
		};
		
		const themesPrompt = `розділи цей текст на  ${slidesCount} частин, ім'я та опис частини повинні розділятися двокрапкою (':') части должны четко просматриваться в тексте, частини повинні чітко переглядатися в тексті, описи бути якомога більш наближені до основного тексту, також описи повинні бути як мінімум довжиною в 2 пропозиції\n`,
		descriptionPrompt1 = 'тобі дан опис:  ',
		conclusionPrompt = 'напиши короткий висновок для презентації про текст нижче який підбиває підсумки і красиво завершує презентацію, стиль тексту має бути нейтральним',
		descriptionPrompt2 = 'доповни цей опис ще на 1 абзац у доповідному стилі, та використовуй як джерело основне оповідання що знаходитись у лапках знизу \n',
		partsArray = await createPartsRequest(themesPrompt, fileContent);
		let multiplier = 0;

		console.log('длина массива: ' + partsArray.length);
    //loop for generating main slides info
		for (let i = 0; i < partsArray.length; i++){
      // layout handling
			let layout = Math.floor(Math.random() * 2 + multiplier) + 1; //adding multiplier to have more evenly distributed layouts throughout the presentation
			let size;
			let max_tok;
			if (multiplier >= 0.5) layout = 2; multiplier = 0; 
			if (multiplier <= -0.5) layout = 1; multiplier = 0;
			switch (layout){
				case 1: {
					size = '1024x1792'; //size of the image
					console.log('layout = 1');
					multiplier = multiplier + 0.1;
					max_tok = 700; //max tokens gpt model can generate
					break;
				}
				case 2:{
					size = '1792x1024';
					console.log('layout = 2');
					multiplier = multiplier + 0.1;
				}
			}

			console.log('multiplier is: ', multiplier);
			console.log('Sending main slide text request');
			let msTextComplitionPrompt = descriptionPrompt1 + partsArray[i].name + ':' + partsArray[i].desc + descriptionPrompt2 + fileContent;
			if (layout == 2) msTextComplitionPrompt = 'збільши цей текст на 2 речення: ' + partsArray[i].desc;
			console.log('msTextComplitionPrompt: ', msTextComplitionPrompt);
			const mainSlideTextCompletion = await openai.chat.completions.create({ //main slide text request
				messages: [
					{ role: 'system', content: msTextComplitionPrompt},
				],
				max_tokens: max_tok,
				model: 'gpt-3.5-turbo-1106',
			});
			const msTitle = parseSentence(partsArray[i].name);	
			const msText = parseSentence(mainSlideTextCompletion.choices[0].message.content);
			
			const image = await openai.images.generate({ //image request
				model: 'dall-e-3',
				prompt: partsArray[i].desc,
				n: 1,
				size: size,
				style: 'vivid',
				quality: 'standard',
				response_format: 'b64_json'
			});
      //decoding and saving image into ../images
			let b64Data = image.data[0].b64_json;
			const decodedImage = Buffer.from(b64Data, 'base64');
			//  eslint-disable-next-line no-undef
			const imagePath = path.join(__dirname, '..', 'images', `image${i}.jpg`);
			fs.writeFile(imagePath, decodedImage, (err) => {
				if (err) {
					console.error('Ошибка при сохранении изображения:', err);
					return;
				}
				console.log('Изображение успешно сохранено в папку images.');
			});
			/**
       * main slide obj @see{PpData}
       */
			const mainSlideInfo = {
				title: msTitle,
				text: msText,
				image: imagePath,
				layout: layout
			};
			
			console.log(mainSlideInfo);
			ppData.mainSlides[i] = mainSlideInfo;
		}
		//creating conclusion slide that will summaraize given text
		const conclusionCompletion = await openai.chat.completions.create({
			messages: [
				{ role: 'system', content: conclusionPrompt + fileContent },
			],
			model: 'gpt-3.5-turbo',
		});
		const conclusionText = conclusionCompletion.choices[0].message.content;
		const conclusionSlide = {
			title: 'висновок',
			layout: 3,
			text: conclusionText
		};
		ppData.mainSlides.push(conclusionSlide);
		
		const endDate = Date.now();
		console.log(`Time spend: ${endDate - startDate}`);
		console.log(ppData);

		createPresentation(ppData);
		res.status(200).json({ message: 'Завершено', result: 'презентація зроблена' });
	} catch(err){  
		console.error('Произошла ошибка:', err);
		res.status(500).json({ error: 'Внутренняя ошибка сервера' });
	}
};

module.exports = fileReqHandler;