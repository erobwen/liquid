// var ReactTransitionGroup = React.addons.TransitionGroup;
// http://react-toolbox.com/#/components/autocomplete
//
// var performScript = function() {
// 	// console.log("performScript");
// 	setTimeout(
// 		function(){
// 			// console.log("=== Setting name ===")
// 			data.user.setName("Foobar");
// 		},
// 		1000
// 	);
//
// 	setTimeout(
// 		function(){
// 			// var rootCategories = data.user.getRootCategories();
// 			// rootCategories[0].addSubCategory(rootCategories[1]);
// 		},
// 		2000
// 	);
// }

window.LiquidApplication = React.createClass(liquidClassData({
	render: function() {
		return invalidateUponLiquidChange("LiquidApplication", this, function() {
			return (
				<div onClick={ function(event) { dropFocus(event);} }>
					<LoginUI page = { page }/>
					<UserView user = { displayedUser }/>
				</div>
			);
		}.bind(this));
	}
}));

// <div>
// <span>Username: </span><input type="text"></input>
// <span>Password: </span><input type="password"></input>
// <span>Password repeat: </span><input type="password"></input>
// <button>Register</button>
// </div>

var LoginUI = React.createClass(liquidClassData({
	getInitialState: function() {
		return {name: "Walter", password: "liquid"};
	},

	nameChanged: function(event) {
		this.setState({name : event.target.value});
	},

	passwordChanged: function(event) {
		this.setState({password : event.target.value});
	},

	tryLogin : function() {
		page.getPageService().tryLogin(this.state.name, this.state.password);
	},
	
	logout : function() {
		page.getPageService().logout();
	},
	
	render : function() {
		return invalidateUponLiquidChange("LoginUI", this, function() {
			// console.log(this.props.page);
			var page = this.props.page; // same as window.page'
			// traceTags.repetition = true;
			var user = page.getActiveUser();
			// traceTags.repetition = false;
			if (user == null) {
				return (
					<div style={{display: 'flex', flexDirection: 'column', border: '1px', margin: '1em', padding: '1em'}}>
						<span>Username: </span><input ref="usernameInput" type="text" value={ this.state.name }  onChange={ this.nameChanged }></input>
						<span>Password: </span><input ref="passwordInput" type="password" value={ this.state.password } onChange={ this.passwordChanged }></input>
						<button onClick={ this.tryLogin } >Login</button>
					</div>
				);
			} else {
				return (
					<div style={{display: 'flex', 'flex-direction': 'column', border: '1px', margin: '1em', padding: '1em'}}>
						<span>Logged in as <PropertyField object = { user } propertyName = "Name"/></span>
						<button onClick={ this.logout } >Logout</button>
					</div>
				);
			}
		}.bind(this));
	}
}));

var UserView = React.createClass(liquidClassData({
	render: function() {
		return invalidateUponLiquidChange("UserView", this, function() {
			trace('react', "Render in user view. ");
			var rootCategories = this.props.user.cachedCall('getRootCategories');
			// var rootCategories = this.props.user.getOwnedCategories();
			return (
				<div className="UserView">
					<span>{ this.props.user.getName() }'s categories</span>
					<div style={{height: "1em"}}></div>
					<CategoriesView
						key = { this.props.user._id }
						categories = { rootCategories }  // This should evaluate to a new list upon change. This would not work with a relation... Should we create a new object on every change? However, it still means that both components needs reevaluation
					/>
					<button onClick= { function() { performScript(); }} >Execute script</button>
				</div>
			);
		}.bind(this));
	}
}));


var PropertyField = React.createClass(liquidClassData({
	getInitialState: function() {
		return { focused : false };
	},
	clickOnName: function(event) {
		focusComponent(this);
		event.stopPropagation();
	},
	clickOnField: function(event) {
		event.stopPropagation();
		return false;
	},
	propertyChanged: function(event) {
		this.props.object['set' + this.props.propertyName](event.target.value);
	},	
	render: function() {
		return invalidateUponLiquidChange("PropertyField", this, function() {
			var labelString = (typeof(this.props.label) !== 'undefined' && this.props.label !== null) ? (this.props.label + ": ") : "";
			if (this.state.focused) {
				return (
					<span onClick={ this.clickOnField } style={{marginBottom: '1em'}}>
						<span>{ labelString }<input type="text" value={this.props.object['get' + this.props.propertyName]()} onChange={ this.propertyChanged } /></span>
					</span>
				);
			} else {
				return (
					<span onClick={ this.clickOnName } style={{marginBottom: '1em'}}>
						<span>{ labelString }{this.props.object['get' + this.props.propertyName]()}</span>
					</span>
				);
			}
		}.bind(this));
	}
}));


