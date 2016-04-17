var AorB = React.createClass({
	eventA: function() {
  	console.log("eventA");
  },
	eventB: function() {
  	console.log("eventB");
  },
  render: function() {
  	if(this.props.showA) {
	    return <div onClick={ this.eventA } >Click for event A</div>;  
    } else {
	    return <div onClick={ this.eventB } >Click for event B</div>;    
    }
  }.bind(this)
});

var Experiment = React.createClass({
	setInitialState: function() {
  	return { showA: true } 
  },
	toggle: function() {
  	this.setState({ showA: !this.state })
  },
  render: function() {
	  return (
    	<div>
    		<AorB showA={ this.state.showA } />
        <button onClick={ this.toggle }>Toggle</button>
      </div>
  	)
  }.bind(this)
});

ReactDOM.render(
	<Experiment />,
  document.getElementById('container')
);
