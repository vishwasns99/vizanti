import { rosbridge } from '/js/modules/rosbridge.js';

async function getAvailableConfigFiles() {
	const getConfigFilesService = new ROSLIB.Service({
		ros: rosbridge.ros,
		name: "/vizanti_navigation_bridge/get_available_config_files",
		serviceType: "vizanti_interfaces/srv/GetAvailableConfigFiles",
	});

	return new Promise((resolve, reject) => {
		getConfigFilesService.callService(new ROSLIB.ServiceRequest(), (result) => {
			resolve(result.file_names);
		}, (error) => {
			reject(error);
		});
	});
}

// Add 0.0000001 to floating point numbers
function modifyNumbers(string) {
	const exponential_regex = /"(-?\d+(?:\.\d+)?e[-+]\d+)"/gi;
	const float_regex = /(-?\d+\.\d+)/g;

	function exponential_replace(match, number) {
		return parseFloat(number).toString();
	}

	function float_replace(match, number) {
		return (parseFloat(number) + 0.0000001).toString();
	}

	let modifiedString = string.replace(exponential_regex, exponential_replace);
	modifiedString = modifiedString.replace(float_regex, float_replace);

	// const modifiedString = string.replace(/(\d+\.\d+)/g, (match, number) => {
	// 	const modifiedNumber = parseFloat(number) + 0.0000001;
	// 	return modifiedNumber.toString();
	// });

	return modifiedString;
}

async function getFileParameters(file) {
	const getFileParametersService = new ROSLIB.Service({
		ros: rosbridge.ros,
		name: "/vizanti_navigation_bridge/get_config_data",
		serviceType: "vizanti_interfaces/srv/GetConfigData",
	});

	return new Promise((resolve, reject) => {
		const request = new ROSLIB.ServiceRequest({ file_name: file });
		getFileParametersService.callService(request, (result) => {
			if (!result.success) {
				reject(result.message);
			}
			let modfied_data = modifyNumbers(result.file_data);
			let parsedParams = JSON.parse(modfied_data);
			resolve(parsedParams);
		}, (error) => {
			reject(error);
		});
	});
}

async function setFileParameters(file) {
	const getFileParametersService = new ROSLIB.Service({
		ros: rosbridge.ros,
		name: "/vizanti_navigation_bridge/set_config_data",
		serviceType: "vizanti_interfaces/srv/SetConfigData",
	});

	return new Promise((resolve, reject) => {
		const request = new ROSLIB.ServiceRequest({ file_name: file, file_data: JSON.stringify(cached_params[file]) });
		getFileParametersService.callService(request, (result) => {
			if (!result.success) {
				reject(result.message);
			}
			resolve(result);
		}, (error) => {
			reject(error);
		});
	});
}

const icon = document.getElementById("{uniqueID}_icon").getElementsByTagName('img')[0];
const fileSelector = document.getElementById("{uniqueID}_file");
const loaderSpinner = document.getElementById("{uniqueID}_loader");
const nodeBox = document.getElementById("{uniqueID}_nodes");
const paramBox = document.getElementById("{uniqueID}_params");
const refreshButton = document.getElementById("{uniqueID}_refresh");
const saveButton = document.getElementById("{uniqueID}_save");

// function updateJsonRecursive(jsonObject, path, value)
// {
// 	if(jsonObject === null || jsonObject === undefined)
// 	{
// 		return jsonObject;
// 	}

// 	if(path.length === 1)
// 	{
// 		jsonObject[path[0]] = value;
// 		return jsonObject;
// 	}

// 	let popped = path.shift();
// 	return updateJsonRecursive(jsonObject[popped], path, value);
// }

function updateParameter(event) {
	let inputValue = event.target.value;
	let inputId = event.target.id.split('/');
	let type = inputId.pop();
	inputId.shift();
	let originalValue = cached_params[inputId[0]];
	for (let i = 1; i < inputId.length - 1; i++) {
		originalValue = originalValue[inputId[i]];
	}
	switch (type) {
		case "string":
			originalValue[inputId[inputId.length - 1]] = inputValue;
			break;
		case "int":
			originalValue[inputId[inputId.length - 1]] = parseInt(inputValue);
			break;
		case "float":
			originalValue[inputId[inputId.length - 1]] = parseFloat(parseFloat(inputValue).toFixed(5));
			break;
		case "bool":
			originalValue[inputId[inputId.length - 1]] = event.target.checked;
			break;
		case "array":
			originalValue[inputId[inputId.length - 1]] = JSON.parse(inputValue);
			break;
	}
}

