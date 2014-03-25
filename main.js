var fs = require("fs");

var ROOT = "/Users/Aosou/Development/sp-mobile-MonsterCity/src/MonsterCity";
// var ROOT = "/Users/Aosou/Development/sp-mobile-DragonCity/src/DragonCity";

var VALID_EXT = [ "cpp", "h", "hpp", "mm" ];

// var EXCLUDE_FOLDER = [ "ios" ];
var EXCLUDE_FOLDER = [ ];

var numFiles = 0;

function getFiles(folder, files) {
	fs.readdirSync(folder).forEach(function(element) {
		var path = folder + "/" + element;

		if (fs.lstatSync(path).isDirectory()) {
			if (EXCLUDE_FOLDER.indexOf(element) === -1) { getFiles(path, files); }
		} else if (VALID_EXT.indexOf(element.split(".").pop()) !== -1) {
			files[element] = {
				path: path,
				filename: element,
				directIncludes: {},
				directIncludedBy: {},
				includes: {},
				includedBy: {},
			};
			++numFiles;
		}
	});
	return files;
}

function parseFile(file, files) {
	var content = fs.readFileSync(file.path, "utf8");

	var matches = content.match(/[^\/]#(include|import) "([^"]*)"/g)

	if (!matches) { return; }

	matches.forEach(function(match) {
		var matches = match.match(/[^("|\/)]*\.h(pp)?/);

		if (!matches) { return; }

		var includedFile = files[matches[0]];

		if (!includedFile) { return; }

		file.directIncludes[includedFile.filename] = includedFile;
		includedFile.directIncludedBy[file.filename] = file;
	});
}

function calculateDependencies(file, startFile) {
	for (var filename in file.directIncludes) {
		var includedFile = file.directIncludes[filename];

		startFile.includes[filename] = includedFile;
		includedFile.includedBy[startFile.filename] = startFile;
		
		calculateDependencies(includedFile, startFile);
	}
}

var files = getFiles(ROOT, {});
var counter = 0;

for (var filename in files) {
	parseFile(files[filename], files);
}

for (var filename in files) {
	try {
		calculateDependencies(files[filename], files[filename]);
	} catch (e) {
		process.stdout.write("\n");
		console.log("stack overflow: " + filename);
	}

	process.stdout.clearLine();
	process.stdout.cursorTo(0);
	process.stdout.write(++counter + "/" + numFiles);
}

var arrFiles = [];

for (var filename in files) {
	var file = files[filename];

	file.numIncludes = 0;
	file.numIncludedBy = 0;
	file.numIncludedByHeader = 0;

	for (var filename in file.includes) { ++file.numIncludes; }
	for (var filename in file.includedBy) {
		++file.numIncludedBy; 

		if (filename.match(/.*\.h(pp)?/)) { ++file.numIncludedByHeader; }
	}

	if (file.filename.match(/.*\.h(pp)?/)) { arrFiles.push(file); }
}

arrFiles.sort(function(a, b) { return a.numIncludedBy - b.numIncludedBy; })

process.stdout.write("\n");

arrFiles.forEach(function(element) {
	if (element.numIncludedByHeader >= 0) {
		console.log(element.numIncludes, element.numIncludedBy, element.numIncludedByHeader, element.filename);
	}
});

var name = "GameData.h"

for (var filename in files[name].directIncludedBy) {
	if (filename.match(/.*\.h(pp)?/) && files[filename].numIncludedBy > -1) { 
		console.log(files[filename].numIncludedBy + " " + filename); 
	}
}
