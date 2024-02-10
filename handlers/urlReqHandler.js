/* eslint-disable indent */
/* eslint-disable no-unused-vars */
require('dotenv').config();
const path = require('path');
const createPresentation = require('../utils/createPresentation');
const OpenAI =  require('openai');
// eslint-disable-next-line no-undef
const openai = new OpenAI({apiKey: process.env.API_KEY});
const axios = require('axios');
const cheerio = require('cheerio');
const Buffer = require('Buffer');
const fs = require('fs');
const urlReqHandler = async (req, res) => {
	try {
    let html = '';
    const url = req.body.url;
    console.log('URL: ', url);
    await axios.get(url)
    .then(response => {
      html = response.data;
      html ? console.log('html recieved succesfully') : console.error('Error while requesting api, html is emty');
    })
    .catch(() => {
      res.status(500).json({ error: 'Провертье вашу ссылку или подождите немного и попробуйте заново' });
    });

    const $ = cheerio.load(html);
    const firstHeading = $('#firstHeading').text();
    console.log('first heading: ', firstHeading);

    let currentArray = [];
    const groupedPArray = [];
    const tSTextCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: `опиши эту тему 3-6 словами: ${firstHeading}` },
      ],
      model: 'gpt-3.5-turbo-0125',
    });
    const tsText = tSTextCompletion.choices[0].message.content;
    const ppData = {
      titleSlide: {
        title: firstHeading,
        text: tsText
      },
      mainSlides: []
    };

    const mwHeadlineArray = $('.mw-headline');
    const h2MwHeadlineArray = [];
    mwHeadlineArray.toArray().forEach(element => {
      if ($(element).parent().prop('name') === 'h2') h2MwHeadlineArray.push(element);
    });
    console.log(h2MwHeadlineArray.length); 

    let tagsBetween = [],
    resultPString = '',
    layout = 0,
    sentCount = 0,
    size = '',
    startDiv,
    endDiv,
    counter = 0;
    for (let i = 0; i< h2MwHeadlineArray.length; i++){
      if (i === 0 && counter === 0) {
        startDiv = $('p').first().prev();
        endDiv =$(h2MwHeadlineArray[i]).parent();
      } else if(i == h2MwHeadlineArray.length - 1){
        startDiv = $(h2MwHeadlineArray[i]).parent();
        endDiv = startDiv = $('p').last().next();
      } 
      else {
        startDiv = $(h2MwHeadlineArray[i]).parent();
        endDiv = $(h2MwHeadlineArray[i+1]).parent();
      }
      console.log('имя основного слайда: ', startDiv.text());
      tagsBetween = $(startDiv).nextUntil(endDiv).filter('p');
      if (tagsBetween.length <= 1) continue;
      for (let j = 0; j < tagsBetween.length; j++) {
        resultPString += $(tagsBetween[j]).text();
      }
      console.log('длина массива тегов основного слайда ', tagsBetween.length);
      // eslint-disable-next-line no-undef
      
      if (tagsBetween.length < 7) {
        layout = 2;
      } else {
        layout = 1;
      }
      
      switch(layout){
        case 1: {
          size = '1024x1792';
          sentCount = 4;
          break;
        } 
        case 2: {
          size = '1792x1024';
          sentCount = '1-2';
          break;
        }
        case 4:{
          size = '1024x1792';
          sentCount = '4-5';
          break;
        }
      }
      let mSTitle = '';
      if (startDiv.text().includes('[ред. | ред. код]')){
        mSTitle = startDiv.text().substring(0, startDiv.text().length - 17); 
      } else {
        mSTitle = startDiv.text();
      }
      // const image = await openai.images.generate({
      //   model: 'dall-e-2',
      //   prompt: startDiv,
      //   n: 1,
      //   size: size,
      //   style: 'vivid',
      //   quality: 'standard',
      //   response_format: 'b64_json'
      // });
      // let b64Data = image.data[0].b64_json;
      // const decodedImage = Buffer.from(b64Data, 'base64');
      //  eslint-disable-next-line no-undef
      const imagePath = path.join(__dirname, '..', 'images', `image${i}.jpg`);
      // fs.writeFile(imagePath, decodedImage, (err) => {
      //   if (err) {
      //     console.error('Ошибка при сохранении изображения:', err);
      //     return;
      //   }
      //   console.log('Изображение успешно сохранено в папку images.');
      // });
      const mSTextCompletion = await openai.chat.completions.create({
        messages: [
          { role: 'system', content: `перепеши текст ниже в ${sentCount} коротких предложениях, твоя задача сделать это информативно, так чтобы получилось засунуть все данные которые только можно, также старайся делать прдложения короткими\n${resultPString}` },
        ],
        model: 'gpt-3.5-turbo-0125',
      });
      resultPString = '';

      let mSSlideInfo = {
        title: mSTitle,
        text: mSTextCompletion.choices[0].message.content.replace(/\n/g, '    '),
        image: imagePath,
        layout: layout
      };
      ppData.mainSlides[i] = mSSlideInfo;
      if (i === 0 && counter === 0){
        counter++;
        i = -1;
      }
    }
    console.log(ppData);
    createPresentation(ppData);
    res.status(200).json({ message: 'Завершено', result: 'презентація зроблена' });
    } catch (error) {
      console.error('Произошла ошибка:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
    };
    module.exports = urlReqHandler;