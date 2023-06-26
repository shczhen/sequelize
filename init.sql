CREATE DATABASE IF NOT EXISTS `sequelize_test`;

CREATE USER 'sequelize_test'@'%' IDENTIFIED BY 'sequelize_test';
GRANT ALL ON *.* TO 'sequelize_test'@'%' with grant option; FLUSH PRIVILEGES;