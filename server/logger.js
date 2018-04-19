const winston = require("winston")

module.exports = {
    log: new (winston.Logger)({
        transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: 'server.log' })
        ]
    }).info,

    error: new (winston.Logger)({
        transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: 'server.error.log' })
        ]
    }).error,

    audit: new (winston.Logger)({
        transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: 'audit.log' })
        ]
    }).info
}