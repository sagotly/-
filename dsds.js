/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable no-unused-vars */
const OpenAI =  require('openai');
// eslint-disable-next-line no-undef
const openai = new OpenAI({apiKey: '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'});
async function t(){
	const receivedData = 'нарисуй картинку по теме: искуственній интелект, ореинтируйся в сторону идеи о: Етичні аспекти використання штучного інтелекту';
	const image = await openai.images.generate({
		model: 'dall-e-3',
		prompt: receivedData,
		n: 1,
		size: '1024x1792',
		style: 'vivid',
		response_format: 'url'
	});
	console.log(image);
	return image;
}
console.log(t());