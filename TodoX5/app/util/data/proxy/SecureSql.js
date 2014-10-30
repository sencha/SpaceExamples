/**
 * Custom SQL Proxy
 * - uses Ext.space.Sqlite.openDatabase() instead of global openDatabase().
 */
Ext.define('Todo.util.data.proxy.SecureSql', {
    alias: 'proxy.securesql',
    extend: 'Ext.data.proxy.Sql',

    create: function (operation, callback, scope) {
        var me = this;

        operation.setStarted();

        me.getDatabaseObject().then(function (db) {
            var records = operation.getRecords(),
                tableExists = me.getTableExists();

            db.transaction().then(function (transaction) {
                me.insertRecords(records, transaction, function (resultSet, error) {
                    if (error) {
                        operation.setException(error);
                    } else {
                        operation.setResultSet(resultSet);
                        operation.setSuccessful(true);
                    }

                    if (typeof callback === 'function') {
                        callback.call(scope || this, operation);
                    }
                }, this);
                transaction.run();
            });
        });
        
    },

    read: function (operation, callback, scope) {
        var me = this,
            model = me.getModel(),
            idProperty = model.getIdProperty(),
            tableExists = me.getTableExists(),
            params = operation.getParams() || {},
            id = params[idProperty],
            sorters = operation.getSorters(),
            filters = operation.getFilters(),
            page = operation.getPage(),
            start = operation.getStart(),
            limit = operation.getLimit(),
            filtered, i, ln;

        params = Ext.apply(params, {
            page: page,
            start: start,
            limit: limit,
            sorters: sorters,
            filters: filters
        });

        operation.setStarted();

        me.getDatabaseObject().then(function (db) {
            db.transaction().then(function (transaction) {
                me.selectRecords(transaction, id !== undefined ? id : params, function (resultSet, error) {
                    if (operation.process(resultSet, null, null) === false) {
                        me.fireEvent('exception', me, operation);
                    }

                    if (error) {
                        operation.setException(error);
                    }

                    if (filters && filters.length) {
                        filtered = Ext.create('Ext.util.Collection', function (record) {
                            return record.getId();
                        });
                        filtered.setFilterRoot('data');
                        for (i = 0, ln = filters.length; i < ln; i++) {
                            if (filters[i].getProperty() === null) {
                                filtered.addFilter(filters[i]);
                            }
                        }
                        filtered.addAll(operation.getRecords());

                        operation.setRecords(filtered.items.slice());
                        resultSet.setRecords(operation.getRecords());
                        resultSet.setCount(filtered.items.length);
                        resultSet.setTotal(filtered.items.length);
                        operation.setSuccessful(true);
                    }

                    if (typeof callback === 'function') {
                        callback.call(scope || me, operation);
                    }
                });
                transaction.run();
            });
        });
    },

    update: function (operation, callback, scope) {
        var me = this,
            records = operation.getRecords(),
            tableExists = me.getTableExists();

        operation.setStarted();

        me.getDatabaseObject().then(function (db) {
            db.transaction().then(function (transaction) {
                me.updateRecords(transaction, records, function (resultSet, error) {
                    if (error) {
                       operation.setException(error);
                    } else {
                        operation.setResultSet(resultSet);
                        operation.setSuccessful(true);
                    }

                    if (typeof callback === 'function') {
                        callback.call(scope || me, operation);
                    }
                });
                transaction.run();
            });
        });

        
    },

    erase: function (operation, callback, scope) {
        var me = this,
            records = operation.getRecords(),
            tableExists = me.getTableExists();

        operation.setStarted();

        me.getDatabaseObject().then(function (db) {
            db.transaction().then(function (transaction) {
                me.destroyRecords(transaction, records, function (resultSet, error) {
                    if (operation.process(resultSet) === false) {
                        me.fireEvent('exception', me, operation);
                    }

                    if (typeof callback === 'function') {
                        callback.call(scope || me, operation);
                    }
                });
                transaction.run();
            });
        });

    },

    insertRecords: function (records, transaction, callback, scope) {
        var me = this,
            table = me.getTable(),
            columns = me.getColumns(),
            totalRecords = records.length,
            executed = 0,
            tmp = [],
            insertedRecords = [],
            errors = [],
            uniqueIdStrategy = me.getUniqueIdStrategy(),
            i, ln, placeholders, result;

        result = new Ext.data.ResultSet({
            records: insertedRecords,
            success: true
        });

        for (i = 0, ln = columns.length; i < ln; i++) {
            tmp.push('?');
        }
        placeholders = tmp.join(', ');

        Ext.each(records, function (record) {
            var id = record.getId(),
                data = me.getRecordData(record),
                values = me.getColumnValues(columns, data);

            transaction.executeSql(
                'INSERT INTO ' + table + ' (' + columns.join(', ') + ') VALUES (' + placeholders + ')',
                values
            ).then(
                function (resultSet) {
                    executed++;
                    record.setId(uniqueIdStrategy ? id : resultSet.insertId);
                    record.commit();
                    insertedRecords.push(record);

                    if (executed === totalRecords && typeof callback === 'function') {
                        callback.call(scope || me, result, errors.length > 0 ? errors : null);
                    }
                },
                function (error) {
                    executed++;
                    errors.push({
                        clientId: id,
                        error: error
                    });

                    if (executed === totalRecords && typeof callback === 'function') {
                        callback.call(scope || me, result, errors);
                    }
                }
            );
        });
    },

    selectRecords: function (transaction, params, callback, scope) {
        var me = this,
            table = me.getTable(),
            idProperty = me.getModel().getIdProperty(),
            sql = 'SELECT * FROM ' + table,
            tmpSql,// temporal sql, to hold query for all records
            records = [],
            filterStatement = ' WHERE ',
            sortStatement = ' ORDER BY ',
            Model = me.getModel(),
            i, ln, data, result, count, rows, filter, sorter, property, value;

        result = new Ext.data.ResultSet({
            records: records,
            success: true
        });

        if (!Ext.isObject(params)) {
            sql += filterStatement + idProperty + ' = ' + params;
        } else {

            // handle filters
            ln = params.filters && params.filters.length;
            if (ln) {
                for (i = 0; i < ln; i++) {
                    filter = params.filters[i];
                    property = filter.getProperty();
                    value = filter.getValue();
                    if (property !== null) {
                        sql += filterStatement + property + ' ' + (filter.getAnyMatch() ? ('LIKE \'%' + value + '%\'') : ('= \'' + value + '\''));
                        filterStatement = ' AND ';
                    }
                }
            }

            // handle sorters
            ln = params.sorters && params.sorters.length;
            if (ln) {
                for (i = 0; i < ln; i++) {
                    sorter = params.sorters[i];
                    property = sorter.getProperty();
                    if (property !== null) {
                        sql += sortStatement + 'LOWER(' + property + ') ' + sorter.getDirection();
                        sortStatement = ', ';
                    }
                }
            }

            // TODO - Is this needed in ExtJS 5?
            // handle paging
            if (params.page !== undefined) {
                tmpSql = sql;
                sql += ' LIMIT ' + parseInt(params.start, 10) + ', ' + parseInt(params.limit, 10);
            }
        }

        transaction.executeSql(
            sql,
            []
        ).then(
            function (resultSet) {
                var rec;
                rows = resultSet.rows;
                count = rows.rows.length;

                for (i = 0, ln = count; i < ln; i++) {
                    data = rows.item(i);
                    rec = new Model();
                    rec.set(data);
                    rec.setId(data[idProperty]);
                    rec.commit();
                    records.push(rec);
                }

                result.setSuccess(true);
                result.setTotal(count);
                result.setCount(count);

                if (typeof callback === 'function') {
                    callback.call(scope || me, result);
                }
            },
            function (error) {
                result.setSuccess(false);
                result.setTotal(0);
                result.setCount(0);

                if (typeof callback === 'function') {
                    callback.call(scope || me, result, error);
                }
            }
        );

        // TODO - is this needed for ExtJS 5 since it can support extremely large stores?
        // Fix to have proper totals
        transaction.executeSql(
            tmpSql,
            []
        ).then(
            function (resultSet) {
                rows = resultSet.rows;
                count = rows.rows.length;
                result.setTotal(count);

                if (typeof callback === 'function') {
                    callback.call(scope || me, result);
                }
            },
            function (error) {
                result.setSuccess(false);
                result.setTotal(0);
                result.setCount(0);

                if (typeof callback === 'function') {
                    callback.call(scope || me, result, error);
                }
            }
        );
        transaction.run();

    },

    updateRecords: function (transaction, records, callback, scope) {
        var me = this,
            table = me.getTable(),
            columns = me.getColumns(),
            totalRecords = records.length,
            idProperty = me.getModel().getIdProperty(),
            executed = 0,
            updatedRecords = [],
            errors = [],
            i, ln, result;

        result = new Ext.data.ResultSet({
            records: updatedRecords,
            success: true
        });

        Ext.each(records, function (record) {
            var id = record.getId(),
                data = me.getRecordData(record),
                values = me.getColumnValues(columns, data),
                updates = [];

            for (i = 0, ln = columns.length; i < ln; i++) {
                updates.push(columns[i] + ' = ?');
            }

            transaction.executeSql(
                'UPDATE ' + table + ' SET ' + updates.join(', ') + ' WHERE ' + idProperty + ' = ?',
                values.concat(id)
            ).then(
                function (resultSet) {
                    executed++;
                    record.commit();
                    updatedRecords.push(record);

                    if (executed === totalRecords && typeof callback === 'function') {
                        callback.call(scope || me, result, errors.length > 0 ? errors : null);
                    }
                },
                function (error) {
                    executed++;
                    errors.push({
                        clientId: id,
                        error: error
                    });

                    if (executed === totalRecords && typeof callback === 'function') {
                        callback.call(scope || me, result, errors);
                    }
                }
            );
        });
    },

    destroyRecords: function (transaction, records, callback, scope) {
        var me = this,
            table = me.getTable(),
            idProperty = me.getModel().getIdProperty(),
            ids = [],
            values = [],
            destroyedRecords = [],
            i, ln, result, record;

        for (i = 0, ln = records.length; i < ln; i++) {
            ids.push(idProperty + ' = ?');
            values.push(records[i].getId());
        }

        result = new Ext.data.ResultSet({
            records: destroyedRecords,
            success: true
        });

        transaction.executeSql(
            'DELETE FROM ' + table + ' WHERE ' + ids.join(' OR '),
            values
        ).then(
            function (resultSet) {
                for (i = 0, ln = records.length; i < ln; i++) {
                    record = records[i];
                    destroyedRecords.push({
                        id: record.getId()
                    });
                }

                if (typeof callback === 'function') {
                    callback.call(scope || me, result);
                }
            },
            function (error) {
                if (typeof callback === 'function') {
                    callback.call(scope || me, result, error);
                }
            }
        );
    },

    dropTable: function () {
        var me = this,
            table = me.getTable();

        me.getDatabaseObject().then(function (db) {
            db.transaction().then(function (transaction) {
                transaction.executeSql({
                    sqlStatement: 'DROP TABLE ' + table
                });
            });
        });

        me.setTableExists(false);
    },

    
    getDatabaseObject: function () {
        var me = this;

        // Only available in Sencha Space
        if (!Ext.isSpace) {
            Ext.Msg.alert('Not Supported', 'This functionality is only ' +
                'available in Sencha Space! www.Sencha.com');
            return;
        }

        if (me.db) {
            return me.db;
        }

        me.db = new Ext.Promise();

        Ext.onSpaceReady().then(
            function () {
                return Ext.space.Sqlite.openDatabase({
                    name: 'Sencha Database',
                    version: '1.0',// we will do version tracking outside of the sqlite db version system.
                    displayName: "Sencha",
                    estimatedSize: 5 * 1024 * 1024 //we auto extend on the native side, setting the size is vestigial at this point.
                }).then(
                    function (db){
                        return db.transaction().then(function (tx){
                             me.createTable(tx);
                             return tx.run().then(function () {
                                me.db.fulfill(db);
                             });
                        });
                    }
                );
            }
        );
        return me.db;
    }
});