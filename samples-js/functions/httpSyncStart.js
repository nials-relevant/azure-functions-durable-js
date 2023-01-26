const { app } = require("@azure/functions");
const df = require("durable-functions");

const timeout = "timeout";
const retryInterval = "retryInterval";

const clientInput = df.input.durableClient();

app.http("httpSyncStart", {
    methods: ["POST"],
    route: "orchestrators/wait/{orchestratorName}",
    authLevel: "anonymous",
    extraInputs: [clientInput],
    handler: async function (request, context) {
        const client = df.getClient(context, clientInput);
        const body = await request.json();
        const instanceId = await client.startNew(request.params.orchestratorName, undefined, body);

        context.log(`Started orchestration with ID = '${instanceId}'.`);

        const timeoutInMilliseconds = getTimeInMilliseconds(request, timeout) || 30000;
        const retryIntervalInMilliseconds = getTimeInMilliseconds(request, retryInterval) || 1000;

        const response = client.waitForCompletionOrCreateCheckStatusResponse(
            request,
            instanceId,
            timeoutInMilliseconds,
            retryIntervalInMilliseconds
        );
        return response;
    },
});

function getTimeInMilliseconds(req, queryParameterName) {
    // parameters are passed in as seconds
    const queryValue = req.query.get(queryParameterName);
    // return as milliseconds
    return queryValue ? queryValue * 1000 : undefined;
}
