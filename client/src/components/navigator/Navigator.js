import React, {Component} from 'react';
import { 
	Col, Row,
	ButtonGroup, ButtonToolbar, Button, Glyphicon,
} from 'react-bootstrap';
import { connect } from 'react-redux';

import TreeNode from './TreeNode.js';
import { getFileFromProject } from '../../api/Project.js';
import Download from '../common/Download.js';

import * as actions from '../../Actions.js';
import * as api from '../../api/api.js';
import { readFile } from '../../api/File.js';

const Folder = ({ folder, depth, handlers, expanded }) => ({
	render(){
		const children = this.props.folder.children.map( node => {

			if ( ! node.name ){
				console.error('Nodo no tiene nombre', node);
				return '';
			}

			if ( node.content ) return <TreeNode name={node.name} depth={depth+1} leaf key={node.name}/>;

			return <Folder folder={node} depth={depth+1} key={node.name}/>;
		});

		return <TreeNode name={this.props.folder.name} depth={depth} {...handlers} expanded={expanded}>
			{children}
		</TreeNode>;
	}
});

const Project = ({ project, handlers }) => ({
	render(){
		return <div className="Navigator">
			<Folder folder={this.props.project.root} depth={0} handlers={handlers} expanded={true}/>
		</div>;
	}
});

class Navigator extends Component {
	constructor(props){
		super(props);

		this.state = {
			showNewFolderDialog: false,
			showRenameDialog: false,
			download: false
		};
	}

	shouldComponentUpdate({ project, tabs }){
		if ( this.props.project !== project ) return true;
		if ( this.props.tabs !== tabs ) return true;

		return false;
	}

	upload(e){
		let path = e.target.value;

		if ( path.match(/\\/) ){
			path = path.split('\\').join('/');
		}

		const { updateProject } = this.props;
		const target = {
			name: path.split('\\').pop(),
			file: e.target.files[0]
		};

		const load = content => {
			const newProject = JSON.parse(content);

			api.updateProject(newProject, () => updateProject(newProject));
		};

		readFile(target, load, console.error );
	}

	delete(){
		const { project, deleteNode } = this.props;

		const callback = () => deleteNode( project.activePath );

		console.log('api.deleteNode', project.name, project.activePath);

		api.deleteNode(project.name, project.activePath, callback);
	}

	download(){
		this.setState({ download: true });
	}

	leafHandle( fullpath ){
		const { tabs, project, addTab } = this.props;

		fullpath = fullpath.replace('/'+project.name, '');

		const file = getFileFromProject( project, fullpath );

		if ( tabs.findIndex( t => t.id === file.id ) >= 0 ) {
			console.log('Already open');
			return;
		}

		addTab(file);
	}

	onFocus( fullpath ){
		const { changeActivePath } = this.props;
		changeActivePath(fullpath); 
	}

	selected(){
		return this.props.project.activePath;
	}

	render(){
		const project = this.props.project;
		const projectString = api.getProjectString(project.name);

		const handlers = {
			leafHandle: this.leafHandle.bind(this),
			onFocus: this.onFocus.bind(this),
			selected: this.selected.bind(this)
		};
    
		return <div className="nav-side-bar">
			<Row><Col lgOffset={1} lg={10} xs={12}>
				<ButtonToolbar>
					<ButtonGroup  bsSize="xsmall" >
						<Button title="new folder"  onClick={() => this.props.changeDialog('NewFolder')}>
							<Glyphicon glyph="folder-close"/>
						</Button>
						<Button title="delete" onClick={this.delete.bind(this)}>
							<Glyphicon glyph="trash"/>
						</Button>
						<Button title="rename" onClick={() => this.props.changeDialog('Rename')}>
							<Glyphicon glyph="edit"/>
						</Button>
						<Button title="download project" onClick={this.download.bind(this)}>
							<Glyphicon glyph="cloud-download"/>
						</Button>
						<Button title="upload project" bsSize="xsmall">
							<div className='fileUpload'>
								<Glyphicon glyph="cloud-upload"/>
								<input type='file' id='file' onChange={this.upload.bind(this)}/>
							</div>
						</Button>
					</ButtonGroup>
				</ButtonToolbar>
        
			</Col></Row>
			<Row><hr/></Row>
			<Row><Col xs={12}>
				<Project project={project} handlers={handlers}/>
			</Col></Row>
			<Row><hr/></Row>
			<Download content={projectString} name={project.name+'.json'} download={this.state.download}/> 
		</div>; 
	}
}

const mapStateToProps = ({ project, tabs }) => ({ project, tabs });

const mapDispatchToProps = dispatch => ({
	createFolder: folder => dispatch(actions.createFolder(folder)),
	changeActivePath: path => dispatch(actions.changeActivePath(path)),
	addTab: file => dispatch(actions.addTab(file)),
	deleteNode: node => dispatch(actions.deleteNode(node)),
	renameNode: (path, newName) => dispatch(actions.renameNode(path,newName)),
	updateProject: project => dispatch(actions.updateProject(project)),
	changeDialog: dialog => dispatch(actions.changeDialog(dialog))
});

export default connect(mapStateToProps, mapDispatchToProps)(Navigator);