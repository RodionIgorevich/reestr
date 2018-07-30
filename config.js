var nconf = require('nconf');

nconf.argv()
    .env()
    .file({ file: './dbconfig.json' });

module.exports = nconf;