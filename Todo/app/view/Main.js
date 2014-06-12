/**
 * @class App.view.Main
 * @author Simon Brunel
 */
Ext.define('App.view.Main', {
    extend: 'Ext.Container',
    xtype: 'taskmain',
    requires: [
        'App.view.List',
        'App.view.Edit',
        'Ext.dataview.List'
    ],

    config: {

        layout: {
            type: 'card',
            animation: {
                type: 'slide'
            }
        },

        items: [
            {   xtype: 'tasklist',
                itemId: 'list'
            },
            {   xtype: 'taskedit',
                itemId: 'edit'
            }
        ]
    },

    /**
     * Displays the view associated to the given *selector*.
     */
    display: function(selector) {
        var view = Ext.isString(selector)? this.child(selector) : selector,
            items = this.getItems(),
            i0, i1;

        if (!view) {
            return false;
        }

        i0 = items.indexOf(this.getActiveItem());
        i1 = items.indexOf(view);

        this.getLayout().getAnimation().setReverse(i0 > i1);
        this.setActiveItem(view);
        return true;
    }
});
