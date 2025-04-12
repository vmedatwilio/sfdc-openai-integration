const axios = require('axios');
const pluralize = require('pluralize');
const Fuse = require("fuse.js");
const NodeCache = require("node-cache");
const qs = require("querystring");

const sfUrl = process.env.SALESFORCE_URL;
const sfToken = process.env.SALESFORCE_TOKEN;

const DEFAULT_FIELDS = {
    Opportunity: ['Name', 'Amount', 'StageName'],
    Account: ['Name', 'Industry'],
    Contact: ['FirstName', 'LastName', 'Email'],
    // Add more as needed
  };

// Initialize cache
const cache = new NodeCache({ stdTTL: 86400 }); // Cache for 24 hours

async function fetchAndCacheObjectMetadata(objectName) {
    const cacheKey = `metadata_${objectName}`;
  
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
  
    try {
      const res = await axios.get(`${sfUrl}/services/data/v58.0/sobjects/${objectName}/describe`, {
        headers: { Authorization: `Bearer ${sfToken}` },
      });
  
      const relationshipFields = res.data.fields
        .filter(field => field.referenceTo.length > 0) // Only relationship fields
        .map(field => ({
          fieldName: field.name,
          referenceTo: field.referenceTo[0], // Assuming single object reference
        }));
  
      cache.set(cacheKey, relationshipFields);
      return relationshipFields;
    } catch (error) {
      console.error(`Error fetching metadata for ${objectName}:`, error);
      return [];
    }
  }
async function fetchAndCacheSalesforceObjects() {
    const cacheKey = "salesforce_objects";
  
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
  
    try {
      const res = await axios.get(`${sfUrl}/services/data/v58.0/sobjects`, {
        headers: { Authorization: `Bearer ${sfToken}` },
      });
  
      const objects = res.data.sobjects.map(obj => ({
        label: obj.label.toLowerCase(),
        name: obj.name.toLowerCase(),
      }));
  
      cache.set(cacheKey, objects);
      return objects;
    } catch (error) {
      console.error("Error fetching Salesforce objects:", error);
      return [];
    }
  }
// --- Tool 1: Identify Salesforce Object by Label Name ---
async function IdentifySalesforceObjectByName({ name }) {

    const objects = await fetchAndCacheSalesforceObjects();
    if (objects.length === 0) return "Error fetching Salesforce objects.";

  const userInput = pluralize.singular(name.trim().toLowerCase());

  // Sort by length (prioritize longer, more specific names)
  objects.sort((a, b) => b.label.length - a.label.length);

  // Fuzzy search setup
  const fuse = new Fuse(objects, {
    keys: ["label", "name"],
    threshold: 0.2, // Lower threshold for stricter matching
    findAllMatches: true,
  });

  let matches = fuse.search(userInput);

  // Prioritize exact or near-exact matches
  if (matches.length > 1) {
    matches = matches.filter(m => userInput.includes(m.item.label) || userInput.includes(m.item.name));
  }

  if (matches.length > 1) {
    const topMatches = matches.map(m => m.item.label).slice(0, 3);
    return `Multiple objects found for "${name}": ${topMatches.join(", ")}. Please specify.`;
  }

  const bestMatch = matches.length ? matches[0].item.name : null;
  return bestMatch ? bestMatch : `No object found for: ${name}`;

}

// --- Tool 2: Find Record ID by Name ---
async function FindSalesforceRecord({ objectName, recordName,filterField }) {

    // Step 1: Get all fields dynamically
    const fieldQuery = `SELECT QualifiedApiName FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = '${objectName}'`;
    const fieldRes = await axios.get(`${sfUrl}/services/data/v58.0/query`, {
        headers: { Authorization: `Bearer ${sfToken}` },
        params: { q: fieldQuery },
    });

    const allFields = fieldRes.data.records.map(f => f.QualifiedApiName);

    const encodedQuery = encodeURIComponent(`FIND {${recordName}}`);
    console.log(encodedQuery);

    try {
        const response = await axios.get(
            `${sfUrl}/services/data/v63.0/search/?q=${encodedQuery}`,
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

// --- Tool 3: Get Relationship Field ---
async function GetRelationshipField({ childObjectName, parentObjectName,existingRelationshipField}) {
    //childObjectName=fetchAndCacheObjectMetadata(pluralize.singular(childObjectName.trim().toLowerCase()));
    //IdentifySalesforceObjectByName(parentObjectName);
    console.log(existingRelationshipField);
    console.log(childObjectName);
    console.log(parentObjectName);

    if (existingRelationshipField) {
        console.log(`Using existing relationship field: ${existingRelationshipField}`);
        return existingRelationshipField;
    }
    
    const relationships = await fetchAndCacheObjectMetadata(childObjectName);
    console.log(relationships);
    const matchingField = relationships.find(rel => rel.referenceTo === parentObjectName);
    
    if (!matchingField) {
      return `Error: No relationship field found from ${childObjectName} to ${parentObjectName}`;
    }
  
    return matchingField.fieldName;
}

// --- Tool 4: Query Related Records by Relationship ---
async function QueryRelatedRecordsByParent({ parentId, relatedObjectName, relationshipField, fields,limit = 5 }) {

    //relatedObjectName=IdentifySalesforceObjectByName({ name: relatedObjectName });
    const selectedFields = fields || await getDefaultFieldsForObject(relatedObjectName);
  
    const query = `SELECT ${selectedFields.join(',')} FROM ${relatedObjectName} WHERE ${relationshipField} = '${parentId}' LIMIT ${limit}`;
    //const query = `SELECT ${fields.join(', ')} FROM ${relatedObjectName} WHERE ${relationshipField} = '${parentId}' LIMIT ${limit}`;
      
  //const query = `SELECT Name FROM ${relatedObjectName} WHERE ${relationshipField} = '${parentId}' LIMIT ${limit}`;

  const res = await axios.get(`${sfUrl}/services/data/v58.0/query`, {
    headers: { Authorization: `Bearer ${sfToken}` },
    params: { q: query },
  });

  return {
    status: res.data.records.length > 0 ? "success" : "no_records",
    message: res.data.records.length 
      ? `Found ${res.data.records.length} related ${relatedObjectName} records.` 
      : `No related ${relatedObjectName} records found.`,
    records: res.data.records // 🔹 Returning full record data
  };

  //const names = res.data.records.map(rec => rec.Name);
  //return names.length ? names.join(', ') : `No related ${relatedObjectName} records found for parent ID ${parentId}`;
}

async function getDefaultFieldsForObject(objectName) {

  // First try hardcoded defaults
  if (DEFAULT_FIELDS[objectName]) {
    return DEFAULT_FIELDS[objectName];
  }

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
  FindSalesforceRecord,
  GetRelationshipField,
  QueryRelatedRecordsByParent,
  getDefaultFieldsForObject,
};