function getInputElement(id, key, value, type) {
	let inputElement = "";
	switch (type) {
		case "string":
			id = id + "string";
			inputElement = `
				<label for="${id}"><i>string </i> ${key}:</label>
				<input id="${id}" type="text" value="${value}">
				<br>`;
			break;
		case "int":
			id = id + "int";
			inputElement = `
				<label for="${id}"><i>int </i> ${key}:</label>
				<input type="number" value="${value}" step="1" id="${id}">
				<br>`;
			break;
		case "float":
			id = id + "float";
			const roundedValue = value.toFixed(5);
			inputElement = `
				<label for="${id}"><i>float </i>${key}:</label>
				<input type="number" value="${roundedValue}" step="0.001" id="${id}">
				<br>`;
			break;
		case "bool":
			id = id + "bool";
			inputElement = `
				<label for="${id}"><i>bool </i>${key}:</label>
				<input type="checkbox" id="${id}" ${value ? "checked" : ""}>
				<br>`;
			break;
		case "array":
			id = id + "array";
			let temp_array = JSON.stringify(value).replace(/"/g, "'");
			// Skipping arrays because its not easy to edit them anyways
			inputElement = `
				<label for="${id}"><i>array </i>${key}:</label>
				<input type="text" id="${id}" value="${temp_array}">
				<br>`;
			break;
		case "object":
			let child_input_element = "";
			for (const [child_key, child_value] of Object.entries(value)) {
				let child_type = detectValueType(child_value);
				let child_id = id + key + "/" + child_key + "/";
				child_input_element += getInputElement(child_id, child_key, child_value, child_type);
			}
			inputElement = `
			${key}:<div style="padding-left:20px"><br>${child_input_element}</div>`;
			break;
		default:
			console.warn("Invalid parameter type:", id, key, value, type);
			break;
	}
	return inputElement;
}

function createParameters(id, parametersJson) {
	let content = "";
	if (parametersJson === null || parametersJson === undefined) {
		console.log("Invalid: ", id, parametersJson);
	}
	for (const [key, value] of Object.entries(parametersJson)) {
		let type = detectValueType(value);
		let input_id = id + key + "/";
		content += getInputElement(input_id, key, value, type) + "<hr>";
	}
	return content;
}

function detectValueType(value) {
	if (typeof value === 'number') {
		if (Number.isInteger(value)) {
			return 'int';
		} else {
			return 'float';
		}
	} else if (typeof value === 'string') {
		return 'string';
	} else if (typeof value === 'boolean') {
		return 'bool';
	} else if (Array.isArray(value)) {
		return 'array';
	} else if (typeof value === 'object') {
		return 'object';
	} else {
		return 'other';
	}
}

let fileName = "";
let cached_params = undefined;

function createNodeTab(id, node, params) {
	let button = document.createElement("button");
	button.innerHTML = node;
	button.id = node + "/button";
	button.onclick = function () {
		// Reset all buttons
		let buttons = nodeBox.querySelectorAll('button');
		for (var i = 0; i < buttons.length; i++) {
			buttons[i].className = "";
		}

		// Change the selected button class
		let selectedButton = document.getElementById(node + "/button");
		selectedButton.className = "selected";

		// Hide all tabs
		var tabs = document.getElementsByClassName('tabcontent');
		for (var i = 0; i < tabs.length; i++) {
			tabs[i].style.display = 'none';
		}

		// Show the selected tab
		var selectedTab = document.getElementById(node + "/content");
		selectedTab.style.display = 'block';
	};
	nodeBox.appendChild(button);

	// Create the tab content
	var content = document.createElement("div");
	content.id = node + "/content";
	content.className = "tabcontent";
	content.innerHTML = createParameters(id, params["ros__parameters"]);
	content.style.display = 'none';
	paramBox.appendChild(content);
}

async function listNodesAndParameters() {
	if (fileName == "" || !cached_params[fileName]) {
		return;
	}
	loaderSpinner.style.display = "block";

	nodeBox.innerHTML = "";
	paramBox.innerHTML = "";
	for (const [node, params] of Object.entries(cached_params[fileName])) {
		if ("ros__parameters" in params && Object.entries(params).length === 1) {
			let id = "${unique_ID}/" + fileName + "/" + node + "/ros__parameters/";
			// Create a tab for the node
			createNodeTab(id, node, params);
		}
		else {
			// Nested nodes. Iterate and create tabs
			let id = "${unique_ID}/" + fileName + "/" + node + "/";
			for (const [child_node, child_params] of Object.entries(params)) {
				createNodeTab(id + child_node + "/ros__parameters/", child_node, child_params);
			}
		}
	}
	const inputElements = document.querySelectorAll("#{uniqueID}_params input");

	inputElements.forEach(input => {
		input.addEventListener("change", updateParameter);
	});

	loaderSpinner.style.display = "none";
}

async function getAll(results) {
	loaderSpinner.style.display = "block";
	cached_params = {};
	for (const file of results) {
		cached_params[file] = await getFileParameters(file);
		if (file == fileName) {
			listNodesAndParameters();
		}
	}
	loaderSpinner.style.display = "none";
}

async function setFileList() {
	let results = await getAvailableConfigFiles();
	let filelist = "";
	for (const file of results) {
		filelist += "<option value='" + file + "'>" + file + "</option>"
	}
	fileSelector.innerHTML = filelist;

	if (fileName == "")
		fileName = fileSelector.value;
	else if (results.includes(fileName)) {
		fileSelector.value = fileName;
	}

	if (!cached_params) {
		await getAll(results);
	}
}

fileSelector.addEventListener("change", (event) => {
	fileName = fileSelector.value;
	listNodesAndParameters();
});

icon.addEventListener("click", setFileList);

refreshButton.addEventListener("click", async (event) => {
	loaderSpinner.style.display = "block";
	cached_params[fileName] = await getFileParameters(fileName);
	listNodesAndParameters();
	loaderSpinner.style.display = "none";
});

saveButton.addEventListener("click", async (event) => {
	loaderSpinner.style.display = "block";
	try {
		await setFileParameters(fileName);
	}
	catch (error) {
		alert(error);
	}
	loaderSpinner.style.display = "none";
});

await setFileList();

console.log("Parameters Widget Loaded {uniqueID}")
