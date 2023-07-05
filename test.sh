#!/bin/bash
set +x

echo "sequelize orm v6 test start"

SEQUELIZE6_TIDB_LOG="tidb_sequelize_v6.log"

# start tidb servers
echo "starting tidb-servers, log file: ${SEQUELIZE6_TIDB_LOG}"
${TIDB_SERVER_PATH} -store unistore -path "" -lease 0s > ${SEQUELIZE6_TIDB_LOG} 2>&1 &
SERVER_PID=$!
sleep 5
echo "tidb-server(PID: ${SERVER_PID}) started"

# when exit clean
trap 'kill ${SERVER_PID}' EXIT

echo "loading test data to db ..."
mysql -u root -h 127.0.0.1 -P 4000 < init.sql


# start test
npm i
MYSQL_PORT_3306_TCP_PORT=4000 npm run test-mysql
EXIT_CODE=$?


# handle test results
if [ ${EXIT_CODE} -ne 0 ]
then
	echo "ERROR: sequelize test failed!"
	echo "=========== ERROR EXIT [${EXIT_CODE}]: FULL tidb.log BEGIN ============"
	cat ${SEQUELIZE6_TIDB_LOG}
	echo "=========== ERROR EXIT [${EXIT_CODE}]: FULL tidb.log END =============="
	exit 1
fi