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
		if ( !this.state.download ) return null;

		const { name, content } = this.props;
		const blob = new Blob([content], {type: 'octet/stream'});
		const url = window.URL.createObjectURL(blob);

		return <a href={url} download={name} ref="link" aria-hidden>Download</a>;
	}
}