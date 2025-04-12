const axios = require('axios');

module.exports = async function GetRelationshipField({ childObjectName, parentObjectName }) {
  const res = await axios.get(`${process.env.SALESFORCE_URL}/services/data/v58.0/sobjects/${childObjectName}/describe`, {
    headers: { Authorization: `Bearer ${process.env.SALESFORCE_TOKEN}` },
  });

  const match = res.data.fields.find(
    f => f.referenceTo.includes(parentObjectName)
  );

  return match?.name || `No relationship field found from ${childObjectName} to ${parentObjectName}`;
};