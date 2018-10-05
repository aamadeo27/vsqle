export const CHANGE_DIALOG = "CHANGE_DIALOG"

export const UPDATE_PROJECT = "UPDATE_PROJECT"
export const CREATE_FOLDER = "CREATE_FOLDER"
export const CREATE_FILE = "CREATE_FILE"
export const UPDATE_FILE = "UPDATE_FILE"
export const CHANGE_ACTIVE_FILEPATH = "CHANGE_ACTIVE_FILEPATH"
export const DELETE_NODE = "DELETE_NODE"
export const RENAME_NODE = "RENAME_NODE"

export const CHANGE_TAB = "CHANGE_TAB"
export const CLOSE_TAB = "CLOSE_TAB"
export const CHANGE_TAB_CONTENT = "CHANGE_TAB_CONTENT"
export const UPDATE_TAB = "UPDATE_TAB"
export const ADD_TAB = "ADD_TAB"

export const UPDATE_QUEUE = "UPDATE_QUEUE"

export const ADD_RESULT = "ADD_RESULT"
export const UPDATE_RESULT = "UPDATE_RESULT"
export const CLEAR_RESULTS = "CLEAR_RESULTS"

export const UPDATE_CONFIG = "UPDATE_CONFIG"
export const UPDATE_SCHEMA = "UPDATE_SCHEMA"
export const ADD_VARIABLE = "ADD_VARIABLE"
export const UPDATE_VARIABLE = "UPDATE_VARIABLE"
export const REMOVE_VARIABLE = "REMOVE_VARIABLE"
export const TOGGLE_SHOWVARS = "TOGGLE_SHOWVARS"

export const UPDATE_CONNECTION = "UPDATE_CONNECTION"
export const UPDATE_SPEED_LOGO = "UPDATE_SPEED_LOGO"

export const EMPTY_PROJECT = {
  name: "Project",
  activePath: "/Project",
  root: {
    name: "Project",
    children: []
  }
}

export const INITIAL_CONFIG = {
  debugMode: false,
  useLocalTime: true,
  connections: []
}

export const IGNORE_PATTERN = '--IGNORE-CHANGE\n'

export const CONNECTION_ERROR = 'Connection Error'
export const TIMEOUT_ERROR = 'Timeout error'

