const fs = require('fs');
const assert = require('assert');
const detectIndent = require('detect-indent');


function traverseObj (obj, properties) {

	for (let prop of properties) {

		if (!obj.hasOwnProperty(prop)) { return; }

		obj = obj[prop];
	}

	return obj;
}

function isLeafNode (obj) {

	if (typeof obj !== 'object') { return; }

	for (let property in obj) {

		// If child/leaf-node exists, terminate
		if (
			obj.hasOwnProperty(property) &&
			typeof obj[property] === 'object' &&
			obj[property] !== null
		) {
			return;
		}
	}

	return true;
}

class JSONFile {

	constructor (filePath) {

		assert(typeof filePath === 'string', 'File path missing');

		this.filePath = filePath;

		this.raw = fs.readFileSync(filePath).toString();

		this.data = JSON.parse(this.raw);
		this.original = JSON.stringify(this.data);
		this.indentation = detectIndent(this.raw).indent || '\t';

	}

	hasChanged () {

		let stringified = JSON.stringify(this.data);

		return this.original !== stringified;
	}

	save () {

		if (!this.hasChanged()) { return; }

		fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, this.indentation));
	}


	// Lookup methods

	get (properties) {

		assert(properties instanceof Array, `'properties' must be an instance of Array`);
		assert(properties.length > 0, `'properties' must contain at least one property`);

		return traverseObj(this.data, properties);
	}

	delete (properties) {

		assert(properties instanceof Array, `'properties' must be an instance of Array`);
		assert(properties.length > 0, `'properties' must contain at least one property`);

		let obj;
		let removed;
		let i = properties.length - 1;

		// Keep removing parents if its empty
		do {

			let path = properties.slice(0, i);

			obj = traverseObj(this.data, path);

			let property = properties[i];

			if (!obj.hasOwnProperty(property)) { return; }

			if (!removed) {
				removed = obj[property];
			}

			delete obj[property];

			i--;
		} while (Object.keys(obj).length === 0 && i > -1);

		return removed;
	}

	set (properties, value) {

		assert(properties instanceof Array, `'properties' must be an instance of Array`);
		assert(properties.length > 0, `'properties' must contain at least one property`);

		let obj = this.data;
		let lastIdx = properties.length - 1;

		properties = properties.map((property, idx) => {

			// Make sure obj[property] is not a leaf node
			if (idx < lastIdx) {

				for (let _property = property, j = 1; isLeafNode(obj[property]); j++) {
					property = `${_property}${j}`;
				}

				if (!obj.hasOwnProperty(property)) {
					obj[property] = {};
				}

				obj = obj[property];
			}

			// Leaf case: Make sure obj[property] is not taken
			else {

				for (let _property = property, j = 1; obj.hasOwnProperty(property); j++) {


					if (typeof this.onLeafCollision === 'function') {

						let merged = this.onLeafCollision(obj[property], value);

						if (merged) {
							return property;
						}
					}

					property = `${_property}${j}`;
				}

				obj[property] = value;
			}

			return property;
		});

		return properties;
	}
}

module.exports = JSONFile;