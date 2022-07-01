import { DataTypes } from '@sequelize/core';
import { expect } from 'chai';
import { dropTestSchemas, getTestDialect, getTestDialectTeaser, sequelize } from '../support';

const dialect = getTestDialect();
const queryInterface = sequelize.getQueryInterface();

describe(getTestDialectTeaser('QueryInterface#changeColumn'), () => {
  beforeEach(async () => {
    await dropTestSchemas(sequelize);
  });

  it('supports schemas', async () => {
    await sequelize.createSchema('archive');
    const table = {
      tableName: 'users',
      schema: 'archive',
    };

    await queryInterface.createTable(table, {
      currency: DataTypes.INTEGER,
    });

    await queryInterface.changeColumn(table, 'currency', {
      type: DataTypes.FLOAT,
    });

    const tableDescription = await queryInterface.describeTable(table);

    expect(tableDescription.currency).to.deep.equal({
      type: dialect === 'postgres' ? 'DOUBLE PRECISION'
          : dialect === 'db2' ? 'DOUBLE'
          : 'FLOAT',
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
    });
  });

  it('should change columns', async () => {
    await queryInterface.createTable('users', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      currency: DataTypes.INTEGER,
    });

    await queryInterface.changeColumn('users', 'currency', {
      type: DataTypes.FLOAT,
    });

    const tableDescription = await queryInterface.describeTable('users');

    expect(tableDescription.currency).to.deep.equal({
      type: dialect === 'postgres' ? 'DOUBLE PRECISION'
        : dialect === 'db2' ? 'DOUBLE'
          : 'FLOAT',
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
    });
  });

  it('supports changing the nullability of a column', async () => {
    await queryInterface.createTable('users', {
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    });

    await queryInterface.changeColumn('users', 'firstName', {
      allowNull: true,
    });

    await queryInterface.changeColumn('users', 'lastName', {
      allowNull: false,
    });

    const tableDescription = await queryInterface.describeTable('users');
    expect(tableDescription).to.deep.equal({
      firstName: {
        type: 'VARCHAR(255)',
        allowNull: true,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null,
      },
      lastName: {
        type: 'VARCHAR(255)',
        allowNull: false,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null,
      },
    });
  });

  it('can change the comment of column', async () => {
    await queryInterface.createTable('users', {
      currency: DataTypes.INTEGER,
    });

    const describedTable = await queryInterface.describeTable('users');

    expect(describedTable.currency.comment).to.be.equal(null);

    await queryInterface.changeColumn('users', 'currency', {
      comment: 'FooBar',
    });

    const describedTable2 = await queryInterface.describeTable('users');
    expect(describedTable2.currency.comment).to.be.equal('FooBar');
  });

  it('can set the defaultValue of a column', async () => {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      status: {
        allowNull: false,
        type: DataTypes.STRING,
      },
    });

    await queryInterface.changeColumn('users', 'status', {
      defaultValue: 'active',
    });

    const table = await queryInterface.describeTable('users');

    expect(table.status).to.deep.equal({
      type: 'VARCHAR(255)',
      allowNull: false,
      defaultValue: 'active',
      primaryKey: false,
      autoIncrement: false,
      comment: null,
    });
  });

  it('can remove the defaultValue of a column', async () => {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      status: {
        allowNull: false,
        type: DataTypes.STRING,
        defaultValue: 'inactive',
      },
    });

    await queryInterface.changeColumn('users', 'status', {
      dropDefaultValue: true,
    });

    const table = await queryInterface.describeTable('users');

    expect(table.status).to.deep.equal({
      type: 'VARCHAR(255)',
      allowNull: false,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
    });
  });

  it('does not change existing properties unless explicitly requested', async () => {
    await queryInterface.createTable('users', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        comment: 'id',
      },
      firstName: {
        type: DataTypes.CHAR(5),
        defaultValue: 'john',
        allowNull: false,
        comment: 'first name',
      },
    });

    await queryInterface.changeColumns('users', {
      id: {
        type: DataTypes.BIGINT,
      },
      firstName: {
        type: DataTypes.CHAR(255),
      },
    });

    const description = await queryInterface.describeTable('users');
    expect(description).to.deep.equal({
      id: {
        type: 'BIGINT(20)',
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        comment: 'id',
        defaultValue: null,
      },
      firstName: {
        type: 'CHAR(255)',
        defaultValue: 'john',
        allowNull: false,
        comment: 'first name',
        autoIncrement: false,
        primaryKey: false,
      },
    });
  });

  // MSSQL doesn't support using a modified column in a check constraint.
  // https://docs.microsoft.com/en-us/sql/t-sql/statements/alter-table-transact-sql
  if (dialect !== 'mssql' && dialect !== 'db2') {
    it('should work with enums (case 1)', async () => {
      await queryInterface.createTable('users', {
        firstName: DataTypes.STRING,
      });

      await queryInterface.changeColumn('users', 'firstName', {
        type: DataTypes.ENUM(['value1', 'value2', 'value3']),
      });

      const table = await queryInterface.describeTable('users');

      if (dialect === 'mysql') {
        expect(table.firstName.type).to.equal(`ENUM('value1','value2','value3')`);
      } else if (dialect === 'postgres') {
        expect(table.firstName.special).to.deep.equal(['value1', 'value2', 'value3']);
      }
    });

    it('should work with enums with schemas', async () => {
      await sequelize.createSchema('archive');

      const tableName = { tableName: 'users', schema: 'archive' };

      await queryInterface.createTable(tableName, {
        firstName: DataTypes.STRING,
      });

      await queryInterface.changeColumn(tableName, 'firstName', {
        type: DataTypes.ENUM(['value1', 'value2', 'value3']),
      });

      const table = await queryInterface.describeTable(tableName);

      if (dialect === 'mysql') {
        expect(table.firstName.type).to.equal(`ENUM('value1','value2','value3')`);
      } else if (dialect === 'postgres') {
        expect(table.firstName.special).to.deep.equal(['value1', 'value2', 'value3']);
      }
    });

    it('can replace an enum with a different enum', async () => {
      await queryInterface.createTable({ tableName: 'users' }, {
        firstName: DataTypes.ENUM(['value1', 'value2', 'value3']),
      }, { logging: true });

      await queryInterface.changeColumn('users', 'firstName', {
        type: DataTypes.ENUM(['value1', 'value3', 'value4', 'value5']),
      });

      const table = await queryInterface.describeTable('users');

      if (dialect === 'mysql') {
        expect(table.firstName.type).to.equal(`ENUM('value1','value3','value4','value5')`);
      } else if (dialect === 'postgres') {
        expect(table.firstName.special).to.deep.eq(['value1', 'value3', 'value4', 'value5']);
      }
    });
  }

  // SQlite natively doesn't support ALTER Foreign key
  if (dialect !== 'sqlite') {
    // !TODO: mysql - add test that uses CHANGE COLUMN (specify type), and one that uses ADD FOREIGN KEY (only specify references)

    describe('should support foreign keys', () => {
      beforeEach(async () => {
        await queryInterface.createTable('users', {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          level_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
        });

        await queryInterface.createTable('level', {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
        });
      });

      it('able to change column to foreign key', async () => {
        const foreignKeys = await queryInterface.getForeignKeyReferencesForTable('users');
        expect(foreignKeys).to.be.an('array');
        expect(foreignKeys).to.be.empty;

        await queryInterface.changeColumn('users', 'level_id', {
          references: {
            model: 'level',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        });

        const newForeignKeys = await queryInterface.getForeignKeyReferencesForTable('users');
        expect(newForeignKeys).to.be.an('array');
        expect(newForeignKeys).to.have.lengthOf(1);
        expect(newForeignKeys[0].columnName).to.be.equal('level_id');
      });

      it('able to change column property without affecting other properties', async () => {
        // 1. look for users table information
        // 2. change column level_id on users to have a Foreign Key
        // 3. look for users table Foreign Keys information
        // 4. change column level_id AGAIN to allow null values
        // 5. look for new foreign keys information
        // 6. look for new table structure information
        // 7. compare foreign keys and tables(before and after the changes)
        const firstTable = await queryInterface.describeTable({
          tableName: 'users',
        });

        await queryInterface.changeColumn('users', 'level_id', {
          references: {
            model: 'level',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        });

        const keys = await queryInterface.getForeignKeyReferencesForTable('users');
        const firstForeignKeys = keys;

        await queryInterface.changeColumn('users', 'level_id', {
          type: DataTypes.INTEGER,
          allowNull: true,
        });

        const newForeignKeys = await queryInterface.getForeignKeyReferencesForTable('users');
        expect(firstForeignKeys.length).to.be.equal(newForeignKeys.length);
        expect(firstForeignKeys[0].columnName).to.be.equal('level_id');
        expect(firstForeignKeys[0].columnName).to.be.equal(newForeignKeys[0].columnName);

        const describedTable = await queryInterface.describeTable({
          tableName: 'users',
        });

        expect(describedTable.level_id).to.have.property('allowNull');
        expect(describedTable.level_id.allowNull).to.not.equal(firstTable.level_id.allowNull);
        expect(describedTable.level_id.allowNull).to.be.equal(true);
      });
    });
  }

  if (dialect === 'sqlite') {
    it('should not remove unique constraints when adding or modifying columns', async () => {
      await queryInterface.createTable({
        tableName: 'Foos',
      }, {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: DataTypes.INTEGER,
        },
        name: {
          allowNull: false,
          unique: true,
          type: DataTypes.STRING,
        },
        email: {
          allowNull: false,
          unique: true,
          type: DataTypes.STRING,
        },
      });

      await queryInterface.addColumn('Foos', 'phone', {
        type: DataTypes.STRING,
        defaultValue: null,
        allowNull: true,
      });

      let table = await queryInterface.describeTable({
        tableName: 'Foos',
      });
      expect(table.phone.allowNull).to.equal(true, '(1) phone column should allow null values');
      expect(table.phone.defaultValue).to.equal(null, '(1) phone column should have a default value of null');
      expect(table.email.unique).to.equal(true, '(1) email column should remain unique');
      expect(table.name.unique).to.equal(true, '(1) name column should remain unique');

      await queryInterface.changeColumn('Foos', 'email', {
        type: DataTypes.STRING,
        allowNull: true,
      });

      table = await queryInterface.describeTable({
        tableName: 'Foos',
      });
      expect(table.email.allowNull).to.equal(true, '(2) email column should allow null values');
      expect(table.email.unique).to.equal(true, '(2) email column should remain unique');
      expect(table.name.unique).to.equal(true, '(2) name column should remain unique');
    });

    it('should add unique constraints to 2 columns and keep allowNull', async () => {
      await queryInterface.createTable({
        tableName: 'Foos',
      }, {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: DataTypes.INTEGER,
        },
        name: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        email: {
          allowNull: true,
          type: DataTypes.STRING,
        },
      });

      await queryInterface.changeColumn('Foos', 'name', {
        type: DataTypes.STRING,
        unique: true,
      });
      await queryInterface.changeColumn('Foos', 'email', {
        type: DataTypes.STRING,
        unique: true,
      });

      const table = await queryInterface.describeTable({
        tableName: 'Foos',
      });
      expect(table.name.allowNull).to.equal(false);
      expect(table.name.unique).to.equal(true);
      expect(table.email.allowNull).to.equal(true);
      expect(table.email.unique).to.equal(true);
    });

    it('should not remove foreign keys when adding or modifying columns', async () => {
      const Task = sequelize.define('Task', { title: DataTypes.STRING });
      const User = sequelize.define('User', { username: DataTypes.STRING });

      User.hasOne(Task);

      await User.sync({ force: true });
      await Task.sync({ force: true });

      await queryInterface.addColumn('Tasks', 'bar', DataTypes.INTEGER);
      let refs = await queryInterface.getForeignKeyReferencesForTable('Tasks');
      expect(refs.length).to.equal(1, 'should keep foreign key after adding column');
      expect(refs[0].columnName).to.equal('UserId');
      expect(refs[0].referencedTableName).to.equal('Users');
      expect(refs[0].referencedColumnName).to.equal('id');

      await queryInterface.changeColumn('Tasks', 'bar', DataTypes.STRING);
      refs = await queryInterface.getForeignKeyReferencesForTable('Tasks');
      expect(refs.length).to.equal(1, 'should keep foreign key after changing column');
      expect(refs[0].columnName).to.equal('UserId');
      expect(refs[0].referencedTableName).to.equal('Users');
      expect(refs[0].referencedColumnName).to.equal('id');

      await queryInterface.renameColumn('Tasks', 'bar', 'foo');
      refs = await queryInterface.getForeignKeyReferencesForTable('Tasks');
      expect(refs.length).to.equal(1, 'should keep foreign key after renaming column');
      expect(refs[0].columnName).to.equal('UserId');
      expect(refs[0].referencedTableName).to.equal('Users');
      expect(refs[0].referencedColumnName).to.equal('id');
    });
  }
});
