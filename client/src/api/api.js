import * as Project from './Project.js'

export const getProjectString = name => localStorage.getItem(name) 
export const getProject = name => JSON.parse(localStorage.getItem(name))
export const setProject = project => localStorage.setItem(project.name, JSON.stringify(project))
export const setActiveProject = name => localStorage.setItem("$activeProject", name)

export const getActiveProject = () => {
    const name = localStorage.getItem("$activeProject") || "Project"
    return JSON.parse(localStorage.getItem(name)) || undefined
}

export const updateProject = (project, callback) => {
    setProject(project)
    setActiveProject(project.name)

    if ( typeof callback === 'function') callback()
}

export const renameProject = (project, newName) => {
    localStorage.removeItem(project.name)
    project.name = newName
    project.root.name = newName
    project.activePath = "/" + newName
    localStorage.setItem(project.name, JSON.stringify(project))
    localStorage.setItem("$activeProject", project.name)
}

export const updateFile = ( projectName, file, callback ) => {
    file = Object.assign({}, file)
    delete file.editor

    const project = getProject(projectName)
	Project.updateFile(project, file, false)

	setProject(project)
    if ( typeof callback === 'function') callback()
}

export const addFile = (projectName, file, callback ) => {
    const project = getProject(projectName)
	Project.addFileToProject(project, file, false)
	setProject(project)
    
    if ( typeof callback === 'function') callback()
}

export const addFolder = (projectName, folder, callback ) => {
    const project = getProject(projectName)
	Project.addFolderToProject(project, folder, false)
	setProject(project)
    
    if ( typeof callback === 'function') callback()
}

export const getFileID = () => {
    let curID = parseInt(localStorage.getItem("FileID"), 10) || 0
    curID++
    localStorage.setItem("FileID", curID)

    return curID
}

export const deleteNode = ( projectName, path, callback ) => {
    const project = getProject(projectName)
	Project.deleteNode(project, path)
	setProject(project)

    if ( typeof callback === 'function') callback()
}

export const renameNode = (projectName, path, newName, callback) => {
    const project = getProject(projectName)
    Project.renameNode(project, path, newName)

    if ( projectName === project.name ) {
        setProject(project)
    } else {
        renameProject(project, newName)
    }

    if ( typeof callback === 'function') callback()
}

const TEMPLATE_SQL = "-- New Tab\nexec @Statistics 'PROCEDUREDETAIL'"
export const newTab = (content = TEMPLATE_SQL) => ({ id: getFileID(), filepath: "/New Tab", content, newTab: true })

export const getConfig = () => JSON.parse(localStorage.getItem("$config")) || undefined
export const saveConfig = (config, callback) => {
    localStorage.setItem('$config', JSON.stringify(config))
    if ( typeof callback === 'function') callback()
}

export const getVars = () => JSON.parse(localStorage.getItem("$vars")) || []
export const setVars = variables => localStorage.setItem("$vars", JSON.stringify(variables))
export const addVar = variable => {
    const vars = getVars()
    vars.push(variable)
    setVars(vars)
}
export const updateVar = variable => {
    setVars(getVars().map( v => v.id === variable.id ? variable : v ))
}
export const removeVar = variable => setVars(getVars().filter(v => v.id !== variable.id))

const headers = new Headers()
headers.append('Accept','application/json')
headers.append('Content-Type','application/json')

const conf = {
    headers,
    credentials: 'include'
}

const dataOp = method => (url, data) => {
    const callConf = { ...conf, body: JSON.stringify(data), method }

    return fetch(url, callConf).then( r => r.json() ).then( r => {
        return r
    })
}

const post = dataOp('POST')
const get = url => fetch(url, conf).then( r => r.json() )

const prefix = process.env.NODE_ENV ? 'https://10.150.55.146:8084' : ''

const urls = {
    session: prefix + "/session",
    login: prefix + "/connect",
    logout: prefix + "/disconnect",
    query: prefix + "/query",
    storeProcedure: prefix + "/store-procedure",
    schema: o => (prefix+"/schema?object=" + o)
}

export const login = userAuth => post(urls.login, userAuth)
export const logout = () => get(urls.logout)
export const getSession = () => get(urls.session)
export const loadObject = object => get(urls.schema(object))

export const executeQuery = query => post(urls.query, { query })
export const execStoreProcedure = data => post(urls.storeProcedure, data)