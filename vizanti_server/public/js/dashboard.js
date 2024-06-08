import { rosbridge } from '/js/modules/rosbridge.js';

// Setup log section
const messageDictionary = {};

const logNodeSelector = document.getElementById('log_node_selector');
const logLevelSelector = document.getElementById('log_level_selector');
const logContainer = document.getElementById('log-container');

logLevelSelector.addEventListener('change', onLogSelectorChange);
logNodeSelector.addEventListener('change', onLogSelectorChange);

function addMessageToLog(messageLevel, message,) {
    let logLevel = logLevelSelector.value;
    if (logLevel <= messageLevel) {
        switch (messageLevel) {
            case 10:
                logContainer.innerHTML += "[DEBUG]: "
                break;
            case 20:
                logContainer.innerHTML += "[INFO]: "
                break;
            case 30:
                logContainer.innerHTML += `<span style="color: yellow;">[WARN]</span>:`
                break;
            case 40:
                logContainer.innerHTML += `<span style="color: red;">[ERROR]</span>:`
                break;
            case 50:
                logContainer.innerHTML += `<span style="color: red;">[FATAL]</span>:`
                break;
            default:
                break;
        }
        logContainer.innerHTML += message + '<br>';
        logContainer.scrollTop = logContainer.scrollHeight;
    }
}

function onLogSelectorChange() {
    const selectedNode = logNodeSelector.value;

    if (messageDictionary[selectedNode]) {
        const messages = messageDictionary[selectedNode];
        logContainer.innerHTML = "";
        for (const message of messages) {
            addMessageToLog(message[0], message[1])
        }
    }
}

const log_topic = new ROSLIB.Topic({
    ros: rosbridge.ros,
    name: 'rosout',
    messageType: 'rcl_interfaces/msg/Log',
});

const log_listener = log_topic.subscribe((message) => {
    const nodeName = message.name;

    if (messageDictionary[nodeName]) {
        messageDictionary[nodeName].push([message.level, message.msg]);
        if (nodeName == logNodeSelector.value) {
            addMessageToLog(message.level, message.msg);
        }
    }
    else {
        messageDictionary[nodeName] = [[message.level, message.msg]];

        const optionElement = document.createElement('option');
        optionElement.value = nodeName;
        optionElement.textContent = nodeName;
        logNodeSelector.appendChild(optionElement);

        if (nodeName == logNodeSelector.value) {
            addMessageToLog(message.level, message.msg);
        }
    }
});

// Setup IMU section
// const imu_topic = new ROSLIB.Topic({
//     ros: rosbridge.ros,
//     name: 'imu',
//     messageType: 'sensor_msgs/msg/Imu',
// });

// const imu_listener = imu_topic.subscribe((message) => {
//     const { x, y, z, w } = message.orientation;
//     const quat = new Quaternion(w, x, y, z);

//     const euler = quat.toEuler();
//     const yawDegrees = euler.h * (180 / Math.PI); // Convert yaw from radians to degrees
//     const yawString = yawDegrees.toFixed(2) + "deg";

//     const imuContainer = document.getElementById("imu-container");
//     imuContainer.innerHTML = `<img src="assets/needle.png" style="position: absolute; z-index: 2; top: 50%; left: 50%; transform-origin: center; transform: translate(-50%, -50%) rotate(${yawString});" width="6%" height="35%"></img>`;
// });

// Setup Messages section

// Helper function to format JSON into HTML
function jsonToHtml(json) {
    const replacer = (key, value) => {
        if (typeof value === 'function') {
            return value.toString();
        }
        return value;
    };

    const jsonString = JSON.stringify(json, replacer, 2);
    const htmlString = jsonString
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/(?:\r\n|\r|\n)/g, '<br>')
        .replace(/ /g, '&nbsp;');

    return htmlString;
}

function formatTimestamp() {
    const now = new Date();
    return now.getFullYear() + '-' +
        ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
        ('0' + now.getDate()).slice(-2) + ' ' +
        ('0' + now.getHours()).slice(-2) + ':' +
        ('0' + now.getMinutes()).slice(-2) + ':' +
        ('0' + now.getSeconds()).slice(-2);
}

// Function to handle message click
function toggleMessageContent(event) {
    const contentElement = event.currentTarget.querySelector('.message-content');
    contentElement.style.display = contentElement.style.display === 'none' ? 'block' : 'none';
}

