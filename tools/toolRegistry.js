module.exports = [
    {
      type: 'function',
      function: {
        name: 'IdentifySalesforceObjectByName',
        description: 'Get the Salesforce API name for a given object label.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'The label or name of the object (e.g., Opportunities, Users).' },
          },
          required: ['name'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'FindSalesforceRecord',
        description: 'Finds a record by name or other filter field and returns its ID.',
        parameters: {
            type: 'object',
            properties: {
                objectName: {
                type: 'string',
                description: 'Salesforce API name of the object (e.g., Account, Contact, Booking__c)',
                },
                recordName: {
                type: 'string',
                description: 'The value to search for in the filter field (e.g., "Edge Communications")',
                },
                filterField: {
                type: 'string',
                description: 'The field to filter on (e.g., "Name", "Experience_Name__c"). Defaults to "Name".',
                },
            },
            required: ['objectName', 'recordName'],
            },
        },
    },
    {
      type: 'function',
      function: {
        name: 'GetRelationshipField',
        description: 'Get the relationship field from a child object to a parent object (e.g., Account).',
        parameters: {
          type: 'object',
          properties: {
            childObjectName: { type: 'string' },
            objectName: { type: 'string'},
            existingRelationshipField: {type:'string'},
          },
          required: ['childObjectName','objectName'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'QueryRelatedRecordsByParent',
        description: 'Query related child records for a given parent record using a relationship field and and let the Assistant choose relevant fields to display',
        parameters: {
          type: 'object',
          properties: {
            parentId: { type: 'string' },
            relatedObjectName: { type: 'string' },
            relationshipField: { type: 'string' },
            limit: { type: 'integer', default: 3 },
          },
          required: ['parentId', 'relatedObjectName', 'relationshipField'],
        },
      },
    },
  ];
  