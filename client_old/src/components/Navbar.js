import { Glyphicon, NavItem, Nav, Navbar, NavDropdown, MenuItem } from 'react-bootstrap'
import React, { Component } from 'react'
import logo from '../logo.svg'
import { connect } from 'react-redux'
import * as actions from '../Actions'
import * as api from '../api/api'

class AppNavbar extends Component {
    componentWillMount(){
        api.getSession().then ( session => {
            this.props.updateConnection(session)
        })
    }

    render(){
        const { connection, logoSpeed } = this.props
        const logout = () => {
            api.logout().then( r => {
                this.props.updateConnection({})
            })
        }

        const session = connection.user ? `${connection.user}@${connection.name}` : ""
        const logintItem = connection.user ? (
					<NavItem eventKey={2} href="#" onClick={logout}>
							<span className="login">log out</span>
							<Glyphicon glyph="log-out"/>
					</NavItem>
				) : (
					<NavItem eventKey={3} href="#" onClick={() => this.props.showLoginDialog()}>
							<span className="login">log in</span>
							<Glyphicon glyph="log-in"/>
					</NavItem>
				)
				 
				const sessions = connection.user ? <NavDropdown eventKey={3} title={session} id="basic-nav-dropdown">
					<MenuItem eventKey={3.0}>{session}</MenuItem>
        </NavDropdown> : "";

        const style = {
          animation: `App-logo-spin infinite ${logoSpeed}s linear`
        };

        return (
            <Navbar>
                <Navbar.Header>
                    <Navbar.Brand>
                        <span className="app-brand">vsqle2</span>
                        <a href="#index">
                            <img src={logo} className="App-logo" alt="logo" style={style}/>
                        </a>
                    </Navbar.Brand>
                </Navbar.Header>
                <Nav pullRight>
                    {sessions}
                    {logintItem}
                </Nav>
            </Navbar>
        )
    }
}

const mstp = ({ connection, logoSpeed }) => ({ connection, logoSpeed })
const mdtp = dispatch => ({
    updateConnection: connection => dispatch(actions.updateConnection(connection)),
    showLoginDialog: () => dispatch(actions.changeDialog("Login"))
})
export default connect(mstp, mdtp)(AppNavbar)