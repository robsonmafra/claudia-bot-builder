'use strict';
const rp = require('minimal-request-promise');
const skBearerToken = require('./token');
const retry = require('oh-no-i-insist');

const retryTimeout = 500;
const numRetries = 2;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function sendConversationMessage(conversationId, message, authToken, apiBaseUri, activityId) {
  const options = {
    headers: {
      'Authorization': 'Bearer ' + authToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  };

  console.log('*** POST request to: ', `${apiBaseUri}/v3/conversations/${conversationId}/activities/${activityId}`);
  console.log('*** Body: ', options.body);

  return rp.post(`${apiBaseUri}/v3/conversations/${conversationId}/activities/${activityId}`, options);
}

async function sendReply(conversationId, message, authToken, apiBaseUri, activityId) {
  apiBaseUri = apiBaseUri.replace(/\/$/, '');

  if (typeof message === 'string') {
    message = {
      type: 'message',
      text: message
    };
    return sendConversationMessage(conversationId, message, authToken, apiBaseUri, activityId);
  }

  if (Array.isArray(message)) {
    let conversationRequest;
    for (const msg of message) {
      conversationRequest = sendConversationMessage(conversationId, msg, authToken, apiBaseUri, activityId);
      await sleep(500);
    }
    return conversationRequest;
  }

  return sendConversationMessage(conversationId, message, authToken, apiBaseUri, activityId);
}

module.exports = function skReply(skypeAppId, skypePrivateKey, conversationId, message, apiBaseUri, activityId) {
  return retry(
    () => {
      return skBearerToken.getToken(skypeAppId, Buffer.from(skypePrivateKey, 'base64').toString())
        .then((token) => sendReply(conversationId, message, token, apiBaseUri, activityId));
    },
    retryTimeout,
    numRetries,
    error => error.statusCode === 401, // expired / invalid token error status code
    skBearerToken.clearToken
  );
};
