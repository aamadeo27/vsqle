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
    const activePath = (this.props.selected || this.context.selected)() 
    const selected = activePath === fullpath
    const className = selected ? "node-selected" : ""
    const handlers = {
      onClick: this.onClick.bind(this),
      onDoubleClick: this.onDoubleClick.bind(this),
      onFocus: () => onFocus(fullpath),
    }

    const icon = leaf ? "" : ( this.state.expanded ? (<Glyphicon glyph="collapse-down"/>) : (<Glyphicon glyph="expand"/>) )

    return <div className="tree-node">
      <a id={name} className={className} href="#node" {...handlers} >{icon} {name}</a>
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