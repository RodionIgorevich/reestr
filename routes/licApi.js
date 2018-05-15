var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var bodyParser = require('body-parser');
var config = require('../config');
var multer  = require('multer');

router.use(bodyParser.urlencoded({extended: true}));
router.use(bodyParser.json());

router.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://justfortest.gq");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Credentials', true);
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
            //console.log(err);
            setTimeout(doConnect, 2000);
        }
    });

    con.on('error', function(err) {
        //console.log('db error', err);
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
    var data = req.body.params;

    console.log(data);

    var query = 'insert into licenses (rf_OrganId, RegNumber, LicenseNumber, DateDecision, LicensePeriod, LicenseEdProgramm, NumberDateOrder, rf_MainOrganId) ' +
        'values ( ? )';
    var values = [
        data.organId,
        data.regNumber,
        data.licenseNumber,
        data.dateDecision,
        data.licensePeriod,
        data.licenseEdProgramm,
        data.numberDateOrder,
        data.nameAuthority
    ];
    var queryDates = 'insert into lic_dates_registry (rf_OrganId, Dates) ' +
        'values ( ? )';
    var dates = [
        data.organId,
        data.dates
    ];

    var queryGetAddress = 'select m.MunicipalityName, o.PostIndex, o.SettlementName, o.Street, o.Building from organizations o, municipalities m ' +
        'where m.MunicipalityId = o.rf_MunicipalityId ' +
        'and o.OrganId = ' + data.organId;
    
    if ( data.organId > 0) {
        con.query(query, [values], function (err, result) {
            console.log(result);

            con.query(queryGetAddress, function (err, result) {
                var getAddress = result[0];
                var settlement = getAddress.SettlementName ? getAddress.SettlementName : '';
                var address = getAddress.PostIndex + ', Белгородская область, ' + getAddress.MunicipalityName +
                    ', ' + settlement + ', ' + getAddress.Street + ', ' + getAddress.Building;
                console.log(address);

                var queryAddress = 'insert into address_lic_activity (rf_OrganId, Address) ' +
                    'values ( ? )';
                var values = [
                    data.organId,
                    address
                ];

                con.query(queryDates, [dates], function (err, result) {
                    console.log(err);
                    console.log(result);
                    con.query(queryAddress, [values], function (err, result) {
                        console.log(err);
                        console.log(result);
                        res.send(result);
                    });
                });
            });
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
            'rf_OrganId = ' + data.organId +
            ', RegNumber = \'' + data.regNumber + '\'' +
            ', LicenseNumber = \'' + data.licenseNumber + '\'' +
            ', DateDecision = STR_TO_DATE(\'' + data.dateDecision + '\', \'%d.%m.%Y\')' +
            ', LicensePeriod = STR_TO_DATE(\'' + data.licensePeriod + '\', \'%d.%m.%Y\')' +
            ', LicenseEdProgramm = \'' + data.licenseEdProgramm + '\'' +
            ', NumberDateOrder = \'' + data.numberDateOrder + '\'' +
            ', rf_MainOrganId = ' + data.nameAuthority +
            ' Where LicenseId = ' + data.id;

         var query2 = 'update lic_dates_registry set ' +
             'Dates = \'' + data.dates + '\'' +
             ' Where rf_OrganId = ' + data.organId;

        console.log(query1);
        con.query(query1, function (err, result) {
            console.log(result);
            console.log(err);
            con.query(query2, function (err, result) {
                console.log(err);
                 res.send(result);
            });
        });
    } else {
        res.send('error');
    }
});

router.post('/delete', function(req, res) {
    var data = req.body.params;

    if (data.id > 0) {
        var query1 = 'delete from licenses where LicenseId  =  ' + data.id;
        var query2 = 'delete from lic_dates_registry where rf_OrganId = ' + data.organId;

        console.log(query1);
        con.query(query1, function (err, result) {
            console.log(result);
            console.log(err);

            con.query(query2, function (err, result) {
                console.log(result);
                console.log(err);
            res.send(result);
            });
        });
    }
});

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

var upload = multer({ storage: storage }).single('file');

router.post('/upload', function(req, res) {
    upload(req,res,function(err){
        console.log(req.file);
        if (err) {
            res.send(err);
        }
        res.json({error_code:0,err_desc:null});
    });
});

module.exports = router;
