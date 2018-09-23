import React, { Component } from 'react'
import { Alert, Glyphicon, Collapse, Label } from 'react-bootstrap'

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
		const onToggleShow = this.onClick.bind(this)
		const glyph = expanded ? "collapse-up" : "collapse-down"

		let title = ((queryConfig.select && queryConfig.select.original) || queryConfig.query || queryConfig.invocation)
		title = title.substring(0, 100) +  (title.length < 200 ? '' : '...')
		title = <div className="text-left result-bar">
			<div className="result-title" onClick={onToggleShow}>
				<Glyphicon bsStyle="danger" glyph={glyph} />
				<span>{title}</span>
				<Label bsStyle="danger">error</Label>
			</div>
		</div>
		
		return <div>
			{title}
			<Collapse in={expanded}>
				<Alert bsStyle="danger">{error}</Alert>
			</Collapse>
			<hr />
		</div> 
	}
}