var CategoriesView = React.createClass(liquidClassData({	
	render: function() {
		return invalidateUponLiquidChange("CategoriesView", this, function() {
			var categoriesElements = [];
			this.props.categories.forEach(function(category) {
				// console.log("A key: " + category._id);
				categoriesElements.push(
					<CategoryView 
						key = { category._id }
						category = {category}
					/>
				);
			}.bind(this));
			return ( 
				<div className="CategoriesView">
					{categoriesElements}
				</div>
			);
		}.bind(this));
	}
}));


// Useful pages
// onDrag onDragEnd onDragEnter onDragExit onDragLeave onDragOver onDragStart 
// https://jsfiddle.net/lovedota/22hmo479/
// http://stackoverflow.com/questions/21339924/drop-event-not-firing-in-chrome
// http://unitstep.net/blog/2015/03/03/using-react-animations-to-transition-between-ui-states/
// https://css-tricks.com/restart-css-animation/
			 
var draggedCategory = null;
window.CategoryView = React.createClass(liquidClassData({
	getInitialState: function() {
		return { draggingOver : false, collapsed: false };
	},
	
	componentDidMount: function() {
		if (typeof(this.refs.subCategoriesDiv) !== 'undefined') {
			var subCategoriesDiv = this.refs.subCategoriesDiv;
			// console.log(subCategoriesDiv.style.marginLeft);
			subCategoriesDiv.style.overflow = 'hidden';
			subCategoriesDiv.style.height = 'auto';
			subCategoriesDiv.style.transition = 'height .5s';
			subCategoriesDiv.addEventListener("transitionend", function() {
				// console.log("Finished transition");
				// console.log(subCategoriesDiv);
				// console.log(this);
				// console.log("Height: " + subCategoriesDiv.clientHeight);
				if (subCategoriesDiv.clientHeight !== 0) {
					// console.log("Tree open");
					subCategoriesDiv.style.height = "auto";
					// console.log(this);
					this.setState({collapsed : false});
				} else {
					// console.log("Tree closed");
					// console.log(this);
					this.setState({collapsed : true});
				}
			}.bind(this), false);
		}
    },
		
	
	onDragStart: function(event) {
		// console.log("onDragStart:" + this.props.category.getName());
		draggedCategory = this.props.category;
		// event.dataTransfer.setData("categoryId", this.props.category._id);
	},
	
	dragEnterCounter: 0,
	onDragEnter: function(event) {
		// console.log("onDragEnter:" + this.props.category.getName() + ", " + this.dragEnterCounter);
		event.preventDefault();
		this.dragEnterCounter++;
		var category = this.props.category;
		if (this.dragEnterCounter === 1) {
			// console.log("Drag enter counter is one!");
			if (category.canAddAsSubCategory(draggedCategory)) {
				// console.log("Actually enter!");
				this.setState({ 
					draggingOver: true
				});
			} else {
				this.setState({});
			}
		} else {
			this.setState({});
		}
	},
	
	onDragLeave: function(event) {
		// console.log("onDragLeave:" + this.props.category.getName() + ", " + this.dragEnterCounter);
		event.preventDefault();
		this.dragEnterCounter--;
		var category = this.props.category;
		if (this.dragEnterCounter === 0) {
			// console.log("Drag leave counter is zero!");
			if (category.canAddAsSubCategory(draggedCategory)) {
				// console.log("Actually leave!");
				this.setState({ 
					draggingOver: false
				});
			} else {
				this.setState({});
			}
		}  else {
			this.setState({});
		}
	},
	
	onDragExit: function(event) {
		// console.log("onDragExit:" + this.props.category.getName() + ", " + this.dragEnterCounter);
		event.preventDefault();
		this.setState({ 
			draggingOver: false
		});
	},
	
	onDragOver: function(event) {
		// console.log("onDragOver:" + this.props.category.getName());
		event.preventDefault();
	},
	
	onDrop: function(event) {
		// console.log("onDrop:" + this.props.category.getName() + ", " + this.dragEnterCounter);
		// console.log(this.props.category);
		event.preventDefault();
		this.dragEnterCounter = 0;
		var category = this.props.category;
		var droppedCategory = draggedCategory;
		draggedCategory = null;
		if (category.canAddAsSubCategory(droppedCategory)) {
			liquid.pulse('local', function() {
				console.log(droppedCategory.getParents().length);
				console.log(droppedCategory.getParents());
				var parents = copyArray(droppedCategory.getParents());
				parents.forEach(function(parentCategory) {
					console.log("Dropping parent: " + parentCategory.__());
					droppedCategory.removeParent(parentCategory);
				});
				category.addSubCategory(droppedCategory);	
			});
		}
		this.setState({ 
			draggingOver: false
		});
	},
	
	collapseOrExpand: function() {
		// console.log("collapseOrExpand");
		var subCategoriesDiv = this.refs.subCategoriesDiv;							
		if (subCategoriesDiv.clientHeight === 0) {
			// console.log("... opening");
			// console.log(subCategoriesDiv);
			// console.log(subCategoriesDiv.scrollHeight);
			subCategoriesDiv.style.height = subCategoriesDiv.scrollHeight + "px";
		} else {
			// console.log("... closing");
			subCategoriesDiv.style.height = subCategoriesDiv.scrollHeight + "px";
			setTimeout(function() {
				subCategoriesDiv.style.height = 0; 
			}, 0);
		}
	},
	
	render: function() {
		return invalidateUponLiquidChange("CategoryView", this, function() {
			var subCategories = [];
			var categoryViewElementName ="CategoryView"

			// To replace the plus sign when not showing
			var createCollapseSpacer = function() {
				return (
					<span
						style={{opacity: 0, marginRight: "0.61em"}}
						className={ "fa fa-plus-square-o" }>
					</span>);
			};
			
			// This category is locked
			// console.log("In rendering!");
			// var value = this.props.category.readable();
			// console.log(value);
			// console.log(typeof(value));
			if (!this.props.category.readable()) {
				return (
					<div className="CategoryView">
						{ createCollapseSpacer() }
						<span
							style={{marginRight: "0.61em"}}
							className={ "fa fa-lock" }>
						</span>
					</div>);
			}

			// This category is not loaded
			if (!this.props.category.isLoaded()) {
				return (
					<div className="CategoryView">
						{ createCollapseSpacer() }
						<span
							style={{marginRight: "0.61em"}}
							className={ "fa fa-spinner" }>
						</span>
					</div>);
			}


			this.props.category.getSubCategories().forEach(function(category) {
				// How to do it with standard syntax:

				subCategories.push(
					<CategoryView 
						key = { this.props.category._id + "." + category._id }
						category = {category}
					/>
				);
				
				// How to do it if we get element name as a string:
				// subCategories.push(React.createElement(window[categoryViewElementName], { key : category._id, category : category }));				
			}.bind(this));

			var collapseButton = 
				(this.props.category.getSubCategories().length > 0) ? 
					(<span 
						onClick={ this.collapseOrExpand } 
						style={{marginRight: "0.61em"}} 
						className={ this.state.collapsed ? "fa fa-plus-square-o" : "fa fa-minus-square-o"}>
					</span>)
					:
					(<span 
						style={{opacity: 0, marginRight: "0.61em"}}
						className={ "fa fa-plus-square-o" }>
					</span>);
					
			return (
				<div className="CategoryView">
					<div 
						draggable = "true"
						style={{ marginBottom: this.state.draggingOver ? "0.6em" : "0em"}}
						onDragStart = { this.onDragStart }
						onDragEnter = { this.onDragEnter }
						onDragOver = { this.onDragOver }
						onDragExit = { this.onDragExit }
						onDragLeave = { this.onDragLeave }
						onDrop = { this.onDrop }>
						<span>
							{ collapseButton }
							<PropertyField label={null} object = { this.props.category} propertyName = "Name"/>
						</span>
					</div>
					<div ref="subCategoriesDiv" style={{marginLeft:'1em'}}>
						{ subCategories }
					</div>
				</div>
			);
		}.bind(this));
	}
}));

