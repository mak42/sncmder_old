//module commander and commander-completion für sncmder-cli verwenden
var SnRequest = require("./lib/sn-request");

(async function() {
    var loginDataStr = process.env.sncmder_test;
    var loginData = JSON.parse(loginDataStr);

    var $sn = new SnRequest(loginData.host);
    console.log(await $sn.login());
    console.log(await $sn.JSONv2API("incident").getRecords("active=true"));
    /*console.log(await $sn.evalScript("gs.debug('testing')", "global"));
    console.log(await $sn.glideAjax("HelloWorldAjax", "sayHello"));
    console.log(await $sn.getUpdateSets());
    console.log("BEFORE===============================");
    console.log(await $sn.getApplications());
    console.log("EXEC===============================");
    console.log(await $sn.setApplication("0f6ab99a0f36060094f3c09ce1050ee8"));
    //console.log(await $sn.setApplication("global"));
    console.log("AFTER===============================");
    console.log(await $sn.getApplications());*/

    /*console.log("BEFORE===============================");
    console.log(await $sn.getUpdateSets());
    console.log("EXEC===============================");
    //console.log(await $sn.setUpdateSet("9e31a7b8377c1300dce1c2f954990ea8")); //Test Global Update Set [Global]
    console.log(await $sn.setUpdateSet("1ba5e67fb8530300651775b34d8f511a")); //Default [Global]
    console.log("AFTER===============================");
    console.log(await $sn.getUpdateSets());*/
})();
