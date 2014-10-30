/**
 * The main application class. An instance of this class is created by app.js when it calls
 * Ext.application(). This is the ideal place to handle application launch and initialization
 * details.
 */
Ext.define('Todo.Application', {
    extend: 'Ext.app.Application',
    
    name: 'Todo',

    models: [
        'Task'
    ],
    
    stores: [
        'Tasks'
    ],
    
    controllers: [
        'Task'
    ],
    
    views: [
        'main.Main'
    ],

    launch: function() {

        // Checking if the app is running within Space environment.
        if (Ext.isSpace) {

            // Initializing Space API (Invoke)
            Ext.space.Invoke.onMessage(Ext.bind(this._message, this));

        } else {

            Ext.Msg.alert(
                'Sencha Space API not available',
                'This app requires Sencha Space for encryption! ' +
                'Visit www.sencha.com'
            );
        }

        // Adding the main view
        Ext.create('Todo.view.main.Main');
    }
});
