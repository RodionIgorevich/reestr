var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var bodyParser = require('body-parser');
var config      = require('../config');

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
        if(err) {
            console.log(err);
            setTimeout(doConnect, 2000);
        }
    });

    con.on('error', function(err) {
        console.log('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') {
            doConnect();
        } else {
            throw err;
        }
    });
}

doConnect();
console.log('licApi');

router.get('/search/count', function(req, res){
    var data = JSON.parse(req.query.data);
    var query = 'select count(*) as res from licenses l, organizations o ' +
        'where l.LicenseId > 0 And o.OrganId = l.rf_OrganId';
    for (const key in data) {
        if (data[key] != null && data[key].toString().trim() !== '') {
            switch (key) {
                case 'district':
                    query += ' And (o.rf_MunicipalityId = ' + data[key][0];
                    if (data[key].length > 1) {
                        for (var index = 1; index < data[key].length; index++) {
                            query += ' Or o.rf_MunicipalityId = ' + data[key][index];
                        }
                    }
                    query += ') ';
                    continue;
                case 'name':
                    const name = data[key].trim();
                    query += ' And (Upper(o.ShortName) Like Upper(\'%'  + name + '%\') OR Upper(o.FullName) Like Upper(\'%'  + name + '%\'))';
                    continue;
                case 'inn':
                    const inn = data[key].trim();
                    query += ' And Upper(o.INN) Like Upper(\'%'  + inn + '%\')';
                    continue;
                case 'ogrn':
                    const ogrn = data[key].trim();
                    query += ' And Upper(o.OGRN) Like Upper(\'%'  + ogrn + '%\')';
                    continue;
                case 'regNumber':
                    const regNumber = data[key].trim();
                    query += ' And Upper(l.RegNumber) Like Upper(\'%'  + regNumber + '%\')';
                    continue;
                case 'licNumber':
                    const licNumber = data[key].trim();
                    query += ' And Upper(l.LicenseNumber) Like Upper(\'%'  + licNumber + '%\')';
                    continue;
            }
        }
    }
    con.query(query, function (err, result) {
        var resp = result[0].res;
        res.send(resp.toString());
    });
});

router.get('/search', function(req, res) {
    var data = JSON.parse(req.query.data);
    var take = req.query.take;
    var skip = req.query.skip;

    var query = 'select l.LicenseId, o.OrganId, o.ShortName, o.SettlementName, m.MunicipalityName, l.RegNumber, l.LicenseNumber ' +
        'from licenses l, organizations o, municipalities m ' +
        'where o.OrganId = l.rf_OrganId And m.MunicipalityId = o.rf_MunicipalityId ';
    for (const key in data) {
        if (data[key] != null && data[key].toString().trim() !== '') {
            switch (key) {
                case 'district':
                    query += ' And (o.rf_MunicipalityId = ' + data[key][0];
                    if (data[key].length > 1) {
                        for (var index = 1; index < data[key].length; index++) {
                            query += ' Or o.rf_MunicipalityId = ' + data[key][index];
                        }
                    }
                    query += ') ';
                    continue;
                case 'inn':
                    const inn = data[key].trim();
                    query += ' And Upper(o.INN) Like Upper(\'%'  + inn + '%\')';
                    continue;
                case 'ogrn':
                    const ogrn = data[key].trim();
                    query += ' And Upper(o.OGRN) Like Upper(\'%'  + ogrn + '%\')';
                    continue;
                case 'name':
                    const name = data[key].trim();
                    query += ' And (Upper(o.ShortName) Like Upper(\'%'  + name + '%\') OR Upper(o.FullName) Like Upper(\'%'  + name + '%\'))';
                    continue;
                case 'regNumber':
                    const regNumber = data[key].trim();
                    query += ' And Upper(l.RegNumber) Like Upper(\'%'  + regNumber + '%\')';
                    continue;
                case 'licNumber':
                    const licNumber = data[key].trim();
                    query += ' And Upper(l.LicenseNumber) Like Upper(\'%'  + licNumber + '%\')';
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

router.get('/info/:number', function(req, res) {
    var query = 'select * from licenses l, organizations o, main_organs mo, address_lic_activity ala, lic_dates_registry ldt ' +
        'Where o.OrganId =\'' + req.params.number + '\' ' +
        'And l.rf_OrganId = o.OrganId ' +
        'And l.rf_MainOrganId = mo.MainOrganId ' +
        'And ala.rf_OrganId = o.OrganId ' +
        'And ldt.rf_OrganId = o.OrganId';
    con.query(query, function (err, result) {
        console.log(query);
        res.send(result);
    });
});

router.post('/add', function(req, res) {
    var resp = '0';
    var data = req.body.params;

    console.log(data);

    var query1 = 'insert into licenses (rf_OrganId, RegNumber, LicenseNumber, DateDecision, LicensePeriod, LicenseEdProgramm, NumberDateOrder, rf_MainOrganId) ' +
        'values ( ? )';
    var values1 = [
        data.organId,
        data.regNumber,
        data.licenseNumber,
        data.dateDecision,
        data.licensePeriod,
        data.licenseEdProgramm,
        data.numberDateOrder,
        data.nameAuthority
    ];
    // var query2 = 'insert into lic_dates_registry (rf_OrganId, Dates) ' +
    //     'values ( ? )';
    // var values2 = [
    //     data.organId,
    //     data.dates
    // ];
    
    if ( data.organId > 0) {
        con.query(query1, [values1], function (err, result) {
            console.log(result);

            // con.query(query2, [values2], function (err, result) {
            //     console.log(err);
                 res.send(result);
            // });
        });
    } else {
        res.send('error');
    }

});

router.post('/update', function(req, res) {
    var data = req.body.params;

    console.log(data);

    if (data.id > 0) {
        var query1 = 'update licenses set ' +
            'rf_OrganId = \'' + data.organId + '\'' +
            ', RegNumber = \'' + data.regNumber + '\'' +
            ', LicenseNumber = \'' + data.licenseNumber + '\'' +
            ', DateDecision = ' + data.dateDecision +
            ', LicensePeriod = \'' + data.licensePeriod + '\'' +
            ', LicenseEdProgramm = \'' + data.licenseEdProgramm + '\'' +
            ', NumberDateOrder = \'' + data.numberDateOrder + '\'' +
            ', rf_MainOrganId = \'' + data.nameAuthority + '\'' +
            ' Where LicenseId = ' + data.id;

         var query2 = 'update lic_dates_registry set ' +
             'rf_OrganId = \'' + data.organId + '\'' +
             ', Dates = \'' + data.dates + '\'' +
             ' Where LicenseId = ' + data.id;

        console.log(query1);
        con.query(query1, function (err, result) {
            console.log(result);
            console.log(err);
            // con.query(query2, [values2], function (err, result) {
            //     console.log(err);
                 res.send(result);
            // });
        });
    } else {
        res.send('error');
    }
});

router.post('/delete', function(req, res) {
    var data = req.body.params;

    console.log(data);

    if (data > 0) {
        var query1 = 'delete from licenses where LicenseId  =  ' + data;
        var query2 = 'delete from lic_dates_registry where rf_LicenseId  =  ' + data;

        console.log(query1);
        con.query(query1, function (err, result) {
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
