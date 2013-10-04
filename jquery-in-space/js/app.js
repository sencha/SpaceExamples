/*global jQuery, Handlebars */
jQuery(function ($) {
	'use strict';

	var Invoke = {

		init: function(){
			var self = this;

			Ext.onSpaceReady(function(){

	    		console.log("Space is ready!");

	    		Ext.space.Invoke.onMessage(function(senderId, message) {
	    			var promise = new Ext.Promise;
            
	    			console.log("got invoke message",senderId, message);

	    			self.handleMessage(message, promise);

	    			return promise;
            
		        });

	    	});
		},

		handleMessage: function(message, promise){

	
			if(message.todo){


				console.log("todo ", message.todo);
				
				App.todos.push({
					id: Utils.uuid(),
					title: message.todo,
					completed: false
				});

				App.render();
				promise.fulfill({created: true});

			} else {
				//oops
				promise.reject("message must contain a todo field");
			}
		}
	};



	var Utils = {
		uuid: function () {
			/*jshint bitwise:false */
			var i, random;
			var uuid = '';

			for (i = 0; i < 32; i++) {
				random = Math.random() * 16 | 0;
				if (i === 8 || i === 12 || i === 16 || i === 20) {
					uuid += '-';
				}
				uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
			}

			return uuid;
		},
		pluralize: function (count, word) {
			return count === 1 ? word : word + 's';
		},
		store: function (namespace, data) {
			// if (arguments.length > 1) {
			// 	return localStorage.setItem(namespace, JSON.stringify(data));
			// } else {
			// 	var store = localStorage.getItem(namespace);
			// 	return (store && JSON.parse(store)) || [];
			// }
			 
			var todos = Ext.space.SecureLocalStorage.get(namespace);
			if(data){
				return todos.set('items', data);
			} else {
				return todos.get('items');
			}
		}
	};

	var App = {
		init: function () {
			this.ENTER_KEY = 13;
			var self = this;
			//this.todos = Utils.store('todos-jquery');

			Utils.store('todos-jquery').then(function(data){
				self.todos = data || [];
				self.cacheElements();
				self.bindEvents();
				self.render();

				//Don't respond to invoke messages until after the data is setup.
				Invoke.init();

			});

		},
		cacheElements: function () {
			this.todoTemplate = Handlebars.compile($('#todo-template').html());
			this.footerTemplate = Handlebars.compile($('#footer-template').html());
			this.$todoApp = $('#todoapp');
			this.$header = this.$todoApp.find('#header');
			this.$main = this.$todoApp.find('#main');
			this.$footer = this.$todoApp.find('#footer');
			this.$newTodo = this.$header.find('#new-todo');
			this.$toggleAll = this.$main.find('#toggle-all');
			this.$todoList = this.$main.find('#todo-list');
			this.$count = this.$footer.find('#todo-count');
			this.$clearBtn = this.$footer.find('#clear-completed');
		},
		bindEvents: function () {
			var list = this.$todoList;
			this.$newTodo.on('keyup', this.create);
			this.$toggleAll.on('change', this.toggleAll);
			this.$footer.on('click', '#clear-completed', this.destroyCompleted);
			list.on('change', '.toggle', this.toggle);
			list.on('dblclick', 'label', this.edit);
			list.on('keypress', '.edit', this.blurOnEnter);
			list.on('blur', '.edit', this.update);
			list.on('click', '.destroy', this.destroy);
		},
		render: function () {
			this.$todoList.html(this.todoTemplate(this.todos));
			this.$main.toggle(!!this.todos.length);
			this.$toggleAll.prop('checked', !this.activeTodoCount());
			this.renderFooter();
			Utils.store('todos-jquery', this.todos);
		},
		renderFooter: function () {
			var todoCount = this.todos.length;
			var activeTodoCount = this.activeTodoCount();
			var footer = {
				activeTodoCount: activeTodoCount,
				activeTodoWord: Utils.pluralize(activeTodoCount, 'item'),
				completedTodos: todoCount - activeTodoCount
			};

			this.$footer.toggle(!!todoCount);
			this.$footer.html(this.footerTemplate(footer));
		},
		toggleAll: function () {
			var isChecked = $(this).prop('checked');

			$.each(App.todos, function (i, val) {
				val.completed = isChecked;
			});

			App.render();
		},
		activeTodoCount: function () {
			var count = 0;

			$.each(this.todos, function (i, val) {
				if (!val.completed) {
					count++;
				}
			});

			return count;
		},
		destroyCompleted: function () {
			var todos = App.todos;
			var l = todos.length;

			while (l--) {
				if (todos[l].completed) {
					todos.splice(l, 1);
				}
			}

			App.render();
		},
		// accepts an element from inside the `.item` div and
		// returns the corresponding todo in the todos array
		getTodo: function (elem, callback) {
			var id = $(elem).closest('li').data('id');

			$.each(this.todos, function (i, val) {
				if (val.id === id) {
					callback.apply(App, arguments);
					return false;
				}
			});
		},
		create: function (e) {
			var $input = $(this);
			var val = $.trim($input.val());

			if (e.which !== App.ENTER_KEY || !val) {
				return;
			}

			App.todos.push({
				id: Utils.uuid(),
				title: val,
				completed: false
			});

			$input.val('');
			App.render();
		},
		toggle: function () {
			App.getTodo(this, function (i, val) {
				val.completed = !val.completed;
			});
			App.render();
		},
		edit: function () {
			$(this).closest('li').addClass('editing').find('.edit').focus();
		},
		blurOnEnter: function (e) {
			if (e.which === App.ENTER_KEY) {
				e.target.blur();
			}
		},
		update: function () {
			var val = $.trim($(this).removeClass('editing').val());

			App.getTodo(this, function (i) {
				if (val) {
					this.todos[i].title = val;
				} else {
					this.todos.splice(i, 1);
				}
				this.render();
			});
		},
		destroy: function () {
			App.getTodo(this, function (i) {
				this.todos.splice(i, 1);
				this.render();
			});
		}
	};

	App.init();
});
