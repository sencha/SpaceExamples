Ext.define('Ext.device.Tunnel', {
    singleton: true,

    requires: [
        'Ext.device.tunnel.Simulator',
        'Ext.device.tunnel.Sencha'
    ],

    constructor: function() {
        if (!!window.isNK) {
            return Ext.create('Ext.device.tunnel.Sencha');
        }
        else {
            return Ext.create('Ext.device.tunnel.Simulator');
        }
    }
});
