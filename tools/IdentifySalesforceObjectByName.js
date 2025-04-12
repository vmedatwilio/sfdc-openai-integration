const axios = require('axios');
const pluralize = require('pluralize');

module.exports = async function IdentifySalesforceObjectByName({ name }) {
  const objectName = pluralize.singular(name.trim().toLowerCase());

  console.log(`Identifying Salesforce object for: ${objectName}`);

  const res = await axios.get(`${process.env.SALESFORCE_URL}/services/data/v58.0/sobjects`, {
    headers: { Authorization: `Bearer ${process.env.SALESFORCE_TOKEN}` },
  });

  const match = res.data.sobjects.find(
    obj =>
      obj.label.toLowerCase() === objectName ||
      obj.labelPlural.toLowerCase() === objectName ||
      obj.name.toLowerCase() === objectName
  );

  if (!match) {
    return `Object not found for: ${name}`;
  }

  console.log(`✅ Matched to: ${match.name}`);
  return match.name;
};
