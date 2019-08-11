import React from 'react'
import { connect } from 'react-redux'

import * as actions from '../../Actions.js'
import * as query from '../../api/query.js'


/**
 * Depends on :
 * 	queue
 */
class QueueConsumer extends React.Component {

	componentDidUpdate(){
		this.consume()
	}

	handleResult(response){
		const { queue, updateQueue } = this.props

		if ( queue.length === 0 ) return
		
		if ( response.error ) {
			updateQueue([])
		} else {
			updateQueue( queue.slice(1, queue.length) )
		}
	}

	consume(){
		const { addResult, variables, schema, queue, logout, updateLogoSpeed } = this.props

		if ( queue.length === 0 ) return updateLogoSpeed(60);

		const queryConfig = queue[0];

		query.executeQuery(queryConfig, schema, variables).then( response => {
			query.handleResponse(response, logout, addResult)
			
			this.handleResult(response)
		})
	}

  render() {
    return <div />
  }
}

const mapStateToProps = ({ vars, schema, queue }) => ({ 
	variables: vars.list,
	schema,
	queue
})

const mapDispatchToProps = dispatch => ({
	addResult: result => dispatch(actions.addResult(result)),
	logout: () => dispatch(actions.updateConnection({})),
  updateQueue: queue => dispatch(actions.updateQueue(queue)),
  updateLogoSpeed: speed => dispatch(actions.updateLogoSpeed(speed))
})

export default connect(mapStateToProps, mapDispatchToProps)(QueueConsumer)