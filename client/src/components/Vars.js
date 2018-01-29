import React, { Component } from 'react'
import { connect } from 'react-redux'
import Sidebar from 'react-sidebar'
import { 
	Row, Col,
	Form, FormControl, InputGroup,
	Glyphicon, Button
} from 'react-bootstrap'

import * as actions from '../Actions.js'
import * as api from '../api/api.js'


class Variable extends Component {
	constructor(props){
		super(props)

		this.state = { variable: props.variable }
	}

	onNameChange(e){
		const variable = Object.assign({},this.state.variable, { name: e.target.value })
		this.setState({ variable })
	}

	onValueChange(e){
		const variable = Object.assign({},this.state.variable, { value: e.target.value })
		this.setState({ variable })
	}

	render(){
		const update = () => {
			api.updateVar(this.state.variable)
			this.props.onChange(this.state.variable)
		}
		const remove = variable => {
			api.removeVar(this.state.variable)
			this.props.remove(variable)
		}

		return <Form inline onBlur={update} onSubmit={update}>
			<div id="xx-tmp" />
			<InputGroup>
				<FormControl componentClass={Button} bsStyle="danger" onClick={() => remove(this.props.variable)}>
					<Glyphicon glyph="trash"/>
				</FormControl>
				<InputGroup.Addon>name</InputGroup.Addon>
				<FormControl ref="name" type="text" size={10} value={this.state.variable.name} onChange={this.onNameChange.bind(this)}/>
				<InputGroup.Addon>value</InputGroup.Addon>
				<FormControl ref="value" type="text" size={20} value={this.state.variable.value} onChange={this.onValueChange.bind(this)}/>
			</InputGroup>
		</Form>
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
				name: '',
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

		const content = <div style={{ background: "white", height: "100%", width: "100%", padding: 0, margin: 0 }}>
			<Row>
				<Col xs={12}>
					<Button onClick={this.props.hideVars} bsSize="large" block>
						<Glyphicon glyph="menu-right"/>
					</Button>
				</Col>
			</Row>
			<Row>
				<Col xs={12}>
					<span className="vars-header">Variables</span>
					<br/>
					<Button onClick={addVar} bsSize="small" bsStyle="info" block>
						<Glyphicon glyph="plus-sign"/> Add Variable
					</Button>
					{varList}
				</Col>
			</Row>
    </div>

		return <Sidebar sidebar={content} open={this.props.vars.show} pullRight style={{ overflowY:"hidden"}}>
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