var argv = require('yargs').argv;
var mode = argv._;
var open = require('open');
var moment = require('moment');
var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
var parse = require('xml-parser');
var _ = require('lodash');
var geolib = require('geolib');
var Hoek = require('hoek');
var homeDirectory = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
var configFile = argv.c || path.join(homeDirectory, './.timesheet.yaml');
var config = yaml.safeLoad(fs.readFileSync(path.join(__dirname, '/default-config.yaml'), 'utf8'));

try {
	var readConfig = yaml.safeLoad(fs.readFileSync(configFile, 'utf8'));
	config = Hoek.applyToDefaults(config, readConfig)
} catch (e) {
	console.log('No configuration file found: \n - ' + e.message + ' \n');
}

var locations = config.locations;
var threshold = config.threshold;

var min = function(a, b) {
	return a > b ? b : a;
};

var max = function(a, b) {
	return a < b ? b : a;
};

switch (mode[0]) {
	case 'download':
		var since = moment().date(1).hours(0).minutes(0).seconds(0).milliseconds(0);

		if (argv.m) {
			since = since.month(parseInt(argv.m) - 1);
		}

		if (argv.y) {
			since = since.year(parseInt(argv.y));
		}

		var until = since.clone().add(1, 'month');

		var url = 'https://maps.google.com/locationhistory/kml?startTime='+since.valueOf()+ '&endTime='+until.valueOf();
		console.log('Download since ' + since.format() + ' until ' + until.format() + ' from ' + url);
		open(url);
		console.log('Process with convert ./file.yml');
		break;

	case 'convert':
		var file = mode[1];
		var content = fs.readFileSync(file, {encoding: 'utf8'});
		var kml = parse(content);
		var document = kml.root.children[0].children;
		var placemark = document[document.length - 1].children;
		var track = placemark[placemark.length - 1].children;
		var halfTrackLength = ((track.length-1) / 2);
		var data = [];

		for (var i = 0; i < halfTrackLength; i++) {
			data.push({ when: track[i*2+1].content, location: track[i*2+2].content})
		}

		var grouped = _.reduce(data, function(memo, entry) {
			var loc = entry.location.split(' ');
			var latitude = parseFloat(loc[1], 10);
			var longitude = parseFloat(loc[0], 10);
			var when = moment(entry.when);
            var key = when.format('YYYY-MM-DD');
			var parsedLocation = {latitude: latitude, longitude: longitude};
			var group = memo[key] || {};

			_.each(locations, function(location) {
				var distance = geolib.getDistance(
					parsedLocation,
					location
				);

				if (distance < threshold) {
					if (!group[location.name]) {
						group[location.name] = {
							min: when.toDate(),
							max: when.toDate()
						};
					} else {
						group[location.name] = {
							min: min(when.toDate(), group[location.name].min),
							max: max(when.toDate(), group[location.name].max)
						};
					}
				}
			});

			if (_.keys(group).length > 0) {
				memo[key] = group;
			}

			return memo;
		}, {});

		var totalHours = 0;
		var daysWithWork = 0;

		var lastDate;
		_.each(grouped, function(value) {
			_.each(value, function(time, key) {
				var minDate = moment(time.min);
				var maxDate = moment(time.max);
				totalHours += maxDate.valueOf() - minDate.valueOf();
				var duration = moment(maxDate.valueOf() - minDate.valueOf()).utc();

				if (lastDate) {
					var daysBetween = minDate.diff(lastDate.clone().startOf('day'),'days')
					for (i = 1; i < daysBetween; i++) {
						console.log('');
					}
				}

				lastDate = minDate.clone().startOf('day');

				if (duration > 100) {
					daysWithWork++;
                	console.log(minDate.format('DD.MM.YYYY HH:mm') + ' | ' + maxDate.format('DD.MM.YYYY HH:mm') + ' | ' + key + ' | ' + duration.format('HH:mm') );
				}
			});
		});

		console.log('');
		console.log('===== total time spent =====> ' + totalHours / 1000 / 60 / 60 / 8  + ' / ' + daysWithWork);
		break;
	default:
		console.log('How to use:');
		console.log('- timesheet download -m 1 -y 2014');
		console.log('- timesheet convert ./file.kml');
		console.log('');
		console.log('Configuration');
		console.log('-c ~/.timesheet.yaml');
		break;
}