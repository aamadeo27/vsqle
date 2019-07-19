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
		
		UPDATE_QUEUE,
    
    ADD_RESULT,
    UPDATE_RESULT,
    CLEAR_RESULTS,

    UPDATE_CONFIG,
    UPDATE_SCHEMA,

		ADD_VARIABLE,
		UPDATE_VARIABLE,
		REMOVE_VARIABLE,
	
    TOGGLE_SHOWVARS,
    UPDATE_CONNECTION,

    UPDATE_SPEED_LOGO
} from './Constants.js'

export const changeDialog = dialog => ({ type: CHANGE_DIALOG, dialog })

export const changeTab = id => ({ type: CHANGE_TAB, id })
export const closeTab = (id, nextActive) => ({ type: CLOSE_TAB, id, nextActive })
export const changeTabContent = (id, content) => ({ type: CHANGE_TAB_CONTENT, content, id })
export const updateTab = tab => ({ type: UPDATE_TAB, tab })
export const addTab = tab => ({ type: ADD_TAB, tab })

export const updateProject = project => ({ type: UPDATE_PROJECT, project })
export const createFolder = folder => ({ type: CREATE_FOLDER, folder })
export const createFile = file => ({ type: CREATE_FILE, file })
export const updateFile = file => ({ type: UPDATE_FILE, file })
export const changeActivePath = path => ({ type: CHANGE_ACTIVE_FILEPATH, path })
export const deleteNode = nodepath => ({ type: DELETE_NODE, nodepath })
export const renameNode = (path, newName) => ({ type: RENAME_NODE, path, newName })

export const updateQueue = queue => ({ type: UPDATE_QUEUE, queue })

export const addResult = result => {
  console.log("ADD_RESULT", result )
  return { type: ADD_RESULT, result }
}
export const updateResult = result => ({ type: UPDATE_RESULT, result })
export const clearResults = ({ type: CLEAR_RESULTS })

export const updateConfig = config => ({ type: UPDATE_CONFIG, config})
export const updateSchema = (tables, procedures, columns, pks) => ({ type: UPDATE_SCHEMA, tables, procedures, columns, pks })

export const addVariable = variable => ({ type: ADD_VARIABLE, variable })
export const removeVariable = variable => ({ type: REMOVE_VARIABLE, variable })
export const updateVariable = variable => ({ type: UPDATE_VARIABLE, variable })
export const toggleShowVars = ({ type: TOGGLE_SHOWVARS })

export const updateConnection = connection => ({ type: UPDATE_CONNECTION, connection })

export const updateLogoSpeed = speed => ({ type: UPDATE_SPEED_LOGO, speed })