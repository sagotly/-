const pptxgen = require('pptxgenjs');
const sanitizeFilePath = require('./cleanPath');
const path = require('path');
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
			mainWorkSlide.addText(mainSlide.title, {x: '5%', y:'5%', w:'60%', h: '18.5%', color: '363636', fontSize: 30,fit: 'resize', bold: true});
			mainWorkSlide.addText(mainSlide.text, {x: '5%', y:'18.75%', h: '75.5%', w:'60.5%', color:'757575', fontSize: 16, fit: 'resize'});		
			break;
		}
		case 2: {
			mainWorkSlide.addImage({path: mainSlide.image, x: '35%', y: '22.5%', w:'60%', h: '66.5%'});
			mainWorkSlide.addText(mainSlide.title, {x: '5%', y: '2.5%', w: '90%', h: '20%', color: '363636', fontSize: 34,fit: 'resize', bold: true});
			mainWorkSlide.addText(mainSlide.text, {x: '5%', y: '22.5%', h: '66.5%', w: '30%', color: '757575', fontSize: 16, fit: 'resize'});	
			break;
		} case 3: {
			mainWorkSlide.addText(mainSlide.title, {w: '100%', h: '20%', fontSize: 48, align: 'center', color: '363636',fit: 'resize', bold: true});
			mainWorkSlide.addText(mainSlide.text, {x: '5%',y:'20%', h: '75%', w:'90%', align: 'center', color:'757575', fontSize: 16, fit: 'resize'});
			break;		
		}
		}
		// Сохраняем презентацию
	});
	const footerSlide = pptx.addSlide();
	footerSlide.addText('this presentation and all of the content inside it has been created by AI, therefore be careful with the information given', {w:'100%', h: '100%', align: 'center', color: '363636', fontSize: 10});
	const fileName = sanitizeFilePath(data.titleSlide.title);
	// eslint-disable-next-line no-undef
	const presPath = path.join(__dirname, '..', 'presentations', `презентація_${fileName}`);
	pptx.writeFile(presPath, (error) => {
		if (error) {
			console.log('ERROR WHILE SAVING PRES: ', error);
		} else {
			console.log('Презентация успешно создана!');
		}
	});
}
module.exports = createPresentation;