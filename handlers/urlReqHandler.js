
/* eslint-disable indent */
/* eslint-disable no-unused-vars */
require('dotenv').config();
const path = require('path');
const createPresentation = require('../utils/createPresentation');
const OpenAI =  require('openai');
// eslint-disable-next-line no-undef
const openai = new OpenAI();
const axios = require('axios');
const cheerio = require('cheerio');
const Buffer = require('Buffer');
const fs = require('fs');

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
 * POST handler for link-based presentation request (/api/url_req)
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {PpData} - A promise that resolves to the response object.
 * @throws {Error} - If an error occurs during the request handling.
 */
const urlReqHandler = async (req, res) => {
  try {
    //sending get request to Wikipedia and writing html page to var 
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
    const firstHeading = $('#firstHeading').text(); //finding tag with id firstHeadin, this tag contain the name of the presentation
    console.log('first heading: ', firstHeading);

    // sending request to openAi api to create text for title slide
    const tSTextCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: `опиши цю тему 3-6 словами ${firstHeading}` },
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

    const mwHeadlineArray = $('.mw-headline'); //finding all tags with the class .mw-headline
    const h2MwHeadlineArray = [];
    /* There are 2 types of tags that have mw-headline class: h2 and h3 
    iteraite the mwHeadlineArray and push to h2MwHeadlineArray only h2 tags */
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
    for (let i = 0; i< h2MwHeadlineArray.length; i++){ // Iteraiting based on h2MwHeadlineArray length, this loop creates data main slides
      if (i === 0 && counter === 0) { //assigning start and end divs, to get all <p> tags beetwen them
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
      tagsBetween = $(startDiv).nextUntil(endDiv).filter('p'); //getting all <p> between start and end divs
      if (tagsBetween.length <= 1) continue; //if less than 2 <p> tags then continue the loop to avoid footer and link parts of the article
      for (let j = 0; j < tagsBetween.length; j++) {
        resultPString += $(tagsBetween[j]).text(); //adding all text between <p> tags to result string
      }
      console.log('длина массива тегов основного слайда ', tagsBetween.length);
      // eslint-disable-next-line no-undef
      
      if (tagsBetween.length < 7) { //declaring layout based on quantity of <p> tags
        layout = 2;
      } else {
        layout = 1;
      }
      
      switch(layout){ //declaring options for layout
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
      }
      let mSTitle = '';
      if (startDiv.text().includes('[ред. | ред. код]')){ //getting rid of [ред. | ред. код] at the end if needed
        mSTitle = startDiv.text().substring(0, startDiv.text().length - 17); 
      } else {
        mSTitle = startDiv.text();
      }
      const image = await openai.images.generate({ //sending request to openAi api to generate image based on slide title (aka startDiv)
        model: 'dall-e-3',
        prompt: mSTitle,
        n: 1,
        size: size,
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

      const mSTextCompletion = await openai.chat.completions.create({ //sending request to openAi api to generate main slide text based on result string (aka text in <p> tags between start and end divs)
        messages: [
          { role: 'system', content: `перпеши текст низиче в ${sentCount} у коротких реченнях, твоя задача зробити це інформативно, так щоб вийшло засунути усі дані які тількі можливо, также намагайся зробити речення короткими\n${resultPString}` },
        ],
        model: 'gpt-3.5-turbo-0125',
      });
      resultPString = '';

      let mSSlideInfo = {
        title: mSTitle,
        text: mSTextCompletion.choices[0].message.content.replace(/\n/g, '    '), //replacing all new lines with 4 spaces to avoid overlaping between text and title
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