// Function to add a new message to the list
function addMessageToList(message) {
    const messageList = document.getElementById('message-list');

    // Create list item
    const listItem = document.createElement('li');
    listItem.className = 'message-item';
    listItem.addEventListener('click', toggleMessageContent);

    // Add timestamp (assuming the message has a header with a timestamp)
    const timestamp = formatTimestamp();
    listItem.innerHTML = `<strong>${timestamp}</strong>`;

    // Add message content
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = jsonToHtml(message);
    listItem.appendChild(content);

    // Add the list item to the list
    messageList.appendChild(listItem);

    // Remove old messages if list exceeds max size
    const maxMessages = 1000;
    while (messageList.children.length > maxMessages) {
        messageList.removeChild(messageList.firstChild);
    }
}

// Get the list of topics and their types
rosbridge.ros.getTopics((topics) => {
    const topicSelector = document.getElementById('topic_selector');

    // Create a map to store topic types
    const topicTypes = {};

    // Populate the selector with the topics
    topics.topics.forEach((topic, index) => {
        const option = document.createElement('option');
        option.value = topic;
        option.text = topic;
        topicSelector.appendChild(option);

        // Store the topic type
        topicTypes[topic] = topics.types[index];
    });

    // Listen for changes in the selector
    topicSelector.addEventListener('change', () => {
        const selectedTopic = topicSelector.value;
        const selectedTopicType = topicTypes[selectedTopic];

        // Unsubscribe from the previous topic if any
        if (window.currentSubscriber) {
            window.currentSubscriber.unsubscribe();
        }

        // Subscribe to the selected topic
        window.currentSubscriber = new ROSLIB.Topic({
            ros: rosbridge.ros,
            name: selectedTopic,
            messageType: selectedTopicType
        });

        // Listen for messages on the selected topic
        window.currentSubscriber.subscribe((message) => {
            console.log(message);
            addMessageToList(message);
        });
    });
});

// Setup Camera section
const cameraSelector1 = document.getElementById("camera1_selector");
const cameraSelector2 = document.getElementById("camera2_selector");
const cameraSelector3 = document.getElementById("camera3_selector");
const cameraImage1 = document.getElementById("camera1_image");
const cameraImage2 = document.getElementById("camera2_image");
const cameraImage3 = document.getElementById("camera3_image");
let cameraTopic1 = undefined;
let cameraTopic2 = undefined;
let cameraTopic3 = undefined;
let cameraListener1 = undefined;
let cameraListener2 = undefined;
let cameraListener3 = undefined;

cameraSelector1.addEventListener('change', function () {
    onCamera1SelectorChange();
});
cameraSelector2.addEventListener('change', function () {
    onCamera2SelectorChange();
});
cameraSelector3.addEventListener('change', function () {
    onCamera3SelectorChange();
});

function onCamera1SelectorChange() {
    if (cameraTopic1 !== undefined) {
        cameraTopic1.unsubscribe(cameraListener1);
    }
    cameraTopic1 = undefined;
    cameraListener1 = undefined;

    if (cameraSelector1.value == "") {
        cameraImage1.src = 'assets/tile_loading.png';
    }
    else {
        cameraTopic1 = new ROSLIB.Topic({
            ros: rosbridge.ros,
            name: cameraSelector1.value,
            messageType: 'sensor_msgs/msg/CompressedImage',
            throttle_rate: parseInt("500")
        });
        cameraListener1 = cameraTopic1.subscribe((msg) => {
            cameraImage1.src = 'data:image/jpeg;base64,' + msg.data;
        });
    }
}

function onCamera2SelectorChange() {
    if (cameraTopic2 !== undefined) {
        cameraTopic2.unsubscribe(cameraListener2);
    }
    cameraTopic2 = undefined;
    cameraListener2 = undefined;

    if (cameraSelector2.value == "") {
        cameraImage2.src = 'assets/tile_loading.png';
    }
    else {
        cameraTopic2 = new ROSLIB.Topic({
            ros: rosbridge.ros,
            name: cameraSelector2.value,
            messageType: 'sensor_msgs/msg/CompressedImage',
            throttle_rate: parseInt("500")
        });
        cameraListener2 = cameraTopic2.subscribe((msg) => {
            cameraImage2.src = 'data:image/jpeg;base64,' + msg.data;
        });
    }
}

function onCamera3SelectorChange() {
    if (cameraTopic3 !== undefined) {
        cameraTopic3.unsubscribe(cameraListener3);
    }
    cameraTopic3 = undefined;
    cameraListener3 = undefined;

    if (cameraSelector3.value == "") {
        cameraImage3.src = 'assets/tile_loading.png';
    }
    else {
        cameraTopic3 = new ROSLIB.Topic({
            ros: rosbridge.ros,
            name: cameraSelector3.value,
            messageType: 'sensor_msgs/msg/CompressedImage',
            throttle_rate: parseInt("500")
        });
        cameraListener3 = cameraTopic3.subscribe((msg) => {
            cameraImage3.src = 'data:image/jpeg;base64,' + msg.data;
        });
    }
}

