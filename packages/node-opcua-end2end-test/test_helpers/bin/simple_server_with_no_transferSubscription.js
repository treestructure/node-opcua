/* eslint no-process-exit: 0 */
"use strict";

const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const opcua = require("node-opcua");


Error.stackTraceLimit = Infinity;

const argv = require("yargs")
    .wrap(132)
    .string("port")
    .describe("port")
    .alias('p', 'port')
    .argv;

const rootFolder = path.join(__dirname, "../");
const OPCUAServer = opcua.OPCUAServer;
const nodesets = opcua.nodesets;


const port = parseInt(argv.port) || 26555;

const server_options = {
    port,
    nodeset_filename: [
        nodesets.standard,
        path.join(rootFolder, "modeling/my_data_type.xml")
    ]
};
if (!fs.existsSync(server_options.nodeset_filename[0])) {
    throw new Error(" cannot find standard nodeset");
}
if (!fs.existsSync(server_options.nodeset_filename[1])) {
    throw new Error(" cannot find custom nodeset");
}
process.title = "Node OPCUA Server on port : " + server_options.port;

const server = new OPCUAServer(server_options);

console.log("   Server that fails to TransferSubscription");

server.on("post_initialize", function() {

    const addressSpace = server.engine.addressSpace;

    const rootFolder = addressSpace.findNode("RootFolder");

    const namespace = addressSpace.getOwnNamespace();

    const myDevices = namespace.addFolder(rootFolder.objects, { browseName: "MyDevices" });

    const variable0 = namespace.addVariable({
        organizedBy: myDevices,
        browseName: "Counter",
        nodeId: "ns=1;s=MyCounter",
        dataType: "Int32",
        value: new opcua.Variant({ dataType: opcua.DataType.Int32, value: 1000.0 })
    });

    server._on_TransferSubscriptionsRequest = (message /* :Message*/, channel/*: ServerSecureChannelLayer*/) => {
        const response = new opcua.TransferSubscriptionsResponse({
            responseHeader: { serviceResult: opcua.StatusCodes.BadServiceUnsupported }
        });
        return channel.send_response("MSG", response, message);
    }

});

server.start(function(err) {
    if (err) {
        console.log(" Server failed to start ... exiting");
        process.exit(-3);
    }
    const endpointUrl = server.getEndpointUrl();

    console.log(chalk.yellow("  server on port      :"), chalk.cyan(server.endpoints[0].port.toString()));
    console.log(chalk.yellow("  endpointUrl         :"), chalk.cyan(endpointUrl));
    console.log(chalk.yellow("\n  server now waiting for connections. CTRL+C to stop"));
});

process.on('SIGINT', function() {
    // only work on linux apparently
    server.shutdown(1000, function() {
        console.log(chalk.red.bold(" shutting down completed "));
        process.exit(-1);
    });
});
