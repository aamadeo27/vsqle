import * as Project from './Project.js';
import uuid from 'uuid/v1';

export const getProjectString = name => localStorage.getItem(name); 
export const getProject = name => JSON.parse(localStorage.getItem(name));
export const setProject = project => localStorage.setItem(project.name, JSON.stringify(project));
export const setActiveProject = name => localStorage.setItem('$activeProject', name);

export const getActiveProject = () => {
	const name = localStorage.getItem('$activeProject') || 'Project';
	return JSON.parse(localStorage.getItem(name)) || undefined;
};

export const updateProject = (project, callback) => {
	setProject(project);
	setActiveProject(project.name);

	if ( typeof callback === 'function') callback();
};

export const renameProject = (project, newName) => {
	localStorage.removeItem(project.name);
	project.name = newName;
	project.root.name = newName;
	project.activePath = '/' + newName;
	localStorage.setItem(project.name, JSON.stringify(project));
	localStorage.setItem('$activeProject', project.name);
};

export const updateFile = ( projectName, file, callback ) => {
	file = Object.assign({}, file);
	delete file.editor;

	const project = getProject(projectName);
	Project.updateFile(project, file, false);

	setProject(project);
	if ( typeof callback === 'function') callback();
};

export const addFile = (projectName, file, callback ) => {
	const project = getProject(projectName);
	Project.addFileToProject(project, file, false);
	setProject(project);
    
	if ( typeof callback === 'function') callback();
};

export const addFolder = (projectName, folder, callback ) => {
	const project = getProject(projectName);
	Project.addFolderToProject(project, folder, false);
	setProject(project);
    
	if ( typeof callback === 'function') callback();
};

export const getNewID = () => {
	let curID = parseInt(localStorage.getItem('FileID'), 10) || 0;
	curID++;
	localStorage.setItem('FileID', curID);

	return curID;
};

export const getDir = (projectName, path) => {
	const project = getProject(projectName);

	if ( path === '/' ) return path;

	return Project.getDir(project.root, path);
};

export const deleteNode = ( projectName, path, callback ) => {
	const project = getProject(projectName);
	Project.deleteNode(project, path);
  
	setProject(project);

	if ( typeof callback === 'function') callback();
};

export const renameNode = (projectName, path, newName, callback) => {
	const project = getProject(projectName);
	Project.renameNode(project, path, newName);

	if ( projectName === project.name ) {
		setProject(project);
	} else {
		renameProject(project, newName);
	}

	if ( typeof callback === 'function') callback();
};

const TEMPLATE_SQL = '-- New Tab\n';
export const newTab = (content = TEMPLATE_SQL) => ({ id: getNewID(), filepath: '/New Tab', content, newTab: true });
export const exploreTab = (content = TEMPLATE_SQL) => ({ id: getNewID(), content, exploreTab: true });

export const getConfig = () => JSON.parse(localStorage.getItem('$config')) || undefined;
export const saveConfig = (config, callback) => {
	localStorage.setItem('$config', JSON.stringify(config));
	if ( typeof callback === 'function') callback();
};

export const getVars = () => JSON.parse(localStorage.getItem('$vars')) || [];
export const setVars = variables => localStorage.setItem('$vars', JSON.stringify(variables));
export const addVar = variable => {
	const vars = getVars();
	vars.push(variable);
	setVars(vars);
};
export const updateVar = variable => {
	setVars(getVars().map( v => v.id === variable.id ? variable : v ));
};
export const removeVar = variable => setVars(getVars().filter(v => v.id !== variable.id));

let _fetch = fetch;

if ( window.ipcRenderer ){
	console.log('Desktop Front End');

	_fetch = (url, options) => {
		const method = options.method || 'GET';

		console.log({ body: options.body });

		let data = {};
		if ( typeof options.body === 'string' ){
			data = JSON.parse(options.body);
		} else if ( options.body instanceof Uint8Array ){
			data = options.body;
		}

		console.log( { data });

		url = url.replace(/https:\/\/.+:\d.+\//,'');
    
		const query = {};
		const queryIdx = url.indexOf('?');

		if ( queryIdx > 0 ){
			const tmp = url.substring(queryIdx+1).split('&');
			tmp.forEach( e => {
				const q = e.split('=');
				query[q[0]] = q[1];
			});
			url = url.substring(0, queryIdx);
		}

		const id = uuid();
		const channel = `${method}#${url}`;

		window.ipcRenderer.send(channel, { id, data, query });

		console.log({ channel, id, data, query });
		return new Promise( (rs,rj) => window.ipcRenderer.once(id, (event, response) => {
			console.log('Response', response);
			rs(response);
		}));
		//Promise.resolve().then( () => ({ json: () => console.log({ data, method, url }) }) );
	};
} else {
	_fetch = (url,options) => fetch(url,options).then( r => r.json() );
	console.log('Web Front End');
}

const headers = new Headers();
headers.append('Accept','application/json');
headers.append('Content-Type','application/json');

const conf = {
	headers,
	credentials: 'include'
};

const dataOp = method => (url, data) => {
	const callConf = { ...conf, body: JSON.stringify(data), method };

	return _fetch(url, callConf);
};

const post = dataOp('POST');
const get = url => _fetch(url, conf);

const DEBUG_URL = 'https://falcondes-app1:8089';
const prefix = process.env.NODE_ENV === 'development' ? DEBUG_URL : '';

console.log({
	environment: process.env.NODE_ENV,
	prefix
});

const urls = {
	session: prefix + '/session',
	login: prefix + '/connect',
	logout: prefix + '/disconnect',
	query: prefix + '/query',
	storeProcedure: prefix + '/store-procedure',
	loadClasses: prefix + '/load-classes',
	schema: o => (prefix+'/schema?object=' + o)
};

export const login = userAuth => post(urls.login, userAuth);
export const logout = () => get(urls.logout);
export const getSession = () => get(urls.session);
export const loadObject = object => get(urls.schema(object));

export const executeQuery = query => post(urls.query, { query });
export const execStoreProcedure = data => post(urls.storeProcedure, data);

const reader = new FileReader();
export const loadClasses = jar => {
	const callConf = {
		body: jar, 
		method: 'POST',
		credentials: 'include',
		headers: {
			'accept' : 'application/json',
			'content-type' : 'application/octet-stream'
		}
	};
  
	if ( window.ipcRenderer ){
		return new Promise( (rs, rj) => {
			reader.onload = e => {
				callConf.body = Buffer.from(e.target.result);

				rs( _fetch(urls.loadClasses, callConf).catch( console.error ) );
			};

			reader.readAsArrayBuffer(jar);
		});
	}
  
<<<<<<< HEAD
	return _fetch(urls.loadClasses, callConf).catch( console.error );
};

export const executeDDL = async (ddl, handleError, schema ) => {
	console.log('Executing DDL');
	console.log(ddl);

	const response = await executeQuery(ddl)
		.catch(error => ({ error }));

	console.log({ response });

	if ( response.error ) {
		handleError(response.error);
		return response;
	}

	return schema.load( )
		.then( response => {
			if ( !response ){
				handleError({ error: 'No response from back end' });
				return { error: 'No response from back end' };
			}

			schema.update(response);
			return {};
		}).catch ( error => {
			console.log(error);
			handleError(error);

			return { error };
		});
};