var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var bodyParser = require('body-parser');
var config = require('../config');
var jsonfile = require('jsonfile');

router.use(bodyParser.urlencoded({extended: true}));
router.use(bodyParser.json());

router.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

var con;

var db_config = {
    host: config.get('host'),
    user: config.get('user'),
    password: config.get('password'),
    database: config.get('database')
};

function doConnect() {
    con = mysql.createConnection(db_config);
    con.connect(function(err) {
        if (err) {
            //console.log(err);
            setTimeout(doConnect, 2000);
        }
    });

    con.on('error', function(err) {
        //console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            doConnect();
        } else {
            throw err;
        }
    });
}

doConnect();
console.log('api');

router.get('/config', function(req, res) {
    var file = 'config.json';
    jsonfile.readFile(file, function(err, obj) {
        console.dir(obj);
        res.send(obj)
    });
});

router.post('/addConfig', function(req, res) {
    var data = req.body.params;
    var file = 'config.json';
    console.log(data);
    jsonfile.writeFile(file, data, function(err, obj) {
        res.send(data)
    });
});

router.get('/district', function(req, res) {
    con.query('select * from municipalities order by MunicipalityType', function (err, result) {
        if (result) {
            result.unshift({
                MunicipalityId: '',
                MunicipalityName: 'Все',
                MunicipalityType: ''});
            res.send(result);
        } else {
            console.log(err);
            res.send(err);
        }
    });
});

router.get('/districtCount', function(req, res) {
    con.query('select m.MunicipalityId, m.MunicipalityName,' +
        ' count(o.OrganId) as count from organizations o join municipalities m on m.MunicipalityId = o.rf_MunicipalityId group by m.MunicipalityName order by count desc', function (err, result) {
        if (result) {
            res.send(result);
        } else {
            console.log(err);
            res.send(err);
        }
    });
});

router.get('/authority', function(req, res) {
    con.query('select * from main_organs', function (err, result) {
        res.send(result);
    });
});

router.get('/organization', function(req, res) {
    var data = JSON.parse(req.query.data);
    var take = req.query.take;
    var skip = req.query.skip;

    var query = 'select * from organizations o, municipalities m ' +
        'Where o.rf_MunicipalityId = m.MunicipalityId ';

    for (const key in data) {
        if (data[key] != null && data[key].toString().trim() !== '') {
            switch (key) {
                case 'district':
                    const district = data[key];
                    query += ' And o.rf_MunicipalityId = ' + district;
                    continue;
                case 'name':
                    const name = data[key].trim();
                    query += ' And (Upper(o.ShortName) Like Upper(\'%'  + name + '%\') OR Upper(o.FullName) Like Upper(\'%'  + name + '%\'))';
                    continue;
            }
        }
    }

    if (take > 0 || skip > 0) {
        query = query + ' Limit ' + skip + ', ' + take;
    }
    console.log(query);
    con.query(query, function (err, result) {
        res.send(result);
    });
});

router.get('/lic', function(req, res) {
    var data = JSON.parse(req.query.data);
    var take = req.query.take;
    var skip = req.query.skip;

    var query = 'select * from licenses l ' +
        'left join organizations o on l.rf_OrganId = o.OrganId ' +
        'left join lic_dates_registry ldr on l.rf_OrganId = ldr.rf_OrganId ' +
        'left join municipalities m on o.rf_MunicipalityId = m.MunicipalityId ' +
        'left join main_organs mo on l.rf_MainOrganId = mo.MainOrganId ' +
        'Where l.LicenseId > 0 ';

    for (const key in data) {
        if (data[key] != null && data[key].toString().trim() !== '') {
            switch (key) {
                case 'district':
                    const district = data[key];
                    query += ' And o.rf_MunicipalityId = ' + district;
                    continue;
                case 'name':
                    const name = data[key].trim();
                    query += ' And (Upper(o.ShortName) Like Upper(\'%'  + name + '%\') OR Upper(o.FullName) Like Upper(\'%'  + name + '%\'))';
                    continue;
                case 'licNumber':
                    const licNumber = data[key].trim();
                    query += ' And Upper(l.LicenseNumber) Like Upper(\'%'  + licNumber + '%\')';
                    continue;
            }
        }
    }

    query += " ORDER BY l.DateDecision ";
    if (take > 0 || skip > 0) {
        query = query + ' Limit ' + skip + ', ' + take;
    }
    console.log(query);
    con.query(query, function (err, result) {
        res.send(result);
    });
});

