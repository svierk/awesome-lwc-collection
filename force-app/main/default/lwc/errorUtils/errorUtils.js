import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const messagesOf = (errors) => errors.map((error) => error.message);
const fieldMessagesOf = (fieldErrors) => messagesOf(Object.values(fieldErrors ?? {}).flat());

function messagesFromBody(body) {
  if (Array.isArray(body)) return messagesOf(body);
  const candidates = [
    messagesOf(body?.pageErrors ?? []),
    fieldMessagesOf(body?.fieldErrors),
    messagesOf(body?.output?.errors ?? []),
    fieldMessagesOf(body?.output?.fieldErrors),
    [body?.message]
  ];
  return candidates.find((messages) => messages.some(Boolean)) ?? [];
}

function messagesFromError(error) {
  if (typeof error === 'string') return [error];
  if (Array.isArray(error)) return error.flatMap(messagesFromError);
  if (!error) return [];
  const fromBody = messagesFromBody(error.body);
  return fromBody.length > 0 ? fromBody : [error.message || error.statusText];
}

/**
 * Reads a readable message from an error of Apex, Lightning Data Service, GraphQL, the browser or JavaScript.
 * Follows reduceErrors of the Salesforce LWC recipes: https://github.com/trailheadapps/lwc-recipes
 * @param {*} error - A single error or an array of errors
 * @param {string} fallback - The message to use if the error has none
 * @returns {string} The unique messages, separated by commas
 */
export function getErrorMessage(error, fallback = 'Unknown error') {
  const messages = messagesFromError(error).filter(Boolean);
  return [...new Set(messages)].join(', ') || fallback;
}

/**
 * Dispatches an error toast on the given component.
 * @param {LightningElement} component - The component instance
 * @param {string} title - Toast title
 * @param {*} error - The error to read the toast message from
 */
export function showErrorToast(component, title, error) {
  component.dispatchEvent(new ShowToastEvent({ title, message: getErrorMessage(error), variant: 'error' }));
}
