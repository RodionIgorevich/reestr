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
console.log('accApi');


router.get('/search/count', function(req, res){
    var data = JSON.parse(req.query.data);
    var query = 'select count(*) as res from accreditations acc, organizations o ' +
        'where acc.AccId > 0 And o.OrganId = acc.rf_OrganId';
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
                case 'accNumber':
                    const accNumber = data[key].trim();
                    query += ' And Upper(acc.Requisites) Like Upper(\'%'  + accNumber + '%\')';
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

    var query = 'select acc.AccId, o.OrganId, o.ShortName, o.SettlementName, m.MunicipalityName, acc.Requisites ' +
        'from accreditations acc, organizations o, municipalities m ' +
        'where o.OrganId = acc.rf_OrganId And m.MunicipalityId = o.rf_MunicipalityId';

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
                case 'accNumber':
                    const accNumber = data[key].trim();
                    query += ' And Upper(acc.Requisites) Like Upper(\'%'  + accNumber + '%\')';
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

router.post('/add', function(req, res) {
    var resp = '0';
    var data = req.body.params;

    console.log(data);

    var query1 = 'insert into accreditations (rf_OrganId, Requisites, DateDecision, AccEnd, rf_MainOrganId) ' +
        'values ( ? )';
    var values1 = [
        data.organId,
        data.accNumber,
        data.dateDecision,
        data.accEnd,
        data.nameAuthority
    ];

    if ( data.organId > 0) {
        con.query(query1, [values1], function (err, result) {
            console.log(result);
            res.send(result);
        });
    } else {
        res.send('error');
    }

});

router.post('/update', function(req, res) {
    var data = req.body.params;

    console.log(data);

    if (data.id > 0) {
        var query1 = 'update accreditations set ' +
            'rf_OrganId = ' + data.organId +
            ', Requisites = \'' + data.accNumber + '\'' +
            ', DateDecision = STR_TO_DATE(\'' + data.dateDecision + '\', \'%d.%m.%Y\')' +
            ', AccEnd = STR_TO_DATE(\'' + data.accEnd + '\', \'%d.%m.%Y\')' +
            ', rf_MainOrganId = ' + data.nameAuthority +
            ' Where AccId = ' + data.id;

        console.log(query1);
        con.query(query1, function (err, result) {
            console.log(result);
            console.log(err);
            res.send(result);
        });
    } else {
        res.send('error');
    }
});

router.post('/delete', function(req, res) {
    var data = req.body.params;

    console.log(data.id);

    if (data.id > 0) {
        var query1 = 'delete from accreditations where AccId  =  ' + data.id;

        console.log(query1);
        con.query(query1, function (err, result) {
            console.log(result);
            console.log(err);
            res.send(result);
        });
    }
});

router.get('/chart/count', function(req, res) {
    var data = JSON.parse(req.query.data);

    if (data > 0) {
        var resp = {'allAccs': 0, 'activeAccs': 0, 'epicAccs': 0, 'endAccs': 0};

        var allAccsQuery = 'select count(*) as allAccs from accreditations ac ' +
            'left join organizations o on ac.rf_OrganId = o.OrganId ' +
            'left join municipalities m on o.rf_MunicipalityId = m.MunicipalityId ' +
            'Where ac.AccId > 0 ' +
            'And m.MunicipalityId = ' + data;
        var activeAccsQuery = 'select count(*) as activeAccs from accreditations ac ' +
            'left join organizations o on ac.rf_OrganId = o.OrganId ' +
            'left join municipalities m on o.rf_MunicipalityId = m.MunicipalityId ' +
            'Where ac.AccId > 0 ' +
            'And ac.AccEnd > NOW() ' +
            'And m.MunicipalityId = ' + data;
        var epicAccsQuery = 'select  count(*) as epicAccs from accreditations ac ' +
            'left join organizations o on ac.rf_OrganId = o.OrganId ' +
            'left join municipalities m on o.rf_MunicipalityId = m.MunicipalityId ' +
            'Where ac.AccId > 0 ' +
            'And ac.AccEnd > NOW() ' +
            'And ac.AccEnd < NOW() + INTERVAL 1 MONTH ' +
            'And m.MunicipalityId = ' + data;
        var endAccsQuery = 'select count(*) as endAccs from accreditations ac ' +
            'left join organizations o on ac.rf_OrganId = o.OrganId ' +
            'left join municipalities m on o.rf_MunicipalityId = m.MunicipalityId ' +
            'Where ac.AccId > 0 ' +
            'And ac.AccEnd < NOW() ' +
            'And m.MunicipalityId = ' + data;

        console.log(activeAccsQuery);

        con.query(allAccsQuery, function (err, allAccsResult) {
            if (allAccsResult) {
                resp.allAccs = (allAccsResult[0]['allAccs']);
                con.query(activeAccsQuery, function (err, activeAccsResult) {
                    if (activeAccsResult) {
                        resp.activeAccs = (activeAccsResult[0]['activeAccs']);
                        console.log(resp);
                        con.query(epicAccsQuery, function (err, epicAccsResult) {
                            if (epicAccsResult) {
                                resp.epicAccs = (epicAccsResult[0]['epicAccs']);
                                con.query(endAccsQuery, function (err, result) {
                                    if (result) {
                                        resp.endAccs = (result[0]['endAccs']);
                                        console.log(resp);
                                        res.send(resp);
                                    } else {
                                        console.log(err);
                                        res.send('error');
                                    }
                                });
                            } else {
                                console.log(err);
                                res.send('error');
                            }
                        });
                    } else {
                        console.log(err);
                        res.send('error');
                    }
                });
            } else {
                console.log(err);
                res.send('error');
            }
        });
    } else {
        res.send('error');
    }
});

module.exports = router;
