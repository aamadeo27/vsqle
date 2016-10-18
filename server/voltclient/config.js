const VoltConfiguration = require('voltjs/lib/configuration')

const addresses = [
	"vdcsis-voltdb1.sis.personal.net.py",
	"vdcsis-voltdb3.sis.personal.net.py",
	"vdcsis-voltdb2.sis.personal.net.py"
]

const createConfiguration = (addr, username, password) => {
	const config = new VoltConfiguration()
	Object.assign(config, {
		host: addr,
		port: 21212,
		username,
		password
	})
	
	return config
}

module.exports = ({username, password}) => addresses.map( addr => createConfiguration(addr, username, password) )