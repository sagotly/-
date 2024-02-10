
function parseSentence(sentence) {
	// Проверяем, начинается ли предложение с цифры, точки или кавычек
	sentence = sentence.trim();
	if (/^[0-9."']+/i.test(sentence)) {
		// Удаляем цифру, точку или кавычки с начала строки
		sentence = sentence.replace(/^[0-9."']+/i, '');
	}

	// Проверяем, заканчивается ли предложение кавычками
	// eslint-disable-next-line quotes
	if (sentence[sentence.length - 1] == '"' || sentence[sentence.length - 1] == "'") {
		// Удаляем кавычки с конца строки
		sentence = sentence.substring(0, sentence.length - 2);
	}
	sentence = sentence.trim();
	return sentence;
}
module.exports = parseSentence;