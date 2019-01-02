'use strict';
const rp = require('minimal-request-promise');
const skBearerToken = require('./token');
const retry = require('oh-no-i-insist');

const retryTimeout = 500;
const numRetries = 2;

function extractActivityIdFromOriginalId(originalActivityId) {
  return originalActivityId.split('|')[1];
}

function sendReply(conversationId, message, authToken, apiBaseUri, activityId) {
  apiBaseUri = apiBaseUri.replace(/\/$/, '');
  activityId = extractActivityIdFromOriginalId(activityId);

  if (typeof message === 'string')
    message = {
      type: 'message',
      text: message
    };

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
