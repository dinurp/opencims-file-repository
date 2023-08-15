# OpenCMIS Fileshare Repository for SAP BTP Cloud Foundry

This is an adaptation of [OpenCMIS Fileshare Repository](https://chemistry.apache.org/java/developing/repositories/dev-repositories-fileshare.html) for 
SAP BTP Cloud Foundry environment. Specifically it adopts 
[SAP BTP Java Security Client Library](https://github.com/SAP/cloud-security-services-integration-library/tree/main-2.x/java-security) 
for user authorization using 
[SAP Java Buildpack](https://github.com/SAP/cloud-security-services-integration-library/blob/main-2.x/samples/sap-java-buildpack-api-usage/README.md). 
A few code changes from the original were necessary for this in addition to packaging for adopting 
[Java EE 8 method for securing Web Applications](https://javaee.github.io/tutorial/security-webtier002.html). 

The sole purpose of this adaptation is to serve as work around for missing
[document management service](https://help.sap.com/docs/build-process-automation/sap-build-process-automation/configure-sap-document-management-service-for-process-attachments) in trial environment 
to enable [File Upload/Attachment](https://help.sap.com/docs/build-process-automation/sap-build-process-automation/form-input-fields) for SAP Build Process Automation. So special handling of encoded `objectID` in requests from Process Automation form is also implemented. 

**Note**: The application runs with ephimeral disk in Cloud Foundry. So anything stored is lost when application restarts. 
Instances do not share disk. So, do not run multiple instances for predictable results you can rely on.  

## Notes for Building
Building requires `mvn` version 3.9. 
The build configuration is adapted from one generated for 
[SAP Cloud SDK for TomEE projects](https://sap.github.io/cloud-sdk/docs/java/getting-started#generating-a-project-from-a-maven-archetype).
Run `mvn package` from command line to build. 
The package for deployment will be built as `application/target/file-repository-application.war`. This can be deployed to Cloud Foundry 
runtime on SAP BTP using [SAP Java Buildpack on tomcat runtime](https://help.sap.com/docs/btp/sap-business-technology-platform/tomcat).

Additionally, mtar pacakge can be built with command `mbt build`. 
This needs installation of [Cloud MTA Build Tools](https://sap.github.io/cloud-mta-build-tool/download/) in addition.

You can download the built mtar package from [releases](../../releases/latest).

## Notes for Deployment
Deployment requires `cf` CLI. 

The mtar package can be deployed with [multiapps](https://github.com/cloudfoundry/multiapps-cli-plugin#download-and-installation) plugin. The mtar file coudl be built locally or dowloaded from [releases](../../releases/latest).
```
cf deploy <path>/opencmis-file-repository_1.0.0.mtar
```
You could also deploy the released file directly with following expermental option:
```
echo "https://github.com/dinurp/opencims-file-repository/releases/download/v1.0.0/opencmis-file-repository_1.0.0.mtar" | cf deploy
```

The package is built for deployment to `SAP Java Buildpack tomcat runtime`. 
The cf deployment [manifest](manifest.yml) is for deploying this package to 
[SapMachine 17 JRE](https://help.sap.com/docs/btp/sap-business-technology-platform/sapmachine#activation-using-jre). 

Two services are bound to the deployed application: 
- xsuaa [plan: application] (**required**) and
- application-logs [plan: lite] (__optional__)

The deployment requires `1G` memory in the space. Deployment fails with less memory than that.
The deployment uses the default `1G` disk quota. The minimum disk space required is `512 MB`. 

The manifest deploys the application with random route. 

### XSUAA service
The bound `xsuaa` service needs to have a scope named `end_user`. This scope needs to be assigned to the business user. Additional scopes reffered in [web.xml](application\src\main\webapp\WEB-INF\web.xml#L34) are: `administrator` (only for testing deployment) and `key_user` (both).

The required service can be created with the following command:
```
cf create-service xsuaa application file-repository-xuaa -c xs-security.json 
```
Then assign the role collection `Business User` to users.

### Application Log service
The service is for pushing logs to `kibana`. Create the service with command:
```
cf create-service application-logs lite app-log-lite
```

### Deployment
Modify deployment descriptor as desired and trigger deployment with command:
```
cf push -f manifest.yml
```
### Verifying deployment
Verification requires [httpyac](https://httpyac.github.io/guide/installation_cli.html). 
Assign the Role Collection `Key User` to yourself.
Follow the following steps:

- Copy [.env-template](.env-template) to `cf.env`
- Populates the properties from `credentials` of a key for XSUAA service as follows:

  |Property|value from `credentials` of XSUAA key|
  |---|---|
  |app_url| This is not the from the key. It is the url of the application|
  |oauth2_clientId| clientid|
  |oauth2_clientSecret| clientsecret|
  |oauth2_url| url|
  |oauth2_xsappname| xsappname|

  Commands to create an inspect XSUAA credentials:
    ```
    cf create-service-key file-repository-xuaa local-1
    cf service-key file-repository-xuaa local-1
    ```

  Command to inspect routes of the app:
    ```
    cf app file-repository
    ```
- Reset the repository with the following command
    ```
    cf restart file-repository
    ```
- Verify with the following command
    ```
    httpyac --bail --all --output none --output-failed none access.http -e cf
    ```
    **Note**: This will open browser for you to authorize the tests. Authorize as user assigned the role collection `Key User`. If you are already logged in, authorization will continue without requiring interaction. 

    Expected output is:
    ```
    [x] status == 401
    [x] status == 200
    [x] status == 200
    [x] status == 401
    [x] status == 200
    [x] status == 200
    [x] status == 201
    [x] status == 200
    [x] status == 201
    [x] status == 200
    [x] status == 201
    [x] status == 201

    12 requests processed (12 succeeded, 0 failed)
    ```

    **Note**: If you run the test again without reseting the repository, the tests with status 201 (created) with fail. 

# License
This adaptation is released under version 2.0 of the Apache License.