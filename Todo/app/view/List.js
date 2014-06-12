/**
 * @class App.view.List
 * @author Simon Brunel
 */
Ext.define('App.view.List', {
    extend: 'Ext.Container',
    xtype: 'tasklist',

    /**
     * @event taskcreate
     * Fired when a task creation is requested.
     * @param {Ext.form.Panel} form Form from which extract task data.
     */

    /**
     * @event taskmodify
     * Fired when a task modification is requested.
     * @param {App.model.Task} record Task to modify associate record.
     */

    config: {

        baseCls: 'tasklist',

        layout: { type: 'vbox',  align: 'stretch' },

        items: [
            {   xtype: 'formpanel',
                scrollable: null,
                items: [
                    {   xtype: 'container',
                        layout: 'hbox',
                        items: [
                            {   xtype: 'textfield',
                                name: 'title',
                                placeHolder: 'New Task',
                                flex: 1
                            },
                            {   xtype: 'button',
                                action: 'create',
                                iconCls: 'add',
                                disabled: true
                            }
                        ]
                    }
                ]
            },
            {   xtype: 'list',
                store: 'tasks',
                itemId: 'list',
                infinite: true,
                loadingText: false,
                emptyText: 'No Tasks',
                disableSelection: true,
                scrollable: { direction: 'vertical', directionLock: true },
                flex: 1,
                itemTpl: [
                    '<div class="<tpl if="completed">task-done</tpl>">',
                        '<div>{title}</div>',
                    '</div>'
                ]
            }
        ],

        control: {
            'list': {
                itemtap: '_onItemTap',
                itemswipe: '_onItemSwipe'
            },
            'button[action=create]': {
                tap: '_create'
            },
            'textfield': {
                action: '_onFieldAction',
                change: '_onFieldChange',
                keyup: '_updateActions'
            }
        }
    },

    /**
     * @private
     */
    _create: function() {
        var form = this.down('formpanel');
        this.fireEvent('taskcreate', form);
    },

    /**
     * @private
     */
    _updateActions: function() {
        var field = this.down('textfield[name=title]'),
            empty = Ext.isEmpty(field.getValue());

        this.down('button[action=create]').setDisabled(empty);
    },

    /**
     * @private
     */
    _onItemTap: function(list, idx, el, record) {
        this.fireEvent('taskmodify', record);
    },

    /**
     * @private
     */
    _onItemSwipe: function(list, index, target, record, e) {
        this.fireEvent('tasktoggle', record, e.direction == 'right');
    },

    /**
     * @private
     */
    _onFieldAction: function(field) {
        if (Ext.isEmpty(field.getValue())) {
            // keep focus if field empty
            return false;
        } else {
            this._create();
        }
    },

    /**
     * @private
     */
    _onFieldChange: function(field) {
        this._updateActions();
    }
});
