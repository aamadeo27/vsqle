# Volt SQL Editor

Web based sql editor for VoltDB

## Getting Started

Download or clone the project
```
git clone https://github.com/aamadeo27/vsqle.git
```

### Prerequisites
Node v8 or later

### Installing
```
cd client/
npm install
npm run build
cd ../server/
npm install
```
### config.json
```
{
    "key" : "server.key",
    "cert" : "server.crt",
    ["ca" : "ca.crt",]
    "origin" : "http://10.150.55.146:3000",
    "port" : 8084,
    "voltdbPort" : 21212,
    "loginDelay": 1200
}
```
`"key","cert"[,"ca"]` : The server runs on https so it needs a *server private key*, a *server certificate* and optionally a *ca certificate*.

`"origin"` : It defines a domain to allow CORS

`"port"` : Port of the vsqle server

`"voltdbPort"` : Port of the voltdb server

`"loginDelay"` : It's a delay used to wait for errors in a Login operation to the database.

### Run
```
cd server/
node server.js
```
https://server-name:port/

## Built With
### Back End
* [node](https://nodejs.org/en/docs/)
* [express](https://expressjs.com/)

### Front End
* [react](https://reactjs.org/docs/)
* [redux](https://redux.js.org/)
* [react-bootstrap](https://react-bootstrap.github.io/)
* [react-ace](https://github.com/securingsincity/react-ace)

## Authors

* **Albert Amadeo** - *Initial work* - [aamadeo27](https://github.com/aamadeo27)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
