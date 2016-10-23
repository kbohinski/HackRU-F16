'use strict';

var https = require('https');
var unirest = require('unirest');

// --------------- Twilio  includes -----------------------

var AUTH = {
    "twilio": {
        "key": "***REMOVED***",
        "secret": "***REMOVED***",
        "number": "+18569246200"
    }
};
var PHONE_NUMBER = '***REMOVED***';

// --------------- Twilio functions -----------------------

function sendMessage(to, msg) {
    var headers = {
        'To': PHONE_NUMBER,
    	'From': AUTH.twilio['number'],
	    'Body': msg
    };

    var url = 'https://api.twilio.com/2010-04-01/Accounts/' + AUTH.twilio.key + '/Messages.json';

    unirest.post(url)
        .send(headers)
        .auth(AUTH.twilio.key, AUTH.twilio.secret, true)
        .end(function (res) { console.log(res.body) });
};

// --------------- OpenFDA includes -----------------------

var BASE_URL_LABEL = 'https://api.fda.gov/drug/label.json';
var BASE_URL_EVENT = 'https://api.fda.gov/drug/event.json';

// --------------- OpenFDA functions -----------------------

var drug_intent_map = {
    'DrugInfoIntent': ['purpose', 'indications_and_usage'],
    'DrugUsageIntent': ['dosage_and_administration'],
    'DrugManufacturerIntent': ['manufacturer_name'],
    'DrugSideEffectsIntent': ['stop_use', 'warnings'],
    'DrugActiveIngredientsIntent': ['active_ingredient'],
    'DrugInactiveIngredientsIntent': ['inactive_ingredient'],
    'DrugConflictsIntent': ['do_not_use'],
    'DrugQuestionsIntent': ['questions']
}

function httpRequest(url, callback) {
    https.get(url, res => {
        res.setEncoding('utf8');
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => callback({ 'status': 'success', 'body': JSON.parse(body) }));
    }).on('error', e => {
        callback({ 'status': 'failure', 'error': e });
    });
}

function getDrugLabel(drugName, callback) {
    return httpRequest(BASE_URL_LABEL + '?search=' + drugName, callback);
}

function getDrugEvent(drug, callback) {
    return httpRequest(BASE_URL_EVENT + '?search=' + drug, callback);
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to Med-Echo. ' /*+
        'I can answer any questions you may have regarding medication usage and safety information. ' + 
        'I can also set daily reminders for your perscriptions.'*/;
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Feel free to ask information regarding a perscription.'
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for trying Med-Echo. Have a nice day!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function flattenOpenFda(json) {
    for (var key in json['openfda']) {
        if (json.hasOwnProperty(key))
            json[key] = json['openfda'][key];
    }
    return json;
}

function getDrugInfo(intent, session, callback) {
    const drugName = intent.slots.DrugName ? intent.slots.DrugName.value : null;
    let speechOutput, repromptText;

    getDrugLabel(drugName, infoJson => {
        if (!drugName || drugName == '' || infoJson.status === 'failure' || infoJson.body.error) {
            speechOutput = drugName + ' ';
            speechOutput = repromptText = 'Please specify a perscription for me to find info about.';
        } else {
            const results = flattenOpenFda(infoJson.body.results[0]), keys = drug_intent_map[intent.name],
                truthy_keys = keys ? keys.filter(key => results[key]) : [];
            if (truthy_keys.length) {
                speechOutput = drugName + ": ";
                truthy_keys.forEach(key => speechOutput += (results[key] ? results[key] : '') + '. ');
            } else {
                speechOutput = repromptText = 'I wasn\'t able to find any information about that on record.';
            }
        }
        callback({}, buildSpeechletResponse(intent.name, speechOutput, repromptText, false));
    });
}

function setReminder(intent, session, callback) {
    const drugName = intent.slots.DrugName ? intent.slots.DrugName.value : null;
    let speechOutput, repromptText;
    if (!drugName || drugName == '') {
        speechOutput = 'Sorry, I didn\'t catch that. Would you mind repeating that?';
        repromptText = 'Please specify a perscription for me to find info about.';
    } else {
        speechOutput = `Setting a text reminder for your ${drugName} perscription.`;
        sendMessage(PHONE_NUMBER, 'Hi, Alexa here reminding you to take your ' + drugName + ".");
    }
    callback({}, buildSpeechletResponse(intent.name, speechOutput, repromptText, false));
}

// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    switch (intentName) {
        case 'DrugInfoIntent':
        case 'DrugUsageIntent':
        case 'DrugManufacturerIntent':
        case 'DrugSideEffectsIntent':
        case 'DrugActiveIngredientsIntent':
        case 'DrugInactiveIngredientsIntent':
        case 'DrugConflictsIntent':
        case 'DrugQuestionsIntent':
            getDrugInfo(intent, session, callback);
            break;
        case 'SetReminderIntent':
            setReminder(intent, session, callback);
            break;
        case 'ThankYouIntent':
            callback({}, buildSpeechletResponse(intentName, 'No problem!', null, true));
            break;
        case 'AMAZON.HelpIntent':
            getWelcomeResponse(callback);
            break;
        case 'AMAZON.StopIntent': // Fall through
        case 'AMAZON.CancelIntent':
            handleSessionEndRequest(callback);
            break;
        default:
            throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        if (event.session.new)
            onSessionStarted({ requestId: event.request.requestId }, event.session);

        switch (event.request.type) {
            case 'LaunchRequest':
                onLaunch(event.request, event.session, (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
                break;
            case 'IntentRequest':
                onIntent(event.request, event.session, (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
                break;
            case 'SessionEndedRequest':
                onSessionEnded(event.request, event.session);
                callback();
                break;
        }
    } catch (err) {
        callback(err);
    }
};
