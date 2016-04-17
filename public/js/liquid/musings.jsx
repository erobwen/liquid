var UserView = React.createClass(liquidClassData({
	getInitialState: function() {
		return { mutableUser: null };
	},
	render: function() {
		return invalidateUponLiquidChange("UserView", this, function() {
			if (typeof(this.state.mutableUser) !== 'undefined' && this.state.mutableUser !== null && this.state.mutableUser.getReturnValue() !== null && this.state.editMode) {
				// Is this a good design pattern for requesting a mutable user, and then starting editing? 
				return (
					<div className="UserView">
						// Editable user
					</div>
				);
			} else {
				// console.log("A key: " + this.props.user.id);
				var rootCategories = this.props.user.getRootCategories();
				return (
					<div className="UserView">
						<div style={{marginBottom: '1em'}}>Name: {this.props.user.getName()}</div>
						<CategoriesView
							key = { this.props.user.id }
							categories = { rootCategories }  // This should evaluate to a new list upon change. This would not work with a relation... Should we create a new object on every change? However, it still means that both components needs reevaluation
						/>
						<button onClick= { function() { window.performScript(); }} >Execute script</button>
					</div>
				);				
			}
		}.bind(this));
	}
}));
