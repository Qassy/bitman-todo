const Discord = require('discord.js');
const mysql = require('mysql');
const moment = require('moment-timezone');
const config = require('./config.json');
const pjson = require('./package.json');
var tz = 'America/Edmonton';
moment().tz(tz).format();
moment.tz.setDefault(tz);


var showPastAssignments = 'off';
var showFutureAssignments = 'off';
var showLegend = 'off';
var showCustom = 'off';
var customHeader = '\u200B';
var customString = '\u200B';
var showShedule = 'on';

var embedHeader = '{"color": ' + Math.floor(Math.random() * 16777215) + ', "footer": {"text": "Updated: ' + moment().format('MMM-Do h:mma') + '  •  BAIST BOT: v' + pjson.version + '"}, "fields": []}';

function pullQuery() {
	let con = mysql.createConnection({
		host: config.sqlhost,
		user: config.sqluser,
		password: config.sqlpassword,
		database: config.sqldatabase,
	});

	con.connect(function(err) {
		if (err) throw err;
		//	console.log('Connected to database.');

		const sqlC = 'SELECT * FROM classes WHERE `classStart` < CURRENT_TIMESTAMP AND `classEnd` > CURRENT_TIMESTAMP';
		const sqlA = 'SELECT * FROM assignments ORDER BY dueDate ASC';
		const sqlS = 'SELECT * FROM config';
		const sqlCS = 'SELECT * FROM `class_schedule`';

		var configs = '';
		var classSchedule = '';
		var classes = '';
		var assignments = '';

		con.query(sqlS, function(err, resultS, fields) {
			if (err) throw err;
			configs = resultS;
			updateBot(configs);
		});

		con.query(sqlCS, function(err, resultCS, fields) {
			if (err) throw err;
			classSchedule = resultCS;
			updateSchedule(classSchedule);
		});

		con.query(sqlC, function(err, resultC, fields) {
			if (err) throw err;
			classes = resultC;

			con.query(sqlA, function(err, resultA, fields) {
				if (err) throw err;
				assignments = resultA;
				updateMessage(classes, assignments);
			});

		});
	});
}

const client = new Discord.Client();

async function updateBot(configs) {
	Object.keys(configs).forEach(function(keyConf) {
		const rowConf = configs[keyConf];
		var motdEnable = 'on';

		switch (rowConf.variable) {
			case 'motd':
				if (motdEnable == 'on') {
					client.user.setActivity(rowConf.value, { type: configs[1].value });
				}
				break;
			case 'motdType':
				// taken care in the "motd" case
				break;
			case 'motdEnable':
				// motdEnable = rowConf.value;
				// tbd
				break;
			case 'avatarURL':
				if (moment().tz('America/Vancouver').diff(rowConf.lastModified, 'seconds') + 10800 <= 60) {
					client.user.setAvatar(rowConf.value);
					//console.log('setting pic');
				}
				break;

			case 'showPastAssignments':
				showPastAssignments = rowConf.value;
				break;

			case 'showFutureAssignments':
				showFutureAssignments = rowConf.value;
				break;

			case 'showLegend':
				showLegend = rowConf.value;
				break;

			case 'showCustom':
				showCustom = rowConf.value;
				break;

			case 'customHeader':
				customHeader = rowConf.value;
				break;

			case 'customString':
				customString = rowConf.value;
				break;

			default:
				console.log('Could not find function for setting ' + rowConf.variable);
		}

	});
}

