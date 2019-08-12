export const readFile = ({ name, file }, onLoad, onError) => {
	
	if (file) {
	    const reader = new FileReader()
	    reader.readAsText(file, "UTF-8")
	    
	    reader.onload = evt => {
	    	onLoad(evt.target.result)
	    }
	    
	    reader.onerror = evt => {
				onError(evt)
	    }
	}
}