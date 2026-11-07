import NOT_BOOLEAN from '@salesforce/label/c.CsvValidator_NotBoolean';
import NOT_DATE from '@salesforce/label/c.CsvValidator_NotDate';
import NOT_DATE_TIME from '@salesforce/label/c.CsvValidator_NotDateTime';
import NOT_EMAIL from '@salesforce/label/c.CsvValidator_NotEmail';
import NOT_IN_PICKLIST from '@salesforce/label/c.CsvValidator_NotInPicklist';
import NOT_NUMBER from '@salesforce/label/c.CsvValidator_NotNumber';
import NOT_WHOLE_NUMBER from '@salesforce/label/c.CsvValidator_NotWholeNumber';
import REQUIRED from '@salesforce/label/c.CsvValidator_Required';
import ROW_ERROR from '@salesforce/label/c.CsvValidator_RowError';
import ROW_ERRORS from '@salesforce/label/c.CsvValidator_RowErrors';
import { formatLabel } from 'c/labelUtils';

// each pattern can match a text in one way only, so a failing check doesn't backtrack
const INTEGER = /^[+-]?\d+$/;
const DECIMAL = /^[+-]?\d+(\.\d+)?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
// a date/time is checked in parts: the date, the time zone at the end, and the time in between
const TIME = /^T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/;
const ZONE = /(Z|[+-]\d{2}:?\d{2})$/;
const BOOLEANS = new Set(['true', 'false', 'yes', 'no', '1', '0']);
const TRUE_VALUES = new Set(['true', 'yes', '1']);

/** Whether a real calendar date starts the text, e.g. not 2026-02-30. */
const isCalendarDate = (text) => {
  const [year, month, day] = text.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const isDateTime = (text) =>
  DATE.test(text.slice(0, 10)) &&
  TIME.test(text.slice(10).replace(ZONE, '')) &&
  isCalendarDate(text) &&
  !Number.isNaN(Date.parse(text));

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
  return unknown === undefined ? '' : formatLabel(NOT_IN_PICKLIST, field.label, unknown);
};

// a check per UI API data type; it returns the label of the message for a value that doesn't fit, or nothing
const CHECKS = {
  Int: (text) => !INTEGER.test(text) && NOT_WHOLE_NUMBER,
  Double: (text) => !DECIMAL.test(text) && NOT_NUMBER,
  Date: (text) => !(DATE.test(text) && isCalendarDate(text)) && NOT_DATE,
  DateTime: (text) => !isDateTime(text) && NOT_DATE_TIME,
  Boolean: (text) => !BOOLEANS.has(text.toLowerCase()) && NOT_BOOLEAN,
  Email: (text) => !isEmail(text) && NOT_EMAIL
};
CHECKS.Currency = CHECKS.Double;
CHECKS.Percent = CHECKS.Double;

// how a checked value becomes the JSON value Apex reads into the field; other values stay text
const CONVERSIONS = {
  Int: (text) => Number.parseInt(text, 10),
  Double: Number,
  Currency: Number,
  Percent: Number,
  Boolean: (text) => TRUE_VALUES.has(text.toLowerCase()),
  // a date/time without a time zone is taken as the time of the browser
  DateTime: (text) => new Date(text).toISOString(),
  MultiPicklist: (text) =>
    text
      .split(';')
      .map((part) => part.trim())
      .join(';')
};

/**
 * Turns a value that passed checkValue into the value of the field, e.g. a number or a boolean.
 * @param {string} value - The value, surrounding spaces are ignored
 * @param {Object} field - A field of the UI API object info
 * @returns {*} The converted value, or undefined for an empty value, so the field isn't set
 */
export function convertValue(value, field) {
  const text = String(value ?? '').trim();
  if (!text) {
    return undefined;
  }
  const convert = CONVERSIONS[field.dataType];
  return convert ? convert(text) : text;
}

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
    return isRequired(field) ? formatLabel(REQUIRED, field.label) : '';
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
  return message ? formatLabel(message, field.label, text) : '';
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
      const title = messages.length === 1 ? ROW_ERROR : formatLabel(ROW_ERRORS, messages.length);
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
