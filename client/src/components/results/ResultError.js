import React, { Component } from 'react'
import { Panel, Glyphicon } from 'react-bootstrap'

export default class extends Component {
	constructor(props){
		super(props)
		this.state = { expanded: props.queryConfig.id === 0 }
	}

	onClick(){
		this.setState({ expanded: !this.state.expanded })
	}

	componentWillReceiveProps(props){
		if ( props.queryConfig.id !== this.props.queryConfig.id ){
			if ( props.queryConfig.id === 0 || this.props.queryConfig.id === 0 ){
				this.setState({ expanded: props.queryConfig.id === 0 })
			}
		}
	}

	render(){
		const { queryConfig, error } = this.props
		const { expanded } = this.state
		const onClick = this.onClick.bind(this)
		const glyph = expanded ? "expand" : "collapse-down"
		
		const style = {
			fontWeight: "bold",
			cursor: "pointer"
		}

		const title = <div className="text-left" style={style}  onClick={onClick} >
			<Glyphicon glyph={glyph} />
			{' ' + ((queryConfig.select && queryConfig.select.original) || queryConfig.query)}
		</div>

		return <Panel expanded={expanded} bsStyle="danger" onToggle={() =>{}}>
			<Panel.Heading>{title}</Panel.Heading>
			<Panel.Body>
			<span className="pull-left">{error}</span>
			</Panel.Body>
		</Panel>
	}
}