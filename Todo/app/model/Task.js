/**
 * @class App.model.Task
 * @author Simon Brunel
 */
Ext.define('App.model.Task', {
    extend: 'Ext.data.Model',

    config: {
        fields: [
            {   // Task title (required)
                name: 'title',
                type: 'string'
            },
            {   // Task description (optional)
                name: 'description',
                type: 'string'
            },
            {   // Created date (required)
                name: 'created',
                type: 'date'
            },
            {   // Completed state
                name: 'completed',
                type: 'boolean',
                defaultValue: false
            }
        ],

        validations: [
            { field: 'title', type: 'presence' },
            { field: 'created', type: 'presence' }
        ]
    }
});