var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var bodyParser = require('body-parser');
var config = require('../config');
var Suggestions = require('dadata-suggestions');

var suggestions = new Suggestions('130dd82b52ad8e1936f59a6a263e29e43d73252f');

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
            setTimeout(doConnect, 2000);
        }
    });

    con.on('error', function(err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            doConnect();
        } else {
            throw err;
        }
    });
}

doConnect();
console.log('suggestions');

router.get('/settlement', function (req, res) {
    var region = '';
    var response = [];
    var location = [{ 'region': 'белгородская' }];
    var str = req.query.params[0].toString();
    con.query('select MunicipalityName from municipalities where MunicipalityId = ' + req.query.params[1],
        function (err, result) {
            var resp = result[0]['MunicipalityName'].toString();
            if (resp.search('г. ') != -1) {
                res.send('error');
            } else {
                region = resp.replace(' р-н', '');
                location = [{ 'region': 'белгородская', 'area' : region }];
            }

            var param = {
                'query': str,
                'from_bound': { 'value': 'settlement' },
                'to_bound': { 'value': 'settlement' },
                'locations': location
            };
            suggestions.address(param).then((data) => {
            for (var ind = 0; ind < data['suggestions'].length; ind++) {
                var setl = data['suggestions'][ind]['data'].settlement_type + '. ' +
                    data['suggestions'][ind]['data'].settlement;
                response.push(setl);
            }
            res.send(response);
        }).catch(console.error);
        });
});

router.get('/street', function (req, res) {
    var region = '';
    var settlement = '';
    var response = [];
    var location = [{ 'region': 'белгородская' }];
    var str = req.query.params[0].toString();
    con.query('select MunicipalityName from municipalities where MunicipalityId = ' + req.query.params[1],
        function (err, result) {
            var resp = result[0]['MunicipalityName'].toString();
            if (resp.search('г. ') != -1) {
                region = resp.replace('г. ', '');
                settlement = req.query.params[2].toString();
                settlement = settlement.length > 1 ? settlement.replace(/(.*)\./g, '') : '';
                location = settlement.length > 1 ? [{ 'region': 'белгородская', 'city' : region, 'settlement': settlement}]
                    : [{ 'region': 'белгородская', 'city' : region }];
            } else {
                region = resp.replace(' р-н', '');
                settlement = req.query.params[2].toString();
                settlement = settlement.length > 1 ? settlement.replace(/(.*)\./g, '') : '';
                location = settlement.length > 1 ? [{ 'region': 'белгородская', 'area' : region, 'settlement': settlement}]
                    : [{ 'region': 'белгородская', 'area' : region }];
            }

            var param = {
                'query': str,
                'from_bound': { 'value': 'street' },
                'to_bound': { 'value': 'street' },
                'locations': location
            };
            suggestions.address(param).then((data) => {
            for (var ind = 0; ind < data['suggestions'].length; ind++) {
                var strt = data['suggestions'][ind]['data'].street_type + '. ' +
                    data['suggestions'][ind]['data'].street;
                response.push(strt);
            }
            res.send(response);
        }).catch(console.error);
    });
});

router.get('/building', function (req, res) {
    var region = '';
    var settlement = '';
    var street = '';
    var response = [];
    var location = [{ 'region': 'белгородская' }];
    var str = req.query.params[0].toString();
    con.query('select MunicipalityName from municipalities where MunicipalityId = ' + req.query.params[1],
        function (err, result) {
            var resp = result[0]['MunicipalityName'].toString();
            settlement = req.query.params[2].toString();
            settlement = settlement.length > 1 ? settlement.replace(/(.*)\./g, '') : '';
            street = req.query.params[3].toString();
            street = street.length > 1 ? street.replace(/(.*)\./g, '') : '';

            if (resp.search('г. ') != -1) {
                region = resp.replace('г. ', '');
                location = settlement.length > 1 ?
                    street.length > 1 ? [{ 'region': 'белгородская', 'city' : region, 'settlement': settlement, 'street': street}]
                        : [{ 'region': 'белгородская', 'city' : region, 'settlement': settlement}]
                    : [{ 'region': 'белгородская', 'city' : region }];
            } else {
                region = resp.replace(' р-н', '');
                location = settlement.length > 1 ?
                    street.length > 1 ? [{ 'region': 'белгородская', 'area' : region, 'settlement': settlement, 'street': street}]
                        : [{ 'region': 'белгородская', 'area' : region, 'settlement': settlement}]
                    : [{ 'region': 'белгородская', 'area' : region }];
            }

            var param = {
                'query': str,
                'from_bound': { 'value': 'house' },
                'to_bound': { 'value': 'house' },
                'locations': location
            };
            suggestions.address(param).then((data) => {
            for (var ind = 0; ind < data['suggestions'].length; ind++) {
                var house = data['suggestions'][ind]['data'].house_type + '. ' +
                    data['suggestions'][ind]['data'].house;
                response.push(house);
            }
            res.send(response);
        }).catch(console.error);
        });
});

module.exports = router;