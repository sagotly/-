/**
 * Parses a sentence by removing any leading digits, periods, or quotes, as well as any trailing quotes.
 *
 * @param {string} sentence - The sentence to parse.
 * @returns {string} The parsed sentence.
 */
function parseSentence(sentence) {
	// Check if the sentence starts with a digit, period, or quotes
	sentence = sentence.trim();
	if (/^[0-9."']+/i.test(sentence)) {
		// Remove the digit, period, or quotes from the beginning of the string
		sentence = sentence.replace(/^[0-9."']+/i, '');
	}

	// Check if the sentence ends with quotes
	// eslint-disable-next-line quotes
	if (sentence[sentence.length - 1] == '"' || sentence[sentence.length - 1] == "'") {
		// Remove quotes from the end of the string
		sentence = sentence.substring(0, sentence.length - 2);
	}
	sentence = sentence.trim();
	return sentence;
}
module.exports = parseSentence;