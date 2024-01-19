/**
 * This is a modified version of the lightning/empApi mock from:
 * https://github.com/salesforce/sfdx-lwc-jest/blob/master/src/lightning-stubs/empApi/empApi.js
 */

// An object to store callbacks
const _channels = {};

// On subscribe, store the callback function and resolve the promise
export const subscribe = jest.fn((channel, replayId, onMessageCallback) => {
  _channels[channel] = { onMessageCallback };
  Promise.resolve({
    id: '_' + Date.now(),
    channel: channel,
    replayId: replayId
  });
});

export const unsubscribe = jest.fn().mockResolvedValue({});
export const onError = jest.fn().mockResolvedValue(jest.fn());
export const setDebugFlag = jest.fn().mockResolvedValue();
export const isEmpEnabled = jest.fn().mockResolvedValue();

// Mock function for "publishing" platform event
export const jestMockPublish = jest.fn((channel, message) => {
  if (_channels[channel] && _channels[channel].onMessageCallback instanceof Function) {
    _channels[channel].onMessageCallback(message);
  }
  Promise.resolve(true);
});
