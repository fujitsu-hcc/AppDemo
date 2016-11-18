# Tenken Application CSV export tool
This tool get tenken result data from AR processing server and output as a csv file.

## Prepare
- Install JDK/JRE
  - set system variables %JAVA_HOME% 
- Install ant
  - set system path 

## Build 
    > cd csvexport
    > ant 

## Run
    > loadtenkendata.bat <server address> <port> <output path> <start date> [<end date> [<tenken item file> <date output file> [options]]]

### Arguments
- **server address**: FQDN or IP address for AR processing server.
- **port**: port number for AR processing server.
- **output path**:  output directory path.
- **start date**: start date of target tenken result. YYYYMMDD format.
- **end date**: end date of target tenken result.  YYYYMMDD fromat.
- **tenken item file**: file path for tenken item file.
- **date output file**: file path for tenken output file.
- **options** 
  - *scenarioId*: scenario Id of target tenken result. scpecify as "scenarioId=xxxx". 
  - *ssl*: If connect to AR processing server through ssl, please specify this option.
  - *usegivenmap*: If use output item file map, please specify this option and put tenkendatamap.csv to output directory

## License
Apache License 2.0

## Copyright
2014 - 2016 FUJITSU LIMITED