async function updateMessage(classes, assignments) {
	var embedString = embedHeader;

	var embedObj = JSON.parse(embedString);

	if (showPastAssignments == 'on') {

		embedObj['fields'].push({
			name: '> :arrow_down:  **Past Homework**  :arrow_down: ',
			value: '\u200B',
		});

		Object.keys(classes).forEach(function(keyCl) {
			const rowCl = classes[keyCl];
			var assignmentsLateString = '\u200B';
			Object.keys(assignments).forEach(function(keyAsn) {
				const rowAsn = assignments[keyAsn];
				if (rowAsn.classID == rowCl.classID) {
					if (moment(rowAsn.dueDate).isBefore() && moment().diff(moment(rowAsn.dueDate), 'days') <= 14) {

						var lateSymbol = '';

						if (moment(rowAsn.dueDate).isBefore() && moment().diff(moment(rowAsn.dueDate), 'hours') <= 24) {
							lateSymbol = '👎 ';
						}

						assignmentsLateString += '- ' + rowAsn.assignmentName + ' ` ' + moment(rowAsn.dueDate).format('MMM-Do h:mma') + ' (' + moment(rowAsn.dueDate, 'YYY-MM-DD hh:mm:ss').fromNow() + ') ' + lateSymbol + '`\n';
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
	}

	if (showFutureAssignments == 'on') {

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
					if (moment(rowAsn.dueDate).isAfter() && moment(rowAsn.showDate).isBefore()) {

						var assignmentDueDate = '';
						var assignmentDueDateDiff = moment(rowAsn.dueDate).diff(moment(), 'hours');
						var assignmentDueDateDiffFormat = '';
						var dueTimer = '';

						if (rowAsn.isRecurring == 0) {
							assignmentDueDate = moment(rowAsn.dueDate).format('MMM-Do h:mma');
							assignmentDueDateDiffFormat = moment(rowAsn.dueDate, 'YYY - MM - DD hh: mm: ss ').fromNow();
						} else {
							assignmentDueDate = 'Weekly';

							var assignmentDueDateDay = moment().day(moment(rowAsn.dueDate).day());

							if (moment() <= assignmentDueDateDay) {
								assignmentDueDateDiffFormat = moment(assignmentDueDateDay).fromNow();
								// a date in the current week
							} else {
								assignmentDueDateDiffFormat = moment(assignmentDueDateDay).add(1, 'weeks').fromNow();
								// a date in the previous week
							}
						}

						if (assignmentDueDateDiff <= 48) {
							dueTimer = '⌛ ';
						} else {
							dueTimer = '';
						}

						var assignmentPublishDate = rowAsn.showDate;
						var assignmentPublishDateDiff = moment(assignmentPublishDate).diff(moment(), 'hours');
						var assignmentLastModified = rowAsn.lastModified;
						var assignmentLastModifiedDiff = moment(assignmentLastModified).diff(moment(), 'hours');

						var newSymbol = '';
						var updateSymbol = '';

						if (assignmentPublishDateDiff >= -24) {
							newSymbol = ':new: ';
						} else if (assignmentLastModifiedDiff >= -24) {
							updateSymbol = ':mega: ';

						}

						assignmentsString += '- ' + newSymbol + updateSymbol + rowAsn.assignmentName + ' ` ' + assignmentDueDate + ' (' + assignmentDueDateDiffFormat + ') ' + dueTimer + '`\n';

						// assignmentsString += '- ' + rowAsn.assignmentName + '  `' + ((rowAsn.isRecurring == 0) ? moment(rowAsn.dueDate).format('MMM - Do h: mma ') + ' (' + moment(rowAsn.dueDate, 'YYY - MM - DD hh: mm: ss ').fromNow() + ')' + ((moment(rowAsn.dueDate).diff(moment(), 'days ') < 2) ? timerShort : '') : 'Weekly(' + moment().day(moment(rowAsn.dueDate).day()).fromNow() + ')' + ((moment().day(moment(rowAsn.dueDate).day()).diff(moment(), 'days ') < 2) ? timerShort : '')) + '`\n';
					}
				}
			});

			assignmentsString += '\u200B';

			embedObj['fields'].push({
				name: rowCl.classID,
				value: assignmentsString,
			});
		});

		embedObj['fields'].push({
			name: '\u200B',
			value: '\u200B',
		});
	}

	if (showLegend == 'on') {

		var legendString = '';

		if (showFutureAssignments == 'on') {
			legendString += '`⌛` - Homework is **due** within the next 48 hours.\n';
			legendString += ':new: - **New** homework was assigned within the last 24 hours.\n';
			legendString += ':mega: - Homework was **updated** within the last 24 hours.\n';
		}

		if (showPastAssignments == 'on') {
			legendString += '`👎` - Homework has been **late** within the last 24 hours.\n ';
		}

		legendString += '\u200B';

		embedObj['fields'].push({
			name: '>  **Legend**   ',
			value: legendString,
		});
	}

	if (showCustom == 'on') {

		if (showPastAssignments == 'on' || showFutureAssignments == 'on') {

			embedObj['fields'].push({
				name: '\u200B',
				value: '\u200B',
			});
		}

		customString += '\u200B';

		embedObj['fields'].push({
			name: customHeader,
			value: customString,
		});
	}

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

function updateSchedule(schedule) {

	var weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

	var embedString = embedHeader;

	var embedObj = JSON.parse(embedString);

	if (showShedule == 'on') {

		embedObj['fields'].push({
			name: '> :clock2:  **Weekly Schedule**  :clock2: ',
			value: '\u200B',
		});

		Object.keys(weekDays).forEach(function(keyWDays) {
			const rowWDays = weekDays[keyWDays];
			var scheduleString = '\u200B';
			Object.keys(schedule).forEach(function(keySch) {
				const rowSch = schedule[keySch];
				if (rowSch.weekDay.toLowerCase() == rowWDays.toLowerCase()) {

					//console.log(rowSch.weekDay.toLowerCase() + ' ' + rowWDays.toLowerCase());

					var start = moment(rowSch.startTime, 'HH:mm:ss');
					var end = moment(rowSch.endTime, 'HH:mm:ss');
					var timeDiff = end.diff(start, 'minutes');

					var startFormat = moment(start).format("h:mmA");
					var endFromat = moment(end).format("h:mmA");

					var nextClassDay = moment().weekday(1);
					var nextClassDayDiff = nextClassDay.diff(moment(), 'hours');

					scheduleString += '- ' + rowSch.classID + ' (' + rowSch.location + ') `' + startFormat + ' - ' + endFromat + ' (' + timeDiff + ' mins.)`\n';
				}

			});

			scheduleString += '\u200B';

			embedObj['fields'].push({
				name: rowWDays,
				value: scheduleString,
			});
		});
	}


	embedString = JSON.stringify(embedObj);

	const embed = embedObj;
	const channel = client.channels.cache.get('885537563052490812');

	channel.messages.fetch('886758910118223912')
		.then(msg => msg.edit('', { embed }))
		.catch(console.error);
}

client.once('ready', () => {
	console.log('Ready!');
	//const channel = client.channels.cache.get('885537563052490812');
	//channel.send('beep boop');
	loop();
});

client.on('disconnect', function(msg, code) {
	if (code === 0) return console.error(msg);
	client.connect();
});

let active = true;

function loop() {
	if (active == true) {
		pullQuery();
		setTimeout(function() {
			loop();
			//console.log('working');
		}, 60000);
	}
}

// login client to discord
client.login(config.token);
client.login(config.token);