###Emergency Contacts


####TESTING

Access index.html over a web server.

####BUILDING

Due to issues with Touch 2.2 production microloader in regards to utilizing local storage,
we're building this as "package", which doesn't utilize local storage. Hence, the build process is as follows:

* cd into this directory (where this README.md is)
* wipe build/Contacts/ (it doesn't get cleaned between builds)
* edit cache.appcache and update the timestamp (otherwise you won't be able to refresh your app)
* edit index.html and update version string (search for Contacts.versionString)
* execute "sencha app build package" (alternatively you could build testing)
* navigate to build/Contacts/package (or testing)
* this is your deployable


--------
####Important
Version 0.4.0 is built using : sencha app build, and deployed the content of build/production/Contacts
If you experience any issues that are related to production build, follow the instructions above and re-deploy the app.