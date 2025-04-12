const axios = require('axios');
const pluralize = require('pluralize');
const Fuse = require("fuse.js");

const qs = require("querystring");

const sfUrl = process.env.SALESFORCE_URL;
const sfToken = process.env.SALESFORCE_TOKEN;

async function IdentifySalesforceObjectByName({ name }) {
    /*const res = await axios.get(`${sfUrl}/services/data/v58.0/sobjects`, {
        headers: { Authorization: `Bearer ${sfToken}` },
    });

    const match = res.data.sobjects.find(
        obj => obj.label.toLowerCase().includes(name.toLowerCase()) || 
               obj.name.toLowerCase().includes(name.toLowerCase())
    );

    return match?.name || `No object found for: ${name}`;*/
   // return fetchAndCacheSalesforceObjects({name});
   try {
    console.log(`🔍 Identifying Salesforce object for: ${name}`);
    const allObjects = await fetchAndCacheSalesforceObjects();
   name = name.toLowerCase().trim();

        // Check exact API name match first
        let matchedObject = allObjects.find(obj => obj.name.toLowerCase() === name);
        if (matchedObject) return matchedObject.name;

        // Check label and plural label
        matchedObject = allObjects.find(obj => 
            obj.label.toLowerCase() === name || obj.labelPlural.toLowerCase() === name
        );
        if (matchedObject) return matchedObject.name;

        // Fuzzy matching: Allow abbreviations like "CTA" for "Marketing CTA"
        matchedObject = allObjects.find(obj => 
            obj.label.toLowerCase().includes(name) || obj.labelPlural.toLowerCase().includes(name)
        );
        if (matchedObject) return matchedObject.name;

        console.warn(`⚠️ No exact match found for: ${name}`);
        return null;
    } catch (error) {
        console.error("❌ Error identifying Salesforce object:", error);
        return null;
    }
}

async function IdentifyParentObject({ childObjectName,parentObjectName}) {

    console.log(childObjectName);
    console.log(parentObjectName);

    if (parentObjectName) {
        return parentObjectName;
    }

    const res = await axios.get(`${sfUrl}/services/data/v58.0/sobjects/${childObjectName}/describe`, {
        headers: { Authorization: `Bearer ${sfToken}` },
    });

    const parentField = res.data.fields.find(f => f.referenceTo.length > 0);
    return parentField ? parentField.referenceTo[0] : `No parent object found for ${childObjectName}`;
}

async function GetRelationshipField({ childObjectName, parentObjectName }) {

    console.log(childObjectName);
    console.log(parentObjectName);
    
    const res = await axios.get(`${sfUrl}/services/data/v58.0/sobjects/${childObjectName}/describe`, {
        headers: { Authorization: `Bearer ${sfToken}` },
    });

    const field = res.data.fields.find(f => f.referenceTo.includes(parentObjectName));
    return field ? field.name : `No relationship found from ${childObjectName} to ${parentObjectName}`;
}

async function fetchAndCacheSalesforceObjects() {

    try {
      const res = await axios.get(`${sfUrl}/services/data/v58.0/sobjects`, {
        headers: { Authorization: `Bearer ${sfToken}` },
      });
  
      const objects = res.data.sobjects
      .filter(obj => 
        !obj.name.endsWith('ChangeEvent') &&  // Ignore CDC objects
        !obj.name.endsWith('History') &&  // Ignore CDC objects
        !obj.name.endsWith('Share') &&      // Ignore History tracking objects
        !obj.name.endsWith('Tag')         // Ignore Tag objects
    )
      .map(obj => ({
        name: obj.name,            // API Name (e.g., "FSR__c")
        label: obj.label,          // UI Label (e.g., "Marketing CTA")
        labelPlural: obj.labelPlural, // Plural label (e.g., "Marketing CTAs")
        keyPrefix: obj.keyPrefix,  // Object key prefix (if needed)
        custom: obj.custom         // Whether it's a custom object
    }));

    return objects;
    } catch (error) {
        console.error("❌ Error fetching Salesforce objects:", error.response?.data || error.message);
        return [];
    }
  }

async function describeSalesforceObject(objectName) {
    try {
        //const exactBjectName=fetchAndCacheSalesforceObjects(objectName);
        console.log(`🔍 Fetching metadata for ${objectName}`);
        const response = await axios.get(
            `${sfUrl}/services/data/v58.0/sobjects/${objectName}/describe`,
            { headers: { Authorization: `Bearer ${sfToken}` } }
        );
        return response.data;
    } catch (error) {
        console.error(`❌ Error fetching metadata for ${objectName}:`, error);
        return null;
    }
}

