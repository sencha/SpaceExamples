/**
 * This class is the main view for the application. It is specified in app.js as the
 * "autoCreateViewport" property. That setting automatically applies the "viewport"
 * plugin to promote that instance of this class to the body element.
 *
 */
Ext.define('Todo.view.main.Main', {
    extend: 'Ext.container.Container',
    requires: [
        'Todo.view.main.MainController',
        'Todo.view.main.MainModel',
        'Todo.view.task.List',
        'Todo.view.task.Edit'
    ],

    xtype: 'app-main',
    
    controller: 'main',
    viewModel: {
        type: 'main'
    },

    plugins: [
        'viewport' 
    ],

    layout: {
        type: 'card'
    },

    items: [
        {   xtype   : 'tasklist',
            itemId  : 'list'
        },
        {   xtype   : 'taskedit',
            itemId  : 'edit'
        }
    ],

    /**
     * Displays the view associated to the given *selector*.
     */
    display: function(selector) {
        var view = Ext.isString(selector)? this.child(selector) : selector,
            layout = this.getLayout();

        layout.setActiveItem(view);
    }
});
