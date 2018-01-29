const getNode = ( node, path ) => {
	if ( path.length === 0 ) return node

	const step = path.splice(0,1)[0]
	const index = node.children.findIndex( e => e.name === step )

	if ( path.length === 0 && index >= 0 ){
		return node.children[index]
	} else if ( index >= 0 ){
		return getNode(node.children[index], path)
	}

	return null
}

const replaceFilePath = ( node, oldPathSection, newPathSection ) => {

	const newFilepath = node.filepath.replace(`${oldPathSection}/`, `${newPathSection}/`)
	
	node.filepath = newFilepath

	if ( node.children ) {
		node.children.forEach( child => {
			replaceFilePath(child, oldPathSection, newPathSection)
		})
	}
}

export const _renameNode = ( node, path, newName ) => {

	if ( path.length === 0 ) return

	const step = path.splice(0,1)[0]
	const index = node.children.findIndex( e => e.name === step )

	if ( path.length === 0 && index >= 0 ){
		const target = node.children[index]

        const regex = new RegExp("\\/"+target.name+"$")
		const oldPath = target.filepath
        const newPath = oldPath.replace(regex,`/${newName}`)

		target.name = newName
		target.filepath = newPath
		replaceFilePath(node.children[index], oldPath, newPath )
	} else if ( index >= 0 ){
		_renameNode(node.children[index], path)
	}
}

export const _deleteNode = ( node, path ) => {

	if ( path.length === 0 ) return

	const step = path.splice(0,1)[0]
	const index = node.children.findIndex( e => e.name === step )

	if ( path.length === 0 && index >= 0 ){
		node.children.splice(index,1)
	} else if ( index >= 0 ){
		_deleteNode(node.children[index], path)
	}
}

const setNode = ( node, path, value, noRewrite ) => {
	if ( path.length === 0 ) {
		const idx = node.children.findIndex( f => f.name === value.name )
		
		if ( idx < 0 ){
			console.log("Adding")
			node.children.push(value)
		} else if ( noRewrite ){
			console.log("Node exists")
		} else {
			console.log("Overriding")
			node.children[idx] = value
		}
		return
	}

	const step = path.splice(0,1)[0]
	const index = node.children.findIndex( e => e.name === step )

	if ( index >= 0 ){
		setNode(node.children[index], path, value, noRewrite)
	} else if ( path.length > 0) {
		return false
	}

	return true
}

export const deleteNode = ( project, path, dontMutate ) => {
	path = path.split("/")
	path.splice(0,2)

	console.log("Project.deleteNode", { root: project.root, path })

	if ( dontMutate ){
		project = Object.assign({}, project)
	}

	_deleteNode( project.root, path, dontMutate )

	return project
}

export const renameNode = (project, path, newName, dontMutate) => {
	if ( dontMutate ) project = Object.assign({}, project)

	const steps = path.split("/").splice(1)

    if ( steps.length === 1 ) {
        //path => /ProjectName
        project.activePath = project.activePath.replace(path,"/"+newName)
        project.name = newName
    } else {
        const regex = new RegExp("\\/"+steps[steps.length-1]+"($|\\/)")
        project.activePath = project.activePath.replace(regex,`/${newName}/`).replace(/\/$/,"")

        _renameNode(project.root, steps.splice(1), newName)
    }

	return project
}

export const getFileFromProject = ( project, filepath ) => {
	if ( ! filepath ) return null

	const path = filepath.split("/").splice(1)

	return getNode(project.root, path)
}

export const addFileToProject = ( project, file, dontMutate ) => {
	
	if ( dontMutate ) project = Object.assign({}, project)

	const path = file.filepath.split("/")
	path.splice(0,1)

	const name = path.pop()
	file = Object.assign({}, file, { name })
	delete file.editor

	console.log("AddFileToProject", { dontMutate, path })

	setNode(project.root, path, file, true)

	return project
}

export const addFolderToProject = ( project, folder, dontMutate ) => {
	
	if ( dontMutate ) project = Object.assign({}, project)

	const path = folder.filepath.split("/")
	path.splice(0,1)

	const name = path.pop()
	folder = Object.assign({}, folder, { name })
	
	setNode(project.root, path, folder, true)

	return project
}

export const updateFile = ( project, file, dontMutate ) => {
	
	if ( dontMutate ) project = Object.assign({}, project)

	const path = file.filepath.split("/")
	const name = path.pop()

	path.splice(0,1)
	file = Object.assign({}, file, { name })
	
	setNode(project.root, path, file)

	return project
}