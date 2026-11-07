// each pattern can match a text in one way only, so a failing check doesn't backtrack
const INTEGER = /^[+-]?\d+$/;
const DECIMAL = /^[+-]?\d+(\.\d+)?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?$/;
const BOOLEANS = new Set(['true', 'false', 'yes', 'no', '1', '0']);

/** Whether a real calendar date starts the text, e.g. not 2026-02-30. */
const isCalendarDate = (text) => {
  const [year, month, day] = text.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const isEmail = (text) => {
  const at = text.indexOf('@');
  const domain = text.slice(at + 1);
  return (
    at > 0 &&
    !/\s/.test(text) &&
    !domain.includes('@') &&
    domain.includes('.') &&
    !domain.startsWith('.') &&
    !domain.endsWith('.')
  );
};

const checkPicklist = (texts, field, values) => {
  const unknown = values ? texts.find((text) => !values.includes(text)) : undefined;
  return unknown === undefined ? '' : `${field.label}: "${unknown}" isn't a value of the picklist.`;
};

// a check per UI API data type; it returns the message for a value that doesn't fit, or nothing
const CHECKS = {
  Int: (text) => !INTEGER.test(text) && "isn't a whole number.",
  Double: (text) => !DECIMAL.test(text) && "isn't a number. Use a dot for decimals, e.g. 1234.5.",
  Date: (text) => !(DATE.test(text) && isCalendarDate(text)) && "isn't a date. Use YYYY-MM-DD.",
  DateTime: (text) =>
    !(DATE_TIME.test(text) && isCalendarDate(text) && !Number.isNaN(Date.parse(text))) &&
    "isn't a date and time. Use YYYY-MM-DDThh:mm:ssZ.",
  Boolean: (text) => !BOOLEANS.has(text.toLowerCase()) && "isn't true or false.",
  Email: (text) => !isEmail(text) && "isn't an email address."
};
CHECKS.Currency = CHECKS.Double;
CHECKS.Percent = CHECKS.Double;

/**
 * Whether a record can't be created without a value for the field. Fields Salesforce fills in on its own, such as
 * the owner or checkboxes, are not required.
 * @param {Object} field - A field of the UI API object info
 * @returns {boolean}
 */
export function isRequired(field) {
  return Boolean(field.required && !field.defaultedOnCreate);
}

/**
 * Checks one value of a CSV file against the field it is mapped to.
 * @param {string} value - The value, surrounding spaces are ignored
 * @param {Object} field - A field of the UI API object info
 * @param {string[]} [values] - The values of a picklist field; without them, picklist values aren't checked
 * @returns {string} The error message, or an empty string for a valid value
 */
export function checkValue(value, field, values) {
  const text = String(value ?? '').trim();
  if (!text) {
    return isRequired(field) ? `${field.label} is required.` : '';
  }
  if (field.dataType === 'Picklist') {
    return checkPicklist([text], field, values);
  }
  if (field.dataType === 'MultiPicklist') {
    return checkPicklist(
      text.split(';').map((part) => part.trim()),
      field,
      values
    );
  }
  const message = CHECKS[field.dataType]?.(text);
  return message ? `${field.label}: "${text}" ${message}` : '';
}

/**
 * Checks every value of the records and returns the row errors in the format of lightning-datatable.
 * @param {Object[]} records - The rows, with the values under the field API names
 * @param {Object[]} fields - The fields of the UI API object info the columns are mapped to
 * @param {string} keyField - The property holding each record's key
 * @param {Object} [picklists] - The values of each picklist field by API name
 * @returns {Object} The errors of each row with errors by its key: title, messages and fieldNames
 */
export function validateRecords(records, fields, keyField, picklists = {}) {
  const errors = {};
  records.forEach((record) => {
    const messages = [];
    const fieldNames = [];
    fields.forEach((field) => {
      const message = checkValue(record[field.apiName], field, picklists[field.apiName]);
      if (message) {
        messages.push(message);
        fieldNames.push(field.apiName);
      }
    });
    if (messages.length) {
      const title = messages.length === 1 ? 'This row has an error.' : `This row has ${messages.length} errors.`;
      errors[record[keyField]] = { title, messages, fieldNames };
    }
  });
  return errors;
}

/**
 * Reads the values of every picklist from the result of getPicklistValuesByRecordType.
 * @param {Object} [data] - The result of the wire adapter
 * @returns {Object} The values of each picklist field by API name
 */
export function picklistValues(data) {
  return Object.fromEntries(
    Object.entries(data?.picklistFieldValues ?? {}).map(([apiName, picklist]) => [
      apiName,
      picklist.values.map((entry) => entry.value)
    ])
  );
}
