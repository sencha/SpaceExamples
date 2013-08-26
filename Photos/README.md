Simple Photo Browser Example
-----

Space APIS:
	Invoke

This code was origionally derived from sencha-image-grid-list created by Tomoyuki Kashiro <kashiro@github> 
The orgional source can be found here: https://github.com/kashiro/sencha-image-grid-list

Differences From Original: 

index.html Added:
	 <script src="http://space.sencha.io/space.js"></script>

app/view/Main.js 

Added choose and cancel buttons:

	items:[
	    { text: 'Cancel', action: 'cancelInvoke', hidden:true},
	    { text: 'Choose', align: "right", disabled: true, hidden:true, action: 'useSelected'}
	]

Added app/controller/Invoke.js