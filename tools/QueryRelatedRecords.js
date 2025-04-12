const axios = require('axios');
const getDefaultFieldsForObject = require('./tools/getDefaultFieldsForObject');

module.exports = async function QueryRelatedRecords({ parentRecordId, childObjectName, relationshipField, fields, limit = 5 }) {
  console.log(`📘 Querying ${childObjectName} related to parent ID: ${parentRecordId} via ${relationshipField}`);

  const selectedFields = fields || await getDefaultFieldsForObject(childObjectName);

  const query = `
    SELECT ${selectedFields.join(',')}
    FROM ${childObjectName}
    WHERE ${relationshipField} = '${parentId}'
    LIMIT ${limit}
  `;

  const res = await axios.get(`${process.env.SALESFORCE_URL}/services/data/v58.0/query`, {
    headers: { Authorization: `Bearer ${process.env.SALESFORCE_TOKEN}` },
    params: { q: query },
  });

  const results = res.data.records.map(r => r.Name);
  return results.length ? results.join('\n') : `No ${childObjectName} records found.`;
};