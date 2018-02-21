import { combineReducers } from 'redux'
import {
	CHANGE_DIALOG,

	UPDATE_PROJECT,
	CHANGE_ACTIVE_FILEPATH,
	RENAME_NODE,
	DELETE_NODE,
	CREATE_FOLDER,
	CREATE_FILE,
	UPDATE_FILE,

	CHANGE_TAB,
	CLOSE_TAB,
	CHANGE_TAB_CONTENT,
	ADD_TAB,
	UPDATE_TAB,
	
	ADD_RESULT,
	UPDATE_RESULT,
	CLEAR_RESULTS,

	EMPTY_PROJECT,
	INITIAL_CONFIG,

	UPDATE_CONFIG,
	UPDATE_SCHEMA,

	ADD_VARIABLE,
	UPDATE_VARIABLE,
	REMOVE_VARIABLE,
	
	TOGGLE_SHOWVARS,

	UPDATE_CONNECTION
} from '../Constants.js'

import { 
	addFileToProject,
	addFolderToProject,
	updateFile,
	renameNode,
	deleteNode
 } from '../api/Project.js' 

const activeTab = (state = 0, action) => {
	if ( action.type === ADD_TAB ) {
		return action.tab.id
	} else if ( action.type === CHANGE_TAB ) {
		return action.id
	} else if ( action.type === CLOSE_TAB ){
		return action.nextActive
	}

	return state
}


const _projectReducer = {
	[UPDATE_PROJECT]: (state, action) => Object.assign({}, action.project),
	[CREATE_FILE]: (state, action) => { console.log("CREATE_FILE"); return addFileToProject(state, action.file, true) },
	[CHANGE_ACTIVE_FILEPATH]: (state, action) => Object.assign({}, state, { activePath: action.path }),
	[UPDATE_FILE]: (state, action) => updateFile(state, action.file, true),
	[CREATE_FOLDER]: (state, action) => addFolderToProject( state, action.folder, true ),
	[DELETE_NODE]: (state, action) => deleteNode( state, action.nodepath, true ),
	[RENAME_NODE]: (state, action) => renameNode( state, action.path, action.newName, true)
}

const project = (state = EMPTY_PROJECT, action) => {
	
	if ( _projectReducer.hasOwnProperty(action.type) ){
		return _projectReducer[action.type](state,action)
	} 

	return state

}

const tabs = (state = [], action) => {
	if ( action.type === ADD_TAB ){
		const tab = Object.assign({}, action.tab )
		return [...state, tab]

	} else if ( action.type === UPDATE_TAB ){
		const tab = Object.assign({}, action.tab )
		
		return state.map( t => t.id === tab.id ? tab : t)

	} else if ( action.type === CHANGE_TAB_CONTENT ){
		const idx = state.findIndex( t => t.id === action.id )
		const newTab = Object.assign({}, state[idx], { content: action.content }) 

		return state.map( t => t.id === newTab.id ? newTab : t)
	} else if ( action.type === CLOSE_TAB ){
		const idx = state.findIndex( t => t.id === action.id )
		const newState = [...state]
		newState.splice(idx, 1)

		return newState  
	} else if ( action.type === UPDATE_PROJECT ){
		return []
	}

	return state
}

const results = (state = [], action) => {
	if ( action.type === ADD_RESULT ){
		return [...state, action.result]
	} else if ( action.type === CLEAR_RESULTS ) {
		return []
	} else if ( action.type === UPDATE_RESULT ){
		return state.map( r => {
			if ( r.queryConfig.id !== action.result.queryConfig.id ) return r

			const dataUpdated = [...r.result.data, ...action.result.result.data]
			const resultUpdated = Object.assign(r.result, { data: dataUpdated })

			return Object.assign(r, { result: resultUpdated })
		})
	}

	return state
}

const config = ( state = INITIAL_CONFIG, action ) => {
	if ( action.type === UPDATE_CONFIG ){
		return action.config
	}

	return state
}

const schema = ( state = {}, action ) => {
	if ( action.type === UPDATE_SCHEMA ){
		const newSchema = Object.assign({},action)
		delete newSchema.type

		return newSchema 
	}

	return state
}

const showDialog = (state = "", action ) => {
	if( action.type === CHANGE_DIALOG ){
		return action.dialog
	}

	return state
}

const list = (state = [], action) => {
	if ( action.type === ADD_VARIABLE ){

		return [...state, action.variable]
	} else if ( action.type === UPDATE_VARIABLE ){
		const updatedVar = Object.assign({}, action.variable)

		return state.map( v => {
			return v.id === updatedVar.id ? updatedVar : v
		})
	} else if ( action.type === REMOVE_VARIABLE ){
		return state.filter( v => v.id !== action.variable.id)
	}

	return state
}

const show = (state = false, action) => {

	if ( action.type === TOGGLE_SHOWVARS ){
		return ! state
	}

	return state
}

const connection = ( state = {}, action ) => {
	switch(action.type){
		case UPDATE_CONNECTION:
			return action.connection
		default:
			return state
	}
}

const vars = combineReducers({ list, show })

const main = combineReducers({
	connection,
	activeTab,
	showDialog,
	project,
	results,
	tabs,
	config,
	schema,
	vars
})

export default (state, action ) => {
	let newState = main(state, action)

	const { config } = state

	if ( config && config.debugMode ) console.log({ action, pre: state, post: newState })

	return newState
 }