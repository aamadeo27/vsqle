import React from 'react';

export default class extends React.Component {
	constructor(props){
		super(props);

		this.state = {
			download: props.download
		};
	}

	componentWillReceiveProps(props){
		if ( props.download && !this.props.download ){
			this.setState({ download: true });
		}
	}

	componentDidUpdate(){
		if ( this.state.download ) {
			this.refs.link.click();

			this.setState({ download: false });
		}
	}

	render(){
		const { name, content } = this.props;
		let _content = 'Contenido no se puede parsear';

		try {
			_content = window.btoa(content);
		} catch (err) {
			console.error('Error File:' + name);
		}

		const href = 'data:application/octet-stream;base64,' + _content;

		return this.state.download ? <a href={href} download={name} ref="link" aria-hidden>Download</a> : null;
	}
}