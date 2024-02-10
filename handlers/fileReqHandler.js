/* eslint-disable indent */
const OpenAI =  require('openai');
const fs = require('fs');
const Buffer = require('Buffer');
const path = require('path');
const parseSentence = require('../utils/parseSentence');
const createPresentation = require('../utils/createPresentation');
const pdf = require('pdf-parse');
// eslint-disable-next-line no-undef
const openai = new OpenAI({apiKey: process.env.API_KEY});

let counter =0;
async function parseThemesRequest(themesPrompt, fileContent) {
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
	// Регулярное выражение с учетом переноса строки
	let result;
	const textArray = text.split(/\n/);
	let resultArray = [];
	try{
		textArray.forEach(e => {
			if (e != ''){
				parseSentence(e);
				const regexExpression = /(.+): (.+)/;
				result = regexExpression.exec(e);
				let obj = {
					name: result[1],
					desc: result[2],
				};
				resultArray.push(obj);
			}
		});
	} catch {
		counter++;
		console.log('parsing themes failed, trying again...', `\ntry number ${counter}`);
		return await parseThemesRequest(themesPrompt, fileContent);
	}
	console.log(resultArray);
	return resultArray;
	// Поиск совпадений в тексте
}

const fileReqHandler = async(req, res)=> {
	try{
		const startDate = Date.now();
		const file = req.file;
		let fileContent = '';
		console.log(path.extname(file.originalname));
		switch (path.extname(file.originalname)){			
			case '.txt': {
				fileContent = file.buffer.toString('utf8');
				break;
			}
			case '.pdf': {
				const pdfBuffer = file.buffer;
				const pdfObject = await pdf(pdfBuffer);
				fileContent = pdfObject.text;
				break;
			}
			default: {
				res.status(res.status(500).json({error: 'Wrong extension'}));
			}
		}
		const slidesCount = req.body.slidesCount;
		console.log(`file content: ${fileContent}\nslide count: ${slidesCount}`);
		const authorCompletion = await openai.chat.completions.create({
			messages: [
				{ role: 'system', content: `ответь в 2 слова. Кто автор данного произведения? \n ${fileContent}` },
			],
			model: 'gpt-3.5-turbo-1106',
		});
		console.log('автор: ' + authorCompletion.choices[0].message.content);

        const tsAuthor = authorCompletion.choices[0].message.content; 
		const trimmedText = fileContent.trim();
		const firstNewlineIndex = trimmedText.indexOf('\n');
		let  tsTitle = firstNewlineIndex !== -1 ? trimmedText.substring(0, firstNewlineIndex) : trimmedText;
		tsTitle = tsTitle.trim();
		if (tsTitle.length > 40) {
			const TitleCompletion = await openai.chat.completions.create({
				messages: [
					{ role: 'system', content: `дай короткое название этому произведению \n ${fileContent}` },
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
		
		const themesPrompt = `раздели текст в низу в ковычках на ${slidesCount} частей, имя и описание части должны разделяться двоеточием (':')части должны четко просматриваться в тексте, описания быть как можно более приближенны к основному тексту, также описания должні біть как минимум длинной в 2 предложения\n`,
		descriptionPrompt1 = 'тебе дано описисание:  ',
		conclusionPrompt = 'напиши короткий вывод для презентации о тексте ниже который подводит итоги и красиво завершает презентацию, стиль текста должен быть нейтральным\n',
		descriptionPrompt2 = 'дополни это описание еще на 2 абзаца в докладном стиле, и используй как источник основной рассказ который находиться в ковычках снизу \n',
		partsArray = await parseThemesRequest(themesPrompt, fileContent);
		let multiplier = 0;

		console.log('длина массива: ' + partsArray.length);
		for (let i = 0; i < partsArray.length; i++){
			let layout = Math.floor(Math.random() * 2 + multiplier) + 1;
			// let size;
			let max_tok;
			if (multiplier >= 0.5) layout = 2; multiplier = 0; 
			if (multiplier <= -0.5) layout = 1; multiplier = 0;
			switch (layout){
				case 1: {
					console.log('layout = 1');
					multiplier = multiplier + 0.1;
					max_tok = 700;
					break;
				}
				case 2:{
					console.log('layout = 2');
					multiplier = multiplier + 0.1;
				}
			}
			console.log('multiplier is: ', multiplier);
			console.log('Sending main slide text request');
			let msTextComplitionPrompt = descriptionPrompt1 + partsArray[i].name + ':' + partsArray[i].desc + descriptionPrompt2 + fileContent;
			if (layout == 2) msTextComplitionPrompt = 'увеличь данный текст на 2 предложения: ' + partsArray[i].desc;
			console.log('msTextComplitionPrompt: ', msTextComplitionPrompt);
			const mainSlideTextCompletion = await openai.chat.completions.create({
				messages: [
					{ role: 'system', content: msTextComplitionPrompt},
				],
				max_tokens: max_tok,
				model: 'gpt-3.5-turbo-1106',
			});
			const msTitle = parseSentence(partsArray[i].name);	
			const msText = parseSentence(mainSlideTextCompletion.choices[0].message.content);
			
			const image = await openai.images.generate({
				model: 'dall-e-2',
				prompt: partsArray[i].desc,
				n: 1,
				size: '256x256',
				style: 'vivid',
				quality: 'standard',
				response_format: 'b64_json'
			});
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
			
			const mainSlideInfo = {
				title: msTitle,
				text: msText,
				image: imagePath,
				layout: layout
			};
			
			console.log(mainSlideInfo);
			ppData.mainSlides[i] = mainSlideInfo;
		}
		
		const TitleCompletion = await openai.chat.completions.create({
			messages: [
				{ role: 'system', content: conclusionPrompt + fileContent },
			],
			model: 'gpt-3.5-turbo', //gpt 4
		});
		const conclusionText = TitleCompletion.choices[0].message.content;
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