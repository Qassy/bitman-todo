const Discord = require('discord.js');
const mysql = require('mysql');
const moment = require('moment-timezone');
const config = require('./config.json');
const curtime = moment().tz('America/Vancouver');

async function pullQuery() {
	let con = mysql.createConnection({
		host: config.sqlhost,
		user: config.sqluser,
		password: config.sqlpassword,
		database: config.sqldatabase,
	});

	con.connect(function(err) {
		if (err) throw err;
		//	console.log('Connected to database.');

		const sqlC = 'SELECT * FROM classes';
		const sqlA = 'SELECT * FROM assignments ORDER BY dueDate ASC';

		con.query(sqlC, function(err, resultC, fields) {
			if (err) throw err;
			const classes = resultC;

			con.query(sqlA, function(err, resultA, fields) {
				if (err) throw err;
				const assignments = resultA;

				updateMessage(classes, assignments);
				con.end();
			});
		});
	});
}

const client = new Discord.Client();

async function updateMessage(classes, assignments) {
	var embedString = '{"color": ' + Math.floor(Math.random() * 16777215) + ', "footer": {"text": "To-do list updated: ' + curtime.format('MMM-Do h:mma') + '  •  BITMAN Task Manager: v' + config.version + '"}, "fields": [{"name": "> :arrow_down:  **Past Homework**  :arrow_down: ", "value": "\u200B"}]}';
	var embedObj = JSON.parse(embedString);

	Object.keys(classes).forEach(function(keyCl) {
		const rowCl = classes[keyCl];
		var assignmentsLateString = '\u200B';
		Object.keys(assignments).forEach(function(keyAsn) {
			const rowAsn = assignments[keyAsn];
			if (rowAsn.classID == rowCl.classID) {
				if (moment(rowAsn.dueDate).isBefore() && moment(rowAsn.dueDate).diff(curtime, 'weeks') < 2) {
					assignmentsLateString += '- ' + rowAsn.assignmentName + ' `' + moment(rowAsn.dueDate).format('MMM-Do h:mma') + ' (' + moment(rowAsn.dueDate, 'YYY-MM-DD hh:mm:ss').fromNow() + ')`\n';
				}
			}
		});

		assignmentsLateString += '\u200B';

		embedObj['fields'].push({
			name: rowCl.classID,
			value: assignmentsLateString,
		});
	});

	embedObj['fields'].push({
		name: '\u200B',
		value: '\u200B',
	});

	embedObj['fields'].push({
		name: '> :arrow_down:  **Due Homework**  :arrow_down: ',
		value: '\u200B',
	});

	Object.keys(classes).forEach(function(keyCl) {
		const rowCl = classes[keyCl];
		var assignmentsString = '\u200B';
		Object.keys(assignments).forEach(function(keyAsn) {
			const rowAsn = assignments[keyAsn];
			if (rowAsn.classID == rowCl.classID) {
				if (moment(rowAsn.dueDate).isAfter()) {
					assignmentsString += '- ' +
						rowAsn.assignmentName + ' `' + ((rowAsn.isRecurring == 0) ? moment(rowAsn.dueDate).format('MMM-Do h:mma') + ' (' + moment(rowAsn.dueDate, 'YYY-MM-DD hh:mm:ss').fromNow() + ') ' + ((moment(rowAsn.dueDate).diff(curtime, 'days') < 2) ? '⌛' : '') : 'Weekly') + '`\n';
				}
			}
		});

		assignmentsString += '\u200B';

		embedObj['fields'].push({
			name: rowCl.classID,
			value: assignmentsString,
		});
	});

	embedString = JSON.stringify(embedObj);

	Object.keys(classes).forEach(function(key) {
		const row = classes[key];
	});

	const embed = embedObj;
	const channel = client.channels.cache.get(config.listchannelid);

	channel.messages.fetch(config.listmsgid)
		.then(msg => msg.edit('', { embed }))
		.catch(console.error);
}

client.once('ready', () => {
	console.log('Ready!');
	//const channel = client.channels.cache.get('754007715335897119');
	//channel.send('beep boop task list goes here');
	pullQuery();
	loop();
});

let active = true;

function loop() {
	if (active == true) {
		setTimeout(function() {
			pullQuery();
			loop();
		}, 60000);
	}
}

// login client to discord
client.login(config.token);