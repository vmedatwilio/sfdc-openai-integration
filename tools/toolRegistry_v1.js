const toolRegistry = [
    {
        "type": "function",
        "function": {
            "name": "IdentifySalesforceObjectByName",
            "description": "Finds the correct Salesforce object based on a common name. E.g., 'CTA' → 'CTA__c'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The common name of the Salesforce object. Example: 'CTA', 'Opportunity', 'Task'."
                    }
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "IdentifyParentObject",
            "description": "Finds the parent object of a given Salesforce object only when parentObjectName is null . E.g., 'CTA__c' → 'Account'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "childObjectName": {
                        "type": "string",
                        "description": "The API name of the child Salesforce object. Example: 'CTA__c', 'Task'."
                    },
                    "parentObjectName": {
                        "type": "string",
                        "description": "The API name of the parent Salesforce object. Example: 'Account', 'Contact'."
                    }
                },
                "required": ["childObjectName", "parentObjectName"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "GetRelationshipField",
            "description": "Finds the relationship field between a child object and its parent in Salesforce.",
            "parameters": {
                "type": "object",
                "properties": {
                    "childObjectName": {
                        "type": "string",
                        "description": "The API name of the child object. Example: 'CTA__c'."
                    },
                    "parentObjectName": {
                        "type": "string",
                        "description": "The API name of the parent object. Example: 'Account'."
                    }
                },
                "required": ["childObjectName", "parentObjectName"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "FindSalesforceRecord",
            "description": "Finds a specific Salesforce record based on name and object type. Example: 'Find Edge Communications in Account'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "objectName": {
                        "type": "string",
                        "description": "The Salesforce object to search in. Example: 'Account', 'Contact'."
                    },
                    "recordName": {
                        "type": "string",
                        "description": "The name of the record to find. Example: 'Edge Communications'."
                    }
                },
                "required": ["objectName", "recordName"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "QueryRelatedRecordsByParent",
            "description": "Finds child records linked to a specific parent record in Salesforce.",
            "parameters": {
                "type": "object",
                "properties": {
                    "parentId": {
                        "type": "string",
                        "description": "The Salesforce ID of the parent record. Example: '001XXXXXXXXXXXX'."
                    },
                    "relatedObjectName": {
                        "type": "string",
                        "description": "The child object related to the parent. Example: 'CTA__c', 'Task'."
                    },
                    "relationshipField": {
                        "type": "string",
                        "description": "The lookup field that links the child object to the parent. Example: 'Account__c'."
                    },
                    "fields": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "description": "Fields to retrieve for each child record. Example: ['Id', 'Name', 'Status__c']."
                    },
                    "limit": {
                        "type": "integer",
                        "description": "The maximum number of records to return.",
                        "default": 10
                    }
                },
                "required": ["parentId", "relatedObjectName", "relationshipField"]
            }
        }
    }
];

module.exports = toolRegistry;
