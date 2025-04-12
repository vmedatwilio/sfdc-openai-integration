const axios = require('axios');
const getDefaultFieldsForObject = require('./tools/getDefaultFieldsForObject');

module.exports = async function FindSalesforceRecord({ objectName, recordName }) {
  console.log(`Finding record in ${objectName} with name: "${recordName}"`);

  //const query = `SELECT Id FROM ${objectName} WHERE Name = '${recordName}' LIMIT 1`;
  let selectedFields = fields || await getDefaultFieldsForObject(objectName);

  const query = `SELECT ${selectedFields.join(',')} FROM ${objectName} WHERE Name = '${recordName}' LIMIT 1`;


  const res = await axios.get(`${process.env.SALESFORCE_URL}/services/data/v58.0/query`, {
    headers: { Authorization: `Bearer ${process.env.SALESFORCE_TOKEN}` },
    params: { q: query },
  });

  const record = res.data.records?.[0];

  if (!record) {
    return `No ${objectName} found with name "${recordName}"`;
  }

  console.log(`✅ Found record ID: ${record.Id}`);
  return record.Id;
};
