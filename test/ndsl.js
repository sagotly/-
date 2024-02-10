let multiplier = 0;
for (let i = 0; i < 99; i++){
	let layout = Math.floor(Math.random() * 2 + multiplier) + 1;
	console.log(layout);
	if (layout == 1) multiplier += 0.1;
	if (layout == 2) multiplier -= 0.1;
	if (multiplier >= 0.5) multiplier = 0;
	if (multiplier <=  -0.5) multiplier = 0;
}
const t = 'Етимологія[ред. | h';
console.log(t.substring(0, t.length - 5));