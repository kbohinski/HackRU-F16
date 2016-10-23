'use strict';

// --------------- OpenFDA functions -----------------------

var https = require('https');

var BASE_URL_LABEL = 'https://api.fda.gov/drug/label.json';
var BASE_URL_EVENT = 'https://api.fda.gov/drug/event.json';

function httpRequest(url, callback) {
    https.get(url, res => {
        res.setEncoding('utf8');
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => callback({'status': 'success', 'body': JSON.parse(body)}));
    }).on('error', e => {
        callback({'status': 'failure', 'error': e});
    });
}

function getDrugLabel(drugName, infoType, callback) {
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
    const speechOutput = 'Welcome to RxEcho. ' +
        'I can answer any questions you may have regarding medication usage and safety information. ' + 
        'I can also set daily reminders for your perscriptions.';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Feel free to ask information regarding a perscription.'
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for trying RxEcho. Have a nice day!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function getDrugInfo(intent, session, callback) {
    const drugName = intent.slots.DrugName.value;
    let speechOutput, repromptText;

    // If no information type is specified, provide general info
    let infoType = intent.slots.InfoType.value;
    if (!infoType)
        infoType = 'GENERAL';

    getDrugLabel(drugName, infoType, infoJson => {
        if (!drugName || infoJson.status === 'failure') {
            repromptText = 'Please specify a perscription for me to find info about.';
        } else {
            const results = infoJson.body.results[0];
            speechOutput = drugName + ": ";
            switch (infoType) {
            case 'GENERAL':
                speechOutput += results.purpose + ". " + results.indications_and_usage;
                break;
            case 'PERSCRIPTION_REQUIRED':
                speechOutput = 'No perscription required.';
                break;
            case 'USAGE_INSTRUCTIONS':
                speechOutput = 'Sample usage instructions.';
                break;
            case 'MANUFACTURER':
                speechOutput = 'Samle manufacturer.';
                break;
            case 'SIDE_EFFECTS':
                speechOutput = 'Sample side effects.';
                break;
            case 'ACTIVE_INGREDIENTS':
                speechOutput = 'Sample active ingredients.';
                break;
            case 'INACTIVE_INGREDIENTS':
                speechOutput = 'Sample inactive ingredients.';
                break;
            default:
                speechOutput = null;
                repromptText = 'I wasn\'t able to find any information about that on record.';
                break;
            }
        }
        callback({}, buildSpeechletResponse(intent.name, speechOutput, repromptText, false));
    });
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
        getDrugInfo(intent, session, callback);
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

/*

-- Demo code for reference --

/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 *

function createFavoriteColorAttributes(favoriteColor) {
    return {
        favoriteColor,
    };
}

/**
 * Sets the color in the session and prepares the speech to reply to the user.
 *
function setColorInSession(intent, session, callback) {
    const cardTitle = intent.name;
    const favoriteColorSlot = intent.slots.Color;
    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';

    if (favoriteColorSlot) {
        const favoriteColor = favoriteColorSlot.value;
        sessionAttributes = createFavoriteColorAttributes(favoriteColor);
        speechOutput = `I now know your favorite color is ${favoriteColor}. You can ask me ` +
            "your favorite color by saying, what's my favorite color?";
        repromptText = "You can ask me your favorite color by saying, what's my favorite color?";
    } else {
        speechOutput = "I'm not sure what your favorite color is. Please try again.";
        repromptText = "I'm not sure what your favorite color is. You can tell me your " +
            'favorite color by saying, my favorite color is red';
    }

    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getColorFromSession(intent, session, callback) {
    let favoriteColor;
    const repromptText = null;
    const sessionAttributes = {};
    let shouldEndSession = false;
    let speechOutput = '';

    if (session.attributes) {
        favoriteColor = session.attributes.favoriteColor;
    }

    if (favoriteColor) {
        speechOutput = `Your favorite color is ${favoriteColor}. Goodbye.`;
        shouldEndSession = true;
    } else {
        speechOutput = "I'm not sure what your favorite color is, you can say, my favorite color " +
            ' is red';
    }

    // Setting repromptText to null signifies that we do not want to reprompt the user.
    // If the user does not respond or says something that is not understood, the session
    // will end.
    callback(sessionAttributes,
         buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}*/