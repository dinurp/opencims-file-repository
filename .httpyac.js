module.exports = {
  configureHooks: function (api) {
    api.hooks.responseLogging.addHook('remove sensitive data', function (response) {
      if (response.request) {
        delete response.request.headers['authorization'];
      }
    });
    // https://github.com/AnWeber/httpyac/issues/322#issuecomment-1217096433
    api.hooks.responseLogging.addHook('suppress internal requests', function (response,context) {
      if (!context.httpRegion.response) {
	  return api.getHookCancel();
      }
    });
    api.hooks.onResponse.addHook('expect status', function (response,context) {
	const { httpRegion, scriptConsole } = context;
	const expected = (httpRegion.metaData.expect_status);
	const statusCode = response.statusCode;
	if (!expected) return;

	//https://github.com/AnWeber/httpyac/blob/main/src/utils/testUtils.ts
	if (!httpRegion.testResults) {
	    httpRegion.testResults = [];
	}
	const testResult = (statusCode == expected)
	?{  message: `Got expected status ${expected}`, result: true }
	:{  message: `Expected status ${expected}, got ${statusCode}`, result: false };
	if (! testResult.result ) {
	    testResult.error = { 
		displayMessage : testResult.message,
		error : new Error(testResult.message),
	    }
	}
	httpRegion.testResults.push(testResult);
	scriptConsole?.logTest?.(
	    testResult.result,
	    testResult.result
		? `\u001b[32m✓ ${testResult.message}\u001b[0m`
		: `\u001b[31m✖ ${testResult.message}\u001b[0m`
	);
    });
  }
}
