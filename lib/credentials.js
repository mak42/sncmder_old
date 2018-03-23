var Credentials = function () {};

Credentials.prototype.getCredentials = function (host) {
    var loginDataStr = process.env.sncmder_test;
    var loginData = JSON.parse(loginDataStr);
    return {
        user: loginData.user,
        pass: loginData.pass
    };
};

module.exports = new Credentials();