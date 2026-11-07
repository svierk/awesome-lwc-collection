import { gql } from 'lightning/graphql';

/** The most records GraphQL returns in one query without an upper bound. */
export const MAX_RECORDS = 2000;

const API_NAME = /^[A-Za-z]\w*$/;
const SAFE_URL = /^(https:\/\/|\/(?!\/))/i;
const ROOT_ID = 'org-chart-root';

/**
 * Checks that a value is an API name, so object and field names can't change the structure of the query.
 * @param {string} value - The object or field API name
 * @returns {boolean} Whether the value is a valid API name
 */
export function isApiName(value) {
  return API_NAME.test(String(value ?? ''));
}

/**
 * Builds the query for the records of the chart and the plural label of their object.
 * @param {{objectApiName: string, parentField: string, fields: string[]}} config - The object, the field with the
 * parent record and the other fields to load; invalid or empty field names are skipped
 * @returns {Object} The parsed GraphQL query
 */
export function buildQuery({ objectApiName, parentField, fields }) {
  const fieldNodes = [...new Set([parentField, ...fields])]
    .filter(isApiName)
    .map((field) => `${field} { value }`)
    .join(' ');
  return gql`
    query orgChartRecords {
      uiapi {
        query {
          ${objectApiName}(first: ${MAX_RECORDS}) {
            edges { node { Id ${fieldNodes} } }
            pageInfo { hasNextPage }
          }
        }
        objectInfos(apiNames: ["${objectApiName}"]) { labelPlural }
      }
    }
  `;
}

const valueOf = (node, field) => (isApiName(field) ? (node[field]?.value ?? null) : null);

/**
 * Turns the result of the query into chart records.
 * @param {Object} data - The data of the GraphQL wire
 * @param {{objectApiName: string, parentField: string, nameField: string, titleField: string, imageField: string}}
 * config - The object and the fields of the chart
 * @returns {{records: Object[], label: string, hasMore: boolean}} The records, the plural object label and whether
 * there are more records than were loaded
 */
export function toChartRecords(data, { objectApiName, parentField, nameField, titleField, imageField }) {
  const result = data.uiapi.query[objectApiName];
  const records = result.edges.map(({ node }) => ({
    id: node.Id,
    parentId: valueOf(node, parentField),
    name: valueOf(node, nameField),
    title: valueOf(node, titleField),
    imageUrl: valueOf(node, imageField)
  }));
  const label = data.uiapi.objectInfos?.[0]?.labelPlural ?? objectApiName;
  return { records, label, hasMore: Boolean(result.pageInfo?.hasNextPage) };
}

/**
 * Turns the records into one tree, as d3-org-chart needs exactly one root. With a start record that is among the
 * records, the tree is that record and everything below it. Otherwise every record without a loaded parent is a
 * root, and several roots get a shared root node. Records that can't be reached from a root, like those in a cycle,
 * are left out.
 * @param {Object[]} records - The chart records with id and parentId
 * @param {string} startId - The id of the record to start from, optional
 * @param {string} label - The name of the shared root node
 * @returns {Object[]} The records of the tree
 */
export function toTree(records, startId, label) {
  const ids = new Set(records.map((record) => record.id));
  const children = new Map();
  records.forEach((record) => {
    const siblings = children.get(record.parentId) ?? [];
    children.set(record.parentId, [...siblings, record]);
  });

  let roots = records.filter((record) => record.id === startId);
  if (roots.length === 0) {
    roots = records.filter((record) => !ids.has(record.parentId));
  }
  const shared = roots.length > 1 ? { id: ROOT_ID, parentId: null, name: label, title: '' } : undefined;
  const tree = shared ? [shared] : [];
  const queue = roots.map((root) => ({ ...root, parentId: shared?.id ?? null }));
  const visited = new Set();
  while (queue.length > 0) {
    const record = queue.shift();
    // a start record inside a cycle is reached again through its own descendants
    if (!visited.has(record.id)) {
      visited.add(record.id);
      tree.push(record);
      queue.push(...(children.get(record.id) ?? []));
    }
  }
  return tree;
}

/**
 * Lets only https and relative image URLs through, so the node markup can't load script through a javascript: or
 * data: URL.
 * @param {string} url - The image URL of a record
 * @returns {string|undefined} The URL, or undefined if it's missing or not allowed
 */
export function safeImageUrl(url) {
  return SAFE_URL.test(String(url ?? '')) ? url : undefined;
}
