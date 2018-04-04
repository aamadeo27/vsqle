import React, { Component } from 'react'
import { connect } from 'react-redux'
import Sidebar from 'react-sidebar'
import { 
	Row, Col,
	FormControl, InputGroup,
	Glyphicon, Button, ButtonGroup
} from 'react-bootstrap'

import * as actions from '../Actions.js'
import * as api from '../api/api.js'


class Variable extends Component {
	constructor(props){
		super(props)

		this.state = { variable: props.variable, editable: false }
	}

	onNameChange(e){
		const variable = Object.assign({},this.state.variable, { name: e.target.value })
		this.setState({ variable })
	}

	onValueChange(e){
		const variable = Object.assign({},this.state.variable, { value: e.target.value })
		this.setState({ variable })
	}

	edit(){
		this.setState({ editable: true })
	}

	render(){
		const update = () => {
			api.updateVar(this.state.variable)
			this.props.onChange(this.state.variable)
			this.setState({ editable: false })
		}

		const example = "${" + this.state.variable.name + "} = " + this.state.variable.value

		if ( this.state.editable ){
			return <form onSubmit={update}>
				<InputGroup inline>
					<FormControl 
						placeholder="Name"
						ref="name"
						type="text"
						size={5}
						value={this.state.variable.name}
						onChange={this.onNameChange.bind(this)}
					/>
					<InputGroup.Addon>=</InputGroup.Addon>
					<FormControl 
						placeholder="Value"
						ref="value"
						type="text"
						size={10}
						value={this.state.variable.value}
						onChange={this.onValueChange.bind(this)}
					/>
				</InputGroup>
				<Button type="submit" className="invisible-submit"/>
			</form>
		}

		const remove = () => {
			api.removeVar(this.state.variable)
			this.props.remove(this.state.variable)
		}

		return <Row className="hover-row">
			<Col xs={9}>
				<div className="variable">{example}</div>
			</Col>
			<Col xs={3}>
				<ButtonGroup bsSize="xsmall">
					<Button bsStyle="primary" onClick={() => this.edit()}>
						<Glyphicon glyph="edit"/>
					</Button>
					<Button bsStyle="danger" onClick={remove}>
						<Glyphicon glyph="remove"/>
					</Button>
				</ButtonGroup>
			</Col>
		</Row>
	}
}

class Vars extends Component {

	onChange(variable){
		api.updateVar(variable)
		this.props.updateVar(variable)
	}

	render(){
		const addVar = () => {
			const variable = {
				id : api.getFileID(),
				name: 'var_'+this.props.vars.list.length,
				value: ''
			}

			api.addVar(variable)
			this.props.addVar(variable)
		}

		const onChange = this.onChange.bind(this)
		const varList = this.props.vars.list.map( v => {
			return <Variable
				key={v.id}
				variable={v}
				onChange={onChange}
				remove={this.props.removeVar}
			/>
		})

		const content = <div style={{ background: "white", height: "100%", width: "30vw", padding: 0, margin: 0 }}>
			<Row>
				<Col xs={12}>
					<span className="vars-header">Variables</span>
				</Col>
			</Row>
			<Row>
				<Col xs={12}>
					<hr />
				</Col>
			</Row>
			<Row>
				<Col xs={12}>
					{varList}
				</Col>
			</Row>
			<Row>
				<Col xs={12}>
					<hr />
				</Col>
			</Row>
			<Row>
				<Col xs={2} xsOffset={1}>
					<Button bsStyle="primary" bsSize="small" onClick={addVar}>
						Add Variable
					</Button>
				</Col>
			</Row>
    </div>

		return <Sidebar 
			sidebar={content} 
			open={this.props.vars.show} 
			pullRight 
			style={{ overflowY:"hidden"}}
			onSetOpen={this.props.hideVars}
		>	
			{this.props.children}
		</Sidebar>
	}
}

const mapStateToProps = ({ vars }) => ({ vars })
const mapDispatchToProps = dispatch => ({
	updateVar: variable => dispatch(actions.updateVariable(variable)),
	addVar: variable => dispatch(actions.addVariable(variable)),
	removeVar: variable => dispatch(actions.removeVariable(variable)),
	hideVars: () => dispatch(actions.toggleShowVars)
})


export default connect(mapStateToProps, mapDispatchToProps)(Vars)