router.get('/acc', function(req, res) {
    var data = JSON.parse(req.query.data);
    var take = req.query.take;
    var skip = req.query.skip;

    var query = 'select * from accreditations acc, municipalities m, organizations o, main_organs mo  ' +
        'Where o.rf_MunicipalityId = m.MunicipalityId And o.OrganId = acc.rf_OrganId And acc.rf_MainOrganId = mo.MainOrganId';

    for (const key in data) {
        if (data[key] != null && data[key].toString().trim() !== '') {
            switch (key) {
                case 'district':
                    const district = data[key];
                    query += ' And o.rf_MunicipalityId = ' + district;
                    continue;
                case 'name':
                    const name = data[key].trim();
                    query += ' And (Upper(o.ShortName) Like Upper(\'%'  + name + '%\') OR Upper(o.FullName) Like Upper(\'%'  + name + '%\'))';
                    continue;
                case 'accNumber':
                    const accNumber = data[key].trim();
                    query += ' And Upper(acc.Requisites) Like Upper(\'%'  + accNumber + '%\')';
                    continue;
            }
        }
    }

    query += " ORDER BY acc.DateDecision ";
    if (take > 0 || skip > 0) {
        query = query + ' Limit ' + skip + ', ' + take;
    }
    console.log(query);
    con.query(query, function (err, result) {
        res.send(result);
    });
});

router.get('/users', function(req, res) {
    var name = req.query['login'];
    var pass = req.query['password'];
    if (name || pass) {
        var query = 'select count(*) as res from users where login =\'' + name + '\' and password =\'' + pass + '\'';
        con.query(query, function (err, result) {
            var resp = result[0].res;
            res.send(resp.toString());
        });
    } else {
        var query = 'select id, login, fio from users';
        con.query(query, function (err, result) {
            res.send(result);
        });
    }
});

router.get('/orgName', function(req, res) {
    //var name = JSON.parse(req.query.data);
    console.log(req.query.data);
    //console.log(name);
    var name = req.query.data;
    var query = 'select o.ShortName, o.OrganId from organizations o, municipalities m ' +
        'Where o.rf_MunicipalityId = m.MunicipalityId ' +
        'And (Upper(o.ShortName) Like Upper(\'%'  + name + '%\') OR Upper(o.FullName) Like Upper(\'%'  + name + '%\'))';

    console.log(query);
    con.query(query, function (err, result) {
        res.send(result);
    });
});

router.post('/add', function(req, res) {
    var resp = '0';
    var data = req.body.params;

    console.log(data);

    var sql = 'insert into organizations (FullName, ShortName, PostIndex, rf_MunicipalityId, SettlementName, Street, Building, INN, OGRN) ' +
        'values ( ? )';
    var values = [
        data.fullName,
        data.shortName,
        data.postIndex,
        data.district,
        data.settlement,
        data.street,
        data.building,
        data.inn,
        data.ogrn
    ];
    var query = 'select count(*) as res from organizations where ShortName =\'' +  data.shortName + '\'';
    con.query(query, function (err, result) {
        resp = (result[0].res).toString();

        if (resp == '0')
            con.query(sql, [values], function (err, result) {
                console.log(result);
                console.log(err);
                res.send(result);
            });
    });
});

router.post('/update', function(req, res) {
    var data = req.body.params;

    console.log(data);

    if (data.id > 0) {
        var query = 'update organizations set ' +
            'FullName = \'' + data.fullName + '\'' +
            ', ShortName = \'' + data.shortName + '\'' +
            ', PostIndex = \'' + data.postIndex + '\'' +
            ', rf_MunicipalityId = ' + data.district +
            ', SettlementName = \'' + data.settlement + '\'' +
            ', Street = \'' + data.street + '\'' +
            ', Building = \'' + data.building + '\'' +
            ', INN = \'' + data.inn + '\'' +
            ', OGRN = \'' + data.ogrn + '\'' +
           // ', rf_OrgType = ' + 0 +
            ' Where OrganId = ' + data.id;

        console.log(query);
        con.query(query, function (err, result) {
            console.log(result);
            console.log(err);
            res.send(result);
        });
    }
});

router.post('/delete', function(req, res) {
    var data = req.body.params;

    if (data.id > 0) {
        var query = 'delete from organizations where OrganId =  ' + data.id;
        // var query2 = 'delete from lic_dates_registry where rf_OrganId = ' + data.id;
        console.log(query);
        con.query(query, function (err, result) {
            console.log(result);
            console.log(err);
            // con.query(query2, function (err, result) {
            //     console.log(result);
            //     console.log(err);
                res.send(result);
            // });
        });
    }
});

module.exports = router;