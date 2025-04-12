const axios = require('axios');

const DEFAULT_FIELDS = {
  Opportunity: ['Name', 'Amount', 'StageName'],
  Account: ['Name', 'Industry'],
  Contact: ['FirstName', 'LastName', 'Email'],
  Booking__c: ['Experience_Name__c', 'Total_Price__c', 'Is_Canceled__c'],
  // Add more as needed
};

module.exports = async function getDefaultFieldsForObject(objectName) {
  const token = process.env.ACCESS_TOKEN;
  const sfUrl = process.env.SF_LOGIN_URL;

  // First try hardcoded defaults
  if (DEFAULT_FIELDS[objectName]) {
    return DEFAULT_FIELDS[objectName];
  }

  // Otherwise, fetch from Salesforce metadata
  const describeUrl = `${sfUrl}/services/data/v58.0/sobjects/${objectName}/describe`;
  const response = await axios.get(describeUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Choose top 3 readable fields as fallback
  return response.data.fields
    .filter(field => field.name !== 'Id' && field.type !== 'reference' && field.name !== 'attributes')
    .slice(0, 3)
    .map(field => field.name);
};
