import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Glyphicon } from 'react-bootstrap'

class TreeNode extends Component {
  constructor(props){
    super(props)

    this.state = { expanded : props.expanded }
  }

  getChildContext(){
    const thisPath = (this.context.path || "") + "/"
    return {
      leafHandle: this.props.leafHandle || this.context.leafHandle,
      onFocus:this.props.onFocus || this.context.onFocus,
      selected: this.props.selected || this.context.selected,
      path: thisPath + this.props.name
    }
  }

  onDoubleClick( e ){
    if ( this.props.leaf ){
      const leafHandle = this.props.leafHandle || this.context.leafHandle
      const { path } = this.context

      if ( leafHandle ) leafHandle( (path||"") + "/" + this.props.name )
      else console.log("No leafHandle defined")
    }
  }

  onClick( e ){
    if ( ! this.props.leaf ){
      this.setState({ expanded: ! this.state.expanded })
    }
  }

  render() {
    const { name, leaf } = this.props
    const thisPath = (this.context.path || "") + "/"
    const fullpath = thisPath + this.props.name
    const onFocus = this.props.onFocus || this.context.onFocus

    const handlers = {
      onClick: this.onClick.bind(this),
      onDoubleClick: this.onDoubleClick.bind(this),
      onFocus: () => onFocus(fullpath),
    }

    let icon = null
    if ( leaf ){
      icon = <Glyphicon className="file-node" glyph="file"/>
    } else {
      icon = ( this.state.expanded ? (<Glyphicon className="folder-node" glyph="folder-open"/>) : (<Glyphicon className="folder-node" glyph="folder-close"/>) ) 
    }

    let title = leaf ? "Double click to open" : ""

    const style = { width: (name.length+5) + "vh" }

    return <div className="tree-node">
      <a id={name} href="#node" {...handlers} title={title} style={style}>
        {icon}
        <span className="node-text">{name}</span>
      </a>
      {this.state.expanded ? this.props.children : ""}
    </div>
  }
}

TreeNode.propTypes = {
  depth: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  leaf: PropTypes.bool,
  leafHandle: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  selected: PropTypes.func,
}

TreeNode.childContextTypes = {
  leafHandle: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  selected: PropTypes.func,
  path: PropTypes.string,
}

TreeNode.contextTypes = {
  leafHandle: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  selected: PropTypes.func,
  path: PropTypes.string
}

export default TreeNode