async function loadCameraTopics() {
    let result = await rosbridge.get_topics("sensor_msgs/msg/CompressedImage");
    let topiclist = "<option value=''></option>";
    result.forEach(element => {
        topiclist += "<option value='" + element + "'>" + element + "</option>"
    });

    cameraSelector1.innerHTML = topiclist;
    cameraSelector2.innerHTML = topiclist;
    cameraSelector3.innerHTML = topiclist;
}

loadCameraTopics()

// Setup Buttons Section

const sessionButton = document.getElementById("session-button");
// const nnButton = document.getElementById("nn-button");
// const lightButton = document.getElementById("light-button");
// const emergencyStopButton = document.getElementById("emergency-stop-button");
// const robotModeButton = document.getElementById("robot-mode-button");

function toggleButton(button, activeColour) {
    let active = button.classList.contains("enabled");
    if (active) {
        button.classList.remove("enabled");
        button.style.backgroundColor = "transparent";
    }
    else {
        button.classList.add("enabled");
        button.style.backgroundColor = activeColour;
    }
    return !active;
}

const recordSessionServiceClient = new ROSLIB.Service({
    ros: rosbridge.ros,
    name: 'record_session',
    serviceType: 'std_srvs/srv/SetBool'
});
sessionButton.addEventListener("click", function () {

    let recordData = true;
    if (toggleButton(sessionButton, "green")) {
        recordData = true;
        sessionButton.innerHTML = 'Recording Session';
    }
    else {
        recordData = false
        sessionButton.innerHTML = 'Record Session';
    }

    const request = new ROSLIB.ServiceRequest({
        data: recordData
    });

    recordSessionServiceClient.callService(request, (result) => {
        if (result.success) {
        }
        else {
            sessionButton.innerHTML = `<span style="color: red;">Error Occured</span>`;
        }
    }, (error) => {
        sessionButton.innerHTML = `<span style="color: red;">Error Occured</span>`;
        alert(error);
    });
});


// const nnPublisher = new ROSLIB.Topic({
//     ros: rosbridge.ros,
//     name: "enable_nn",
//     messageType: "std_msgs/msg/Bool",
// });
// nnButton.addEventListener("click", function () {
//     if (toggleButton(nnButton, "green")) {
//         nnPublisher.publish(new ROSLIB.Message({
//             data: true,
//         }));
//     }
//     else {
//         nnPublisher.publish(new ROSLIB.Message({
//             data: false,
//         }));
//     }
// });

// const lightPublisher = new ROSLIB.Topic({
//     ros: rosbridge.ros,
//     name: "light_control",
//     messageType: "scout_msgs/msg/ScoutLightCmd",
// });
// lightButton.addEventListener("click", function () {
//     if (toggleButton(lightButton, "green")) {
//         lightPublisher.publish(new ROSLIB.Message({
//             cmd_ctrl_allowed: true,
//             front_mode: 1,
//             rear_mode: 1
//         }));
//     }
//     else {
//         lightPublisher.publish(new ROSLIB.Message({
//             cmd_ctrl_allowed: true,
//             front_mode: 0,
//             rear_mode: 0
//         }));
//     }
// });

// const emergencyStopPublisher = new ROSLIB.Topic({
//     ros: rosbridge.ros,
//     name: "emergency_stop",
//     messageType: "std_msgs/msg/Bool",
// });
// emergencyStopButton.addEventListener("click", function () {
//     if (toggleButton(emergencyStopButton, "red")) {
//         emergencyStopButton.innerHTML = "Emergency Stop";
//         emergencyStopPublisher.publish(new ROSLIB.Message({
//             data: true,
//         }));
//     }
//     else {
//         emergencyStopButton.innerHTML = '<span style="color: red;">Emergency Stop</span>';
//         emergencyStopPublisher.publish(new ROSLIB.Message({
//             data: false,
//         }));
//     }
// });

// const robotModeServiceClient = new ROSLIB.Service({
//     ros: rosbridge.ros,
//     name: 'vizanti_navigation_bridge/switch_robot_mode',
//     serviceType: 'std_srvs/srv/Trigger'
// });
// robotModeButton.addEventListener("click", function () {
//     robotModeButton.innerHTML = 'Switching Mode ...';
//     robotModeServiceClient.callService(new ROSLIB.ServiceRequest(), (result) => {
//         if (result.success) {
//             robotModeButton.innerHTML = result.message;
//         }
//         else {
//             robotModeButton.innerHTML = `<span style="color: red;">Error Occured</span>`;
//         }
//     }, (error) => {
//         robotModeButton.innerHTML = `<span style="color: red;">Error Occured</span>`;
//         alert(error);
//     });
// });

console.log("Dashboard finished loading.");