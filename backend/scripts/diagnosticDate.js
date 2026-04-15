const moment = require('moment');

console.log('\n🔍 DIAGNOSTIC DES DATES\n');

const date = new Date('2026-04-10');
const m = moment(date);

console.log(`Date originale: ${date.toISOString()}`);
console.log(`Date originale (format): ${moment(date).format('YYYY-MM-DD')}`);
console.log(`J+1 avec moment: ${m.add(1, 'days').format('YYYY-MM-DD')}`);

const date2 = new Date('2026-04-10');
date2.setDate(date2.getDate() + 1);
console.log(`J+1 avec setDate: ${date2.toISOString().split('T')[0]}`);

process.exit(0);