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
  }
}
