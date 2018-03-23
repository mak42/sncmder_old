var _ = require("lodash");
var zlib = require('zlib');
var html2plain = require('html2plaintext');
var xml2js = require('xml2js').parseString;
var fs = require('fs-extra');
var Table = require('cli-table');
var eTable = require('easy-table');
var querystring = require('querystring');
var path = require('path');

var cred = require('./credentials');
var FileCookieStore = require("./tough-cookie-store");

function getUserHome() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

var SnRequest = function (host) {
    this.defaultHeader = {
        "Accept": "*/*",
        "Cache-Control": "max-age=0",
        "Connection": "keep-alive",
        "User-Agent": "Mozilla/sncmder",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "en-US,en;q=0.8",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    };
    this.userToken = "";
    this.request = require('request-promise-native');
    this.hostName = host;
    this.uri = "https://" + host + ".service-now.com";
    var cookieDir = path.join(getUserHome(), ".sncmder", "cookies");
    var cookieFile = path.join(cookieDir, host + ".encrypted");
    fs.ensureDirSync(cookieDir);

    this.jar = this.request.jar(new FileCookieStore(cookieFile, {
        encrypt: true,
        password: cred.getCredentials(host).pass
    }));
    this.requestOptions = {
        followAllRedirects: true,
        headers: this.defaultHeader,
        gzip: true,
        jar: this.jar
    };
};

SnRequest.prototype.login = async function () {
    var loginPayload = {
        "user_name": cred.getCredentials(this.hostName).user,
        "user_password": cred.getCredentials(this.hostName).pass,
        "remember_me": "true",
        "sys_action": "sysverb_login"
    };
    var requestOptions = {
        method: "POST",
        form: loginPayload,
        uri: this.uri + '/login.do'
    };
    var response = await this.executeRequest(requestOptions);
    var ck = response.split("var g_ck = '")[1].split('\'')[0];
    this.userToken = ck;

    return this.userToken;
};

SnRequest.prototype.printTable = function () {
    var data = ['First value', 'Second value'];
    var table = new Table();
    table.push(data);
    console.log(table.toString());
    console.log(eTable.print(data))
};

SnRequest.prototype.evalScript = async function (script, scope) {
    var options = {
        'method': 'POST',
        'form': {
            "script": script,
            "sysparm_ck": this.userToken,
            "sys_scope": scope,
            "runscript": "Run script",
            "quota_managed_transaction": "on"
        },
        'uri': this.uri + '/sys.scripts.do'
    };
    var response = await this.executeRequest(options);
    return html2plain(response);
};

SnRequest.prototype.glideAjax = async function (scriptInclude, functionName, params) {
    if (!params) params = {};
    params.sysparm_processor = scriptInclude;
    params.sysparm_name = functionName;
    return this.xmlhttp(scriptInclude, params);
};

SnRequest.prototype.xmlhttp = async function (proc, params) {
    params.sysparm_processor = proc;
    var options = {
        method: "POST",
        form: params,
        uri: this.uri + '/xmlhttp.do'
    };
    var response = await this.executeRequest(options);
    return new Promise(function (resolve, reject) {
        xml2js(response, function (err, parsed) {
            if (err) reject(err);
            else resolve(parsed.xml.$.answer);
        });
    });
};

SnRequest.prototype.getApplications = async function () {
    var options = {
        method: "GET",
        uri: this.uri + '/api/now/ui/concoursepicker/application'
    };
    var headers = {
        "Accept": "application/json"
    };
    var result = await this.executeRequest(options, headers);
    return result;
};

SnRequest.prototype.setApplication = async function (applicationId) {
    var options = {
        method: "PUT",
        body: JSON.stringify({
            app_id: applicationId
        }),
        uri: this.uri + '/api/now/ui/concoursepicker/application'
    };
    var headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-WantSessionNotificationMessages": "true"
    };
    var result = await this.executeRequest(options, headers);
    return result;
};

SnRequest.prototype.getUpdateSets = async function () {
    var options = {
        method: "GET",
        uri: this.uri + '/api/now/ui/concoursepicker/updateset'
    };
    var headers = {
        "Accept": "application/json"
    };
    var result = await this.executeRequest(options, headers);
    return result;
};

SnRequest.prototype.setUpdateSet = async function (updateSetId) {
    var options = {
        method: "PUT",
        body: JSON.stringify({
            sysId: updateSetId
        }),
        uri: this.uri + '/api/now/ui/concoursepicker/updateset'
    };
    var headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-WantSessionNotificationMessages": "true"
    };
    var result = await this.executeRequest(options, headers);
    return result;
};

SnRequest.prototype.JSONv2API = function (table) {
    var self = this;
    var executeRequest = async function (method, params, payload) {
        var requestOptions = {
            json: true,
            uri: self.uri + "/" + table + ".do?JSONv2=&"
        };
        var requestHeaders = {
            'Content-Type': 'application/json',
            'Accepts': 'application/json'
        };
        if (method) requestOptions.method = method;
        if (payload) requestOptions.body = payload;
        if (params) requestOptions.uri += querystring.stringify(params);
        return self.executeRequest(requestOptions, requestHeaders);
    };

    return {
        getKeys: async function (query) {
            if (!query) {
                throw "You must provide a query for getKeys";
            }
            var result = await executeRequest("GET", {
                "sysparm_action": "getKeys",
                "sysparm_query": query
            });
            return result;
        },
        get: async function (sysId) {
            if (!sysId) {
                throw "You must provide a sysId for get";
            }
            var result = await executeRequest("GET", {
                "sysparm_action": "get",
                "sysparm_sys_id": sysId
            });
            return result;
        },
        getRecords: async function (query) {
            if (!query) {
                throw "You must provide a query for getRecords";
            }
            var result = await executeRequest("GET", {
                "sysparm_action": "getRecords",
                "sysparm_query": query
            });
            return result;
        },
        update: async function (record, query) {
            if (!record || !query) {
                throw "You must provide a record and a query for update";
            }
            var result = await executeRequest("POST", {
                "sysparm_action": "update",
                "sysparm_query": query
            }, record);
            return result;
        },
        insert: async function (record) {
            if (!record) {
                throw "You must provide a record for insert";
            }
            var result = await executeRequest("POST", {
                "sysparm_action": "insert"
            }, record);
            return result;
        },
        insertMultiple: async function (recordArray) {
            if (!recordArray) {
                throw "You must provide a recordArray for insertMultiple";
            }
            var result = await executeRequest("POST", {
                "sysparm_action": "insertMultiple"
            }, recordArray);
            return result;
        },
        deleteRecord: async function (sysId) {
            if (!sysId) {
                throw "You must provide a sysId for deleteRecord";
            }
            var result = await executeRequest("POST", {
                "sysparm_action": "deleteRecord"
            }, {
                "sysparm_sys_id": sysId
            });
            return result;
        },
        deleteMultiple: async function (query) {
            if (!query) {
                throw "You must provide a query for deleteMultiple";
            }
            var result = await executeRequest("POST", {
                "sysparm_action": "deleteMultiple",
                "sysparm_query": query
            });
            return result;
        }
    }
};

SnRequest.prototype.executeRequest = async function (options, headers) {
    var requestOptions = _.extend({}, this.requestOptions, options);
    requestOptions.headers = _.extend({}, requestOptions.headers, headers);
    if (this.userToken) {
        requestOptions.headers['X-UserToken'] = this.userToken;
    }
    return this.request(requestOptions);
};

module.exports = SnRequest;