async function querySalesforce(query) {
    try {
        console.log(`🔍 Running SOQL query: ${query}`);

        const encodedQuery = encodeURIComponent(query);
        const response = await axios.get(
            `${sfUrl}/services/data/v58.0/query?q=${encodedQuery}`,
            {
                headers: {
                    Authorization: `Bearer ${sfToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log(`✅ Query success, found ${response.data.records.length} records.`);
        return response.data; // Returns records from Salesforce
    } catch (error) {
        console.error("❌ Salesforce Query Error:", error.response?.data || error.message);
        return { error: error.message };
    }
}

async function FindSalesforceRecord({ objectName, recordName }) {
   /* try {
        console.log(`🔍 Searching for ${objectName} where Name = '${recordName}'`);

        // Step 1: Fetch object metadata to check lookup fields
        console.log(`🔍 Fetching metadata for ${objectName}`);
        const describeResponse = await describeSalesforceObject(objectName);

        // Step 2: Identify a parent lookup field dynamically
        let parentField = null;
        let parentObject = null;
        for (const field of describeResponse.fields) {
            if (field.type === "reference") {
                parentField = field.name;      // Lookup field name (e.g., Account__c)
                parentObject = field.referenceTo[0]; // Parent object (e.g., Account)
                break;
            }
        }

        if (parentField && parentObject) {
            console.log(`🔍 Detected lookup field: ${parentField} → Parent: ${parentObject}`);

            // Step 3: First, fetch the parent record ID
            console.log(`🔍 Fetching ${parentObject} ID for '${recordName}'`);
            const parentQuery = `SELECT Id FROM ${parentObject} WHERE Name = '${recordName}'`;
            const parentResponse = await querySalesforce(parentQuery);

            if (!parentResponse.records.length) {
                console.log(`❌ No ${parentObject} found with name '${recordName}'`);
                return { error: `${parentObject} not found` };
            }

            const parentId = parentResponse.records[0].Id;
            console.log(`✅ Found ${parentObject} ID: ${parentId}`);

            // Step 4: Query child records related to the parent
            console.log(`🔍 Fetching ${objectName} where ${parentField} = '${parentId}'`);
            const childQuery = `SELECT Id, Name FROM ${objectName} WHERE ${parentField} = '${parentId}'`;
            const childResponse = await querySalesforce(childQuery);

            console.log(`✅ Found ${childResponse.records.length} ${objectName} records.`);
            return childResponse.records;
        } else {
            // If no parent lookup exists, perform a normal search
            console.log(`🔍 No lookup detected. Performing standard query.`);
            const query = `SELECT Id, Name FROM ${objectName} WHERE Name = '${recordName}'`;
            const response = await querySalesforce(query);

            console.log(`✅ Found ${response.records.length} ${objectName} records.`);
            return response.records;
        }
    } catch (error) {
        console.error("❌ Error in FindSalesforceRecord:", error);
        return { error: error.message };
    }*/
// Step 1: Get all fields dynamically
    const fieldQuery = `SELECT QualifiedApiName FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = '${objectName}'`;
    const fieldRes = await axios.get(`${sfUrl}/services/data/v58.0/query`, {
        headers: { Authorization: `Bearer ${sfToken}` },
        params: { q: fieldQuery },
    });

    const allFields = fieldRes.data.records.map(f => f.QualifiedApiName);
   //?q=Acme&sobject=Account&Account.fields=id,name&Account.limit=10
    //const encodedQuery = encodeURIComponent(`${recordName}&sobject=${objectName}&${objectName}.fields=id,name&${objectName}.limit=10`);
    const encodedQuery=`${recordName}&sobject=${objectName}&${objectName}.fields=${allFields.slice(0, 50).join(',')}&${objectName}.limit=10`;
    console.log(encodedQuery);

    try {
        const response = await axios.get(
            `${sfUrl}/services/data/v63.0/parameterizedSearch/?q=${encodedQuery}`,
            {
                headers: {
                    Authorization: `Bearer ${sfToken}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error("Salesforce SOSL Query Error:", error.response?.data || error.message);
        return null;
    }
}

async function QueryRelatedRecordsByParent({ parentId, relatedObjectName, relationshipField, limit = 10 }) {
    
    const selectedFields =  await getDefaultFieldsForObject(relatedObjectName);
    const query = `SELECT ${selectedFields.join(', ')} FROM ${relatedObjectName} WHERE ${relationshipField} = '${parentId}' LIMIT ${limit}`;
    const encodedQuery = encodeURIComponent(query);

    const res = await axios.get(`${sfUrl}/services/data/v58.0/query?q=${encodedQuery}`, {
        headers: { Authorization: `Bearer ${sfToken}` },
    });

    return res.data.records;
}

async function getDefaultFieldsForObject(objectName) {

  // Otherwise, fetch from Salesforce metadata
  //const describeUrl = `${sfUrl}/services/data/v58.0/sobjects/${objectName}/describe`;
  
  const response = await axios.get(`${sfUrl}/services/data/v58.0/sobjects/${objectName}/describe`, {
    headers: { Authorization: `Bearer ${sfToken}` },
  });

  // Choose top 3 readable fields as fallback
  return response.data.fields
    .filter(field => field.name !== 'Id' && field.type !== 'reference' && field.name !== 'attributes')
    .slice(0, 3)
    .map(field => field.name);
}

module.exports = {
    IdentifySalesforceObjectByName,
    IdentifyParentObject,
    GetRelationshipField,
    FindSalesforceRecord,
    QueryRelatedRecordsByParent,
    getDefaultFieldsForObject,
  };
