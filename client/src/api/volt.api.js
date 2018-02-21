import jquery from 'jquery'
import { CONNECTION_ERROR } from '../Constants'

export default function voltApi(options, procedure, procParams ){
    const { host, user, password, timeout } = options

    const random = Math.round(Math.random() * 10000000000000, 0)
    const callbackName = `volt_api_${random}`
    
    procParams = procParams.map( p => `"${encodeURIComponent(p)}"`).join(",")
    procParams = `[${procParams}]`

	const _params = [
		`Procedure=${procedure}`,
		`Parameters=${procParams}`, 
		`User=${encodeURIComponent(user)}`,
		`Password=${encodeURIComponent(password)}`,
		`jsonp=${callbackName}`,
	]
	
    const url = decodeURI(`http://${host}/api/1.0/?${_params.join("&")}`)

    return new Promise((resolve, reject) => {
        const ajaxOpts = {
            type: 'GET',
            url,
            dataType: 'jsonp',
            jsonpCallback: callbackName,
            success: resolve,
            error: e => reject({ error: CONNECTION_ERROR })
        }

        jquery.ajax(ajaxOpts)
	})
}