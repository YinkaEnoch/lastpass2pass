#! /usr/bin/env node

const { promisify } = require("util");
const fs = require("fs");
const exec = promisify(require("child_process").exec);
const file = process.argv[2];

// Check if file does not exists
if (!fs.existsSync(file)) {
	console.log(`Failed to read file at: ${process.argv[2]}`);
	return false;
}

console.log(`Reading ${file}...`);

// Read file
let data = fs.readFileSync(file, { encoding: "utf8" });

// Extract individual records by line
const entries = data.split(/\n/);

// Parse records
let records = entries
	.map((entry) => {
		if (/^(http|ftp|ssh)/.test(entry)) return entry;
	})
	.filter((entry) => entry) // filter undefined
	.map((entry) => {
		entry = entry.split(",");
		return {
			url: entry[0],
			username: entry[1],
			password: entry[2],
			extra: entry[3],
			name: entry[4],
			grouping: entry[5],
			fav: entry[6],
		};
	})
	.map((entry) => {
		// Remove spaces from name
		if (entry.name) entry.name = entry.name.replace(/ /g, "-");

		if (entry.grouping) {
			// Remove spaces from grouping
			entry.grouping = entry.grouping.replace(/ /g, "-");
			// Change '\' to '/'
			entry.grouping = entry.grouping.replace(/\\/g, "/");

			// Single group
			entry.grouping = `${entry.grouping}/${entry.name}`;
			return entry;
		}

		// No group
		let name = entry.name || entry.url;
		entry.grouping = `Uncategorised/${name}`;
		return entry;
	});
console.log("Records parsed: ", records.length);

// Add records to passwordstore
let successful = 0,
	errors = [];

records.forEach((record) => {
	let { url, username, password, name, extra } = record;
	let entry = "";
	// Password
	if (password) {
		entry += `${password}\n`;
	} else {
		entry += "\n";
	}

	// URL
	if (url) {
		entry += `url: ${url}\n`;
	}

	// Username
	if (username) {
		entry += `username: ${username}\n`;
	}

	// Name
	if (name) {
		entry += `name: ${name}\n`;
	}

	// Extra
	if (extra) {
		entry += `extra: ${extra}\n`;
	}

	exec(`echo '${entry}' | pass insert -m ${record.grouping}`)
		.then(({ stdout, stderr }) => {
			if (stderr) {
				errors.push(record);
			}

			if (stdout) {
				successful += 1;
			}
		})
		.catch((err) => console.error(err));
});

// HACK: Use setTimeout to delay output
// Log success counts
setTimeout(() => {
	console.log(`${successful} records successfully imported!`);
}, 5000);

// Log errors
setTimeout(() => {
	if (errors.length > 0) {
		console.log(`There were ${errors.length} errors:`);
		errors.forEach((err) => console.error(err));
		console.log(
			"These probably occurred because an identically-named record already existed, or because there were multiple entries with the same name in the csv file."
		);
	}
}, 7000);
