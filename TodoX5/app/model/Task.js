/**
 * @class Todo.model.Task
 */
Ext.define('Todo.model.Task', {
    extend: 'Ext.data.Model',

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

    validators: [
        { field: 'title', type: 'presence' },
        { field: 'created', type: 'presence' }
